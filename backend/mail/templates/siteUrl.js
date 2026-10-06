// Base URL used in transactional email links.
//
// --- The templates previously hardcoded the original tutorial author's
//     deployment (studynotion-edtech-project.vercel.app), so every OTP,
//     enrollment, payment and password email pointed recipients — including
//     paying customers clicking "Go to Dashboard" — at a third party's site. ---
const siteUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

module.exports = { siteUrl };
