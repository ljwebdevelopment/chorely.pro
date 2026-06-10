import { PwaInstallGuide } from "@/components/pwa-install-guide";

export default function OfflinePage() {
  return (
    <main className="section">
      <div className="container">
        <div className="empty-state stack">
          <h1>Chorely is offline</h1>
          <p className="muted">Reconnect to load live chores, approvals, earnings, and subscription details.</p>
          <PwaInstallGuide />
        </div>
      </div>
    </main>
  );
}
