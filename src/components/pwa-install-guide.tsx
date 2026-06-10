import { Smartphone, WifiOff } from "lucide-react";

export function PwaInstallGuide() {
  return (
    <div className="stack">
      <p className="muted">
        Chorely works like a regular app once it&apos;s on your phone&apos;s home screen — one tap to open, full screen, no
        browser bars. It takes about 30 seconds and there&apos;s nothing to download from an app store.
      </p>
      <div className="grid">
        <article className="card">
          <Smartphone color="#7FA66A" aria-hidden="true" />
          <h3>iPhone and iPad</h3>
          <ol className="install-steps">
            <li>
              Open <strong>Safari</strong> (the compass icon) and go to <strong>chorely.pro</strong>. This only works in
              Safari, not Chrome.
            </li>
            <li>
              Tap the <strong>Share</strong> button — the square with an arrow pointing up, at the bottom center of the
              screen.
            </li>
            <li>
              Scroll down the list and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> in the top right corner. The Chorely icon now appears on your home screen.
            </li>
          </ol>
        </article>
        <article className="card">
          <Smartphone color="#7FA66A" aria-hidden="true" />
          <h3>Android</h3>
          <ol className="install-steps">
            <li>
              Open <strong>Chrome</strong> and go to <strong>chorely.pro</strong>.
            </li>
            <li>
              Tap the <strong>three dots</strong> in the top right corner of the screen.
            </li>
            <li>
              Tap <strong>Add to Home screen</strong> (on some phones it says <strong>Install app</strong>).
            </li>
            <li>
              Tap <strong>Add</strong> or <strong>Install</strong> to confirm. The Chorely icon now appears on your home
              screen.
            </li>
          </ol>
        </article>
        <article className="card">
          <WifiOff color="#7FA66A" aria-hidden="true" />
          <h3>Good to know</h3>
          <p className="muted">
            Add Chorely to the kids&apos; devices too — they&apos;ll use the Kids&apos; Chore View with their own PINs.
            If you briefly lose internet, Chorely shows a friendly offline page and picks up where you left off once
            you&apos;re back online.
          </p>
        </article>
      </div>
    </div>
  );
}
