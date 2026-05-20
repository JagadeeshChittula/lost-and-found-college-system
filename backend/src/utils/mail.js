const nodemailer = require("nodemailer");

const transporter =
  process.env.MAIL_SERVER &&
  nodemailer.createTransport({
    host: process.env.MAIL_SERVER,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_USE_TLS || "true").toLowerCase() === "false",
    auth: process.env.MAIL_USERNAME
      ? {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD
        }
      : undefined
  });

async function sendEmail(to, subject, text) {
  if (!transporter || !to) return;
  try {
    await transporter.sendMail({
      from: process.env.MAIL_DEFAULT_SENDER || "noreply@college.edu",
      to,
      subject,
      text
    });
  } catch (_err) {
    // Mail problems should not stop item recovery flows.
  }
}

module.exports = { sendEmail };
