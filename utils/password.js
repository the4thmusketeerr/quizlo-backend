import bcrypt from "bcrypt";

const salt = 10; // salt is used to add randomness to the password. Higher values = more secure but slower. Lower values = less secure but faster.

/**
 * Hashes a plain-text password using bcrypt
 * @param password - The plain-text password to hash
 * @returns A promise that resolves to the hashed password string
 */
export async function hashPassword(password) {
  // bcrypt.hash creates a secure hash by combining the password with a salt
  // The salt is automatically generated and embedded in the returned hash
  return await bcrypt.hash(password, salt);
}

/**
 * Compares a plain-text password with a hashed password
 * @param password - The plain-text password to compare
 * @param hash - The hashed password to compare against
 * @returns A promise that resolves to true if the password matches the hash, false otherwise
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
