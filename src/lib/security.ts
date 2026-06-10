import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const iterations = 120000;
const keyLength = 32;
const digest = "sha256";

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(pin, salt, iterations, keyLength, digest).toString("hex");
  return `${iterations}:${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string) {
  const [iterationText, salt, hash] = stored.split(":");
  const storedBuffer = Buffer.from(hash || "", "hex");
  const candidate = pbkdf2Sync(pin, salt || "", Number(iterationText), storedBuffer.length, digest);
  return storedBuffer.length > 0 && timingSafeEqual(storedBuffer, candidate);
}
