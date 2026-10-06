const nodemailer = require("nodemailer");

// Two delivery paths, chosen by configuration:
//
//   RESEND_API_KEY set  -> Resend's HTTP API over port 443
//   otherwise           -> SMTP via nodemailer (MAIL_HOST/MAIL_USER/MAIL_PASS)
//
// The HTTP path exists because most PaaS free tiers (Render, Fly, Heroku) block
// outbound SMTP on ports 25/465/587 to curb spam. Packets are dropped rather
// than refused, so an SMTP send there doesn't fail — it hangs until the
// connection times out. Port 443 is never blocked.
//
// Keeping both means local development can carry on using Gmail SMTP unchanged
// while the deployed instance goes over HTTP.

const TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS) || 16000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

const usingResend = () => Boolean(process.env.RESEND_API_KEY);

// ---------------------------------------------------------------- Resend (HTTP)

const sendViaResend = async (email, title, body) => {
	// Resend only accepts a `from` on a domain you have verified. Until a domain
	// is added, onboarding@resend.dev works but will ONLY deliver to the email
	// address that owns the Resend account.
	const from = process.env.MAIL_FROM || "StudyNotion <onboarding@resend.dev>";

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	let response;
	try {
		response = await fetch(RESEND_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from,
				to: [email],
				subject: title,
				html: body,
			}),
			signal: controller.signal,
		});
	} catch (error) {
		if (error.name === "AbortError") {
			throw new Error(
				`Resend did not respond within ${TIMEOUT_MS}ms. Raise MAIL_TIMEOUT_MS or check outbound HTTPS access.`
			);
		}
		throw new Error(`Could not reach the Resend API: ${error.message}`);
	} finally {
		clearTimeout(timer);
	}

	const payload = await response.json().catch(() => ({}));

	if (!response.ok) {
		const detail = payload?.message || payload?.error || response.statusText;

		if (response.status === 401 || response.status === 403) {
			throw new Error(`Resend rejected RESEND_API_KEY: ${detail}`);
		}
		if (response.status === 422) {
			throw new Error(
				`Resend rejected the sender "${from}": ${detail}. The from-address must be on a domain verified in Resend; without one, use onboarding@resend.dev, which can only deliver to the address that owns the account.`
			);
		}
		if (response.status === 429) {
			throw new Error(`Resend rate limit reached: ${detail}`);
		}
		throw new Error(`Resend returned ${response.status}: ${detail}`);
	}

	// Mirror nodemailer's shape so existing callers that read `.response` or
	// `.messageId` keep working.
	return {
		messageId: payload.id,
		response: `Resend accepted the message (id ${payload.id})`,
		provider: "resend",
	};
};

// ------------------------------------------------------------------ SMTP

// Which ports to attempt, in order. A host may block one submission port and
// leave another open, so when MAIL_PORT is not pinned we try both of Gmail's:
// 465 (implicit TLS) first, then 587 (STARTTLS).
const candidatePorts = () => {
	const pinned = Number(process.env.MAIL_PORT);
	const defaults = [465, 587];
	// A pinned MAIL_PORT is tried first, but the alternate is still attempted
	// afterwards — otherwise pinning a port that the host happens to block
	// would disable the fallback entirely.
	return pinned
		? [pinned, ...defaults.filter((p) => p !== pinned)]
		: defaults;
};

// Per-attempt budget, so trying two ports can't exceed the overall timeout.
const perAttemptTimeout = () =>
	Math.max(4000, Math.floor(TIMEOUT_MS / candidatePorts().length));

const buildTransport = (port) =>
	nodemailer.createTransport({
		host: process.env.MAIL_HOST,
		port,
		// Port 465 is implicit TLS; everything else upgrades via STARTTLS.
		secure: port === 465,
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS,
		},
		// Without these, nodemailer waits ~2 minutes before giving up.
		connectionTimeout: perAttemptTimeout(),
		greetingTimeout: perAttemptTimeout(),
		socketTimeout: perAttemptTimeout(),
	});

const describeSmtpFailure = (error, portsTried) => {
	const host = process.env.MAIL_HOST;
	const port = (portsTried || candidatePorts()).join("/");

	if (!host || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
		return "Mail is not configured: set RESEND_API_KEY, or all of MAIL_HOST, MAIL_USER and MAIL_PASS.";
	}
	if (error.code === "EAUTH") {
		return `SMTP rejected the credentials for ${process.env.MAIL_USER}. For Gmail this must be a 16-character App Password, not the account password.`;
	}
	if (
		error.code === "ETIMEDOUT" ||
		error.code === "ESOCKET" ||
		error.code === "ECONNECTION" ||
		error.code === "ECONNREFUSED"
	) {
		return `Could not open an SMTP connection to ${host}:${port} within ${TIMEOUT_MS}ms. Outbound SMTP is most likely blocked — Render, Fly and Heroku all block ports 25/465/587. Set RESEND_API_KEY to send over HTTPS instead.`;
	}
	return `Sending mail via ${host}:${port} failed: ${error.message}`;
};

// Connection-level failures are worth retrying on another port; an auth
// rejection or a bad recipient is not, so stop immediately on those.
const isPortBlocked = (error) =>
	["ETIMEDOUT", "ESOCKET", "ECONNECTION", "ECONNREFUSED", "EHOSTUNREACH"].includes(
		error.code
	);

const sendViaSmtp = async (email, title, body) => {
	const ports = candidatePorts();
	let lastError;

	for (const port of ports) {
		try {
			// A display name on its own is not a valid From header — it needs an
			// address, which is the authenticated mailbox.
			const info = await buildTransport(port).sendMail({
				from:
					process.env.MAIL_FROM || `"StudyNotion" <${process.env.MAIL_USER}>`,
				to: email,
				subject: title,
				html: body,
			});
			if (ports.length > 1) {
				console.log(`[mailSender] sent over SMTP port ${port}`);
			}
			return info;
		} catch (error) {
			lastError = error;
			if (!isPortBlocked(error)) break;
			console.log(
				`[mailSender] port ${port} unreachable (${error.code}); trying next`
			);
		}
	}

	const explanation = describeSmtpFailure(lastError, ports);
	const wrapped = new Error(explanation);
	wrapped.code = lastError.code;
	wrapped.cause = lastError;
	throw wrapped;
};

// ------------------------------------------------------------------ public API

// --- Original swallowed every error and returned undefined, so callers that
//     read `info.response` crashed with a TypeError and reported a misleading
//     failure. Errors now propagate and each caller decides. ---
const mailSender = async (email, title, body) => {
	if (!email) {
		throw new Error("No recipient address was supplied");
	}

	try {
		return usingResend()
			? await sendViaResend(email, title, body)
			: await sendViaSmtp(email, title, body);
	} catch (error) {
		console.error(
			`[mailSender] ${usingResend() ? "resend" : "smtp"}: ${error.message}`
		);
		throw error;
	}
};

module.exports = mailSender;
