import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";

function pngSize(path: string) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

describe("PWA install assets", () => {
  it("publishes PNG app icons required by mobile install surfaces", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    assert.deepEqual(pngSize("public/icon-192.png"), { width: 192, height: 192 });
    assert.deepEqual(pngSize("public/icon-512.png"), { width: 512, height: 512 });
    assert.deepEqual(pngSize("public/apple-touch-icon.png"), { width: 180, height: 180 });
    assert.ok(statSync("public/favicon.ico").size > 0);

    assert.ok(manifest.icons.some((icon) => icon.src === "/icon-192.png" && icon.sizes === "192x192" && icon.type === "image/png"));
    assert.ok(
      manifest.icons.some(
        (icon) => icon.src === "/icon-512.png" && icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose?.includes("maskable")
      )
    );
  });

  it("keeps the service worker installable without caching live app data", () => {
    const serviceWorker = readFileSync("public/sw.js", "utf8");

    assert.match(serviceWorker, /const CACHE = "chorely-shell-v\d+"/);
    assert.match(serviceWorker, /event\.waitUntil\(caches\.open\(CACHE\)\.then\(\(cache\) => cache\.addAll\(CORE\)\)\)/);
    assert.match(serviceWorker, /event\.waitUntil\(caches\.open\(CACHE\)\.then\(\(cache\) => cache\.put\(event\.request, copy\)\)\)/);
    assert.match(serviceWorker, /event\.request\.mode === "navigate"/);
    assert.match(serviceWorker, /fetch\(event\.request\)\.catch\(\(\) => caches\.match\("\/offline"\)\)/);
    assert.doesNotMatch(serviceWorker, /"\/dashboard"/);
    assert.doesNotMatch(serviceWorker, /"\/account\/billing"/);
    assert.doesNotMatch(serviceWorker, /"\/api\/stripe/);
  });
});
