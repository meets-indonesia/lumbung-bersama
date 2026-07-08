import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2] || process.env.PASSWORD;

if (!password || password.length < 12) {
  console.error("Usage: npm run auth:hash-password -- <password-min-12-chars>");
  process.exit(1);
}

const iterations = 210_000;
const salt = randomBytes(16);
const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256");

console.log(
  ["pbkdf2_sha256", String(iterations), salt.toString("base64url"), derived.toString("base64url")].join(":"),
);
