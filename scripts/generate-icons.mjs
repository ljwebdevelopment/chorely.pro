import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, pngBuffer]);
}

const fullBleed = await readFile(path.join(publicDir, "app-icon.svg"));
const rounded = await readFile(path.join(publicDir, "favicon.svg"));

await sharp(fullBleed, { density: 512 }).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
await sharp(fullBleed, { density: 512 }).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
await sharp(fullBleed, { density: 512 }).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
const favicon32 = await sharp(rounded, { density: 512 }).resize(32, 32).png().toBuffer();
await writeFile(path.join(publicDir, "favicon.ico"), pngToIco(favicon32, 32));

console.log("Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png, favicon.ico");
