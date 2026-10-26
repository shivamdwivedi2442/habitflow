/* Engineered by Shivam Coder (https://github.com/shivamdwivedi2442 */
const tls = require("tls");
const net = require("net");

let nodemailerPkg = null;
try {
  nodemailerPkg = require("nodemailer");
} catch {
  nodemailerPkg = null;
}

function buildOtpEmailHtml(name, email, otpCode, purpose = "signup") {
  const actionLabel =
    purpose === "signup" ? "Verify Your New HabitFlow Account" : "Sign In Verification Code";
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#050811;color:#f8fafc;padding:32px;border-radius:16px;max-width:520px;margin:0 auto;border:1px solid #312e81;">
    <h2 style="color:#818cf8;margin:0 0 8px;">⚡ HabitFlow   — ${actionLabel}</h2>
    <p style="color:#cbd5e1;font-size:14px;">Hi <strong>${name || email}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;">Use the 6-digit verification OTP below to complete your ${purpose} on HabitFlow:</p>
    <div style="background:#111827;border:2px solid #6366f1;border-radius:12px;padding:18px;text-align:center;font-size:28px;font-weight:800;letter-spacing:10px;color:#34d399;margin:20px 0;">
      ${otpCode}
    </div>
    <p style="color:#64748b;font-size:12px;">This OTP expires in 10 minutes. Engineered by Shivam Coder (https://github.com/shivamdwivedi2442).</p>
  </div>`;
}

async function sendOtpEmail({ email, name = "", otpCode, purpose = "signup" }) {
  const smtpHost = process.env.SMTP_HOST || "";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";
  const smtpFrom = process.env.SMTP_FROM || '"HabitFlow by Shivam Coder" <no-reply@habitflow.dev>';

  const subject = `[HabitFlow 3D] Your 6-Digit ${purpose === "signup" ? "Signup" : "Login"} OTP: ${otpCode}`;
  const html = buildOtpEmailHtml(name, email, otpCode, purpose);
  const text = `Hi ${name || email},\nYour HabitFlow 6-digit verification OTP is: ${otpCode}\nValid for 10 minutes.\n— Shivam Coder (https://github.com/shivamdwivedi2442)`;

  // Route 1: Nodemailer transport when SMTP credentials are configured
  if (nodemailerPkg && smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailerPkg.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject,
        text,
        html
      });
      return {
        delivered: true,
        provider: "nodemailer-smtp",
        messageId: info.messageId
      };
    } catch (err) {
      return {
        delivered: false,
        provider: "nodemailer-fallback-preview",
        warning: err.message
      };
    }
  }

  // Route 2: Instant Local / Dev Mailer Preview (When SMTP_USER is not set in .env yet)
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `📧 [Nodemailer OTP Dispatch] To: <${email}> | Purpose: ${purpose} | 6-Digit OTP: ${otpCode}`
    );
  }
  return {
    delivered: true,
    provider: smtpHost ? "smtp-configured" : "nodemailer-dev-preview",
    subject
  };
}

module.exports = {
  sendOtpEmail,
  buildOtpEmailHtml
};
