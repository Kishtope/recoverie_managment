import bcrypt from "bcryptjs";

// Hashes a password with bcrypt (cost 12); the salt is embedded in the result.
export const hashPassword = (password: string) => bcrypt.hash(password, 12);

// Checks a password against a stored bcrypt hash.
export const verifyPassword = (password: string, stored: string) => bcrypt.compare(password, stored);
