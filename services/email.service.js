import { Resend } from "resend";
import "dotenv/config";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResetEmail = async (email, resetURL) => {
  await resend.emails.send({
    from: "Quizlo <onboarding@resend.dev>", // change after verifying domain
    to: email,
    subject: "Reset Your Password",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset.</p>
      <p>Click below to reset your password:</p>
      <a href="${resetURL}">${resetURL}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};
