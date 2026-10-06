const nodemailer = require("nodemailer");

// Three delivery paths, chosen by configuration and tried in this order:
//
//   BREVO_API_KEY set   -> Brevo's HTTP API over port 443
//   RESEND_API_KEY set  -> Resend's HTTP API over port 443
//   otherwise           -> SMTP via nodemailer (MAIL_HOST/MAIL_USER/MAIL_PASS)
//
// The HTTP paths exist because most PaaS free tiers (Render, Fly, Heroku,
// Railway below Pro) block outbound SMTP on ports 25/465/587 to curb spam.
// Packets are dropped rather than refused, so an SMTP send there doesn't fail
// — it hangs until the connection times out. Port 443 is never blocked.
//
// Brevo is tried first because, unlike Resend, it delivers to any recipient
// once a single sender address is verified — no domain required. Resend
// without a verified domain only delivers to the address that owns the
// account, which is fine for testing but not for real signups.
//
// Keeping SMTP means local development can carry on using Gmail unchanged
// while the deployed instance goes over HTTP.

const TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS) || 16000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const usingBrevo = () => Boolean(process.env.BREVO_API_KEY);
const usingResend = () => Boolean(process.env.RESEND_API_KEY);

// ---------------------------------------------------------------- Brevo (HTTP)

const sendViaBrevo = async (email, title, body) => {
	// Brevo requires the `sender` address to be verified (Settings -> Senders
	// & IP -> add + click the confirmation link). Once verified it can send to
	// any recipient — this is the key difference from Resend's sandbox mode.
	const senderEmail = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USER;
	if (!senderEmail) {
		throw new Error(
			"BREVO_API_KEY is set but no sender address is configured. Set MAIL_FROM_ADDRESS to the email you verified in Brevo."
		);
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	let response;
	try {
		response = await fetch(BREVO_ENDPOINT, {
			method: "POST",
			headers: {
				"api-key": process.env.BREVO_API_KEY,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				sender: { email: senderEmail, name: process.env.MAIL_FROM_NAME || "StudyNotion" },
				to: [{ email }],
				subject: title,
				htmlContent: body,
			}),
			signal: controller.signal,
		});
	} catch (error) {
		if (error.name === "AbortError") {
			throw new Error(
				`Brevo did not respond within ${TIMEOUT_MS}ms. Raise MAIL_TIMEOUT_MS or check outbound HTTPS access.`
			);
		}
		throw new Error(`Could not reach the Brevo API: ${error.message}`);
	} finally {
		clearTimeout(timer);
	}

	const payload = await response.json().catch(() => ({}));

	if (!response.ok) {
		const detail = payload?.message || response.statusText;

		if (response.status === 401) {
			throw new Error(`Brevo rejected BREVO_API_KEY: ${detail}`);
		}
		if (response.status === 400 && /sender/i.test(detail)) {
			throw new Error(
				`Brevo rejected the sender "${senderEmail}": ${detail}. Verify this address under Settings -> Senders & IP in Brevo before using it.`
			);
		}
		throw new Error(`Brevo returned ${response.status}: ${detail}`);
	}

	// Mirror nodemailer's shape so existing callers that read `.response` or
	// `.messageId` keep working.
	return {
		messageId: payload.messageId,
		response: `Brevo accepted the message (id ${payload.messageId})`,
		provider: "brevo",
	};
};

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
const activeProvider = () => {
	if (usingBrevo()) return "brevo";
	if (usingResend()) return "resend";
	return "smtp";
};

const mailSender = async (email, title, body) => {
	if (!email) {
		throw new Error("No recipient address was supplied");
	}

	try {
		switch (activeProvider()) {
			case "brevo":
				return await sendViaBrevo(email, title, body);
			case "resend":
				return await sendViaResend(email, title, body);
			default:
				return await sendViaSmtp(email, title, body);
		}
	} catch (error) {
		console.error(`[mailSender] ${activeProvider()}: ${error.message}`);
		throw error;
	}
};

module.exports = mailSender;
