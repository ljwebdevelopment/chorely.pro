export default function AppLoading() {
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="eyebrow">Loading</p>
          <h1>Syncing household data</h1>
        </div>
      </div>
      <section className="stats-grid" aria-hidden="true">
        <div className="stat"><span>Chores</span><strong>...</strong></div>
        <div className="stat"><span>Approvals</span><strong>...</strong></div>
        <div className="stat"><span>Earnings</span><strong>...</strong></div>
        <div className="stat"><span>Progress</span><strong>...</strong></div>
      </section>
    </div>
  );
}
