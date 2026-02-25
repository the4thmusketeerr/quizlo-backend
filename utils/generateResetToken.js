import crypto from "crypto";

export function generateResetToken() {
  // Generate a random token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Hash the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
}
