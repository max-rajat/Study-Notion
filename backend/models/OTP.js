const mongoose = require("mongoose");
const mailSender = require("../utils/mailSender");
const emailTemplate = require("../mail/templates/emailVerificationTemplate");
const OTPSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
	},
	otp: {
		type: String,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
		expires: 60 * 5, // The document will be automatically deleted after 5 minutes of its creation time
	},
});

// Define a function to send emails
async function sendVerificationEmail(email, otp) {
	// Create a transporter to send emails

	// Define the email options

	// Send the email
	try {
		const mailResponse = await mailSender(
			email,
			"Verification Email",
			emailTemplate(otp)
		);
		// --- Original: mailResponse.response throws if mailSender returns undefined
		//     (which it does when sending fails), masking the real error. ---
		// console.log("Email sent successfully: ", mailResponse.response);
		if (!mailResponse) {
			throw new Error("Email could not be sent — check MAIL_* credentials");
		}
		console.log("Email sent successfully: ", mailResponse?.response);
	} catch (error) {
		console.log("Error occurred while sending email: ", error);
		throw error;
	}
}

// DEMO_MODE lets the app run where no email provider is reachable — notably
// hosts that block outbound SMTP (Render, Fly, Heroku) when no HTTP email API
// key is configured. The OTP document is still created, so the normal
// verify-then-signup flow is unchanged; only delivery is skipped, and the
// controller hands the code back in the response instead.
//
// This is a demo convenience, NOT a production setting: it means anyone can
// register with an address they do not own, because the code is no longer a
// proof of mailbox access. Leave it unset for a real deployment and configure
// RESEND_API_KEY instead.
const demoMode = () => String(process.env.DEMO_MODE).toLowerCase() === "true";

OTPSchema.pre("save", async function (next) {
	// Only send an email when a new document is created
	if (this.isNew) {
		try {
			await sendVerificationEmail(this.email, this.otp);
		} catch (error) {
			if (!demoMode()) throw error;
			console.warn(
				`[OTP] DEMO_MODE: email delivery failed (${error.message}) — ` +
					`returning the OTP in the API response instead.`
			);
		}
	}
	next();
});

const OTP = mongoose.model("OTP", OTPSchema);

module.exports = OTP;