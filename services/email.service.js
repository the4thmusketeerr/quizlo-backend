import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendResetEmail = async (email, resetURL) => {
  const mailOptions = {
    from: `"Quizlo" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Reset Your Password",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset.</p>
      <p>Click below to reset your password:</p>
      <a href="${resetURL}">${resetURL}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Reset email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error(`Failed to send reset email: ${error.message}`);
  }
};


export const sendNewEmailVerification = async (email, verificationURL) => {
  const mailOptions = {
    from: `"Quizlo" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Verify Your New Email Address – Quizlo",
    html: `
      <h2>Verify Your New Email</h2>
      <p>You requested to change your Quizlo email to this address.</p>
      <p>Click the link below to confirm you own it. The link expires in <strong>15 minutes</strong>.</p>
      <p><a href="${verificationURL}">${verificationURL}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email verification sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email verification send error:", error);
    throw new Error(`Failed to send email verification: ${error.message}`);
  }
};

/**
 * Security notice sent to the OLD email when a change request is initiated.
 */
export const sendEmailChangeNotice = async (oldEmail, newEmail) => {
  const mailOptions = {
    from: `"Quizlo" <${process.env.GMAIL_USER}>`,
    to: oldEmail,
    subject: "Security Notice: Email Change Requested – Quizlo",
    html: `
      <h2>Email Change Requested</h2>
      <p>A request was made to change your Quizlo account email to <strong>${newEmail}</strong>.</p>
      <p>Your current email (<strong>${oldEmail}</strong>) will remain active until the new address is verified.</p>
      <p>If you did not make this request, please secure your account immediately by changing your password.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email change notice sent to old address:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email change notice send error:", error);
    throw new Error(`Failed to send email change notice: ${error.message}`);
  }
};

/**
 * Success confirmation sent to BOTH addresses once the email swap is complete.
 */
export const sendEmailChangeConfirmation = async (email, isNewEmail = true) => {
  const subject = isNewEmail
    ? "Your Quizlo email has been updated"
    : "Your Quizlo email has been changed";

  const body = isNewEmail
    ? `<p>This email address is now the primary email on your Quizlo account.</p>`
    : `<p>Your Quizlo account email has been successfully updated to a new address. This is a final notification to your old address.</p>`;

  const mailOptions = {
    from: `"Quizlo" <${process.env.GMAIL_USER}>`,
    to: email,
    subject,
    html: `
      <h2>Email Change Successful</h2>
      ${body}
      <p>If you did not authorise this change, please contact support immediately.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email change confirmation sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Email change confirmation send error:", error);
    throw new Error(`Failed to send email change confirmation: ${error.message}`);
  }
};
