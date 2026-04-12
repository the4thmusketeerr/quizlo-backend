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
    subject: "Verify Your Email",
    html: `
      <h2>Email Verification</h2>
      <p>You requested to change your email.</p>
      <p>Click below to verify your new email:</p>
      <a href="${verificationURL}">${verificationURL}</a>
      <p>This link expires in 15 minutes.</p>
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
