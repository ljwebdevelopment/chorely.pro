import {
  buddyBloomColors,
  buddyPotColors,
  buddyStage,
  buddyStatusMessage,
  normalizeBuddyStyle,
  type BuddyStage,
  type BuddyStyle
} from "@/lib/buddy-domain";

export function BuddySprite({
  stage,
  watered,
  size = 96,
  style
}: {
  stage: BuddyStage;
  watered: boolean;
  size?: number;
  style?: Partial<BuddyStyle> | null;
}) {
  const resolved = normalizeBuddyStyle(style);
  const pot = buddyPotColors[resolved.pot];
  const bloom = buddyBloomColors[resolved.bloom];

  return (
    <svg
      className="buddy-sprite"
      style={{ width: size, height: size }}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label={`Chore buddy plant, growth stage ${stage} of 4, ${watered ? "watered today" : "needs water"}`}
    >
      {/* pot */}
      <path d="M38 78H82L77 106C76.6 108.3 74.6 110 72.2 110H47.8C45.4 110 43.4 108.3 43 106L38 78Z" fill={pot.pot} />
      <rect x="34" y="72" width="52" height="9" rx="4.5" fill={pot.rim} />
      {/* pot face */}
      {resolved.face !== "none" && resolved.accessory !== "sunglasses" ? (
        <>
          <circle cx="53" cy="91" r="2.4" fill="#4A3A28" />
          {resolved.face === "wink" ? (
            <path d="M64.5 91H69.5" stroke="#4A3A28" strokeWidth="2.4" strokeLinecap="round" />
          ) : (
            <circle cx="67" cy="91" r="2.4" fill="#4A3A28" />
          )}
        </>
      ) : null}
      {resolved.face !== "none" ? (
        <path d="M55 98C57.8 100.6 62.2 100.6 65 98" stroke="#4A3A28" strokeWidth="2.2" strokeLinecap="round" />
      ) : null}
      {/* accessories */}
      {resolved.accessory === "sunglasses" ? (
        <g>
          <path d="M44 86H76" stroke="#3A2F23" strokeWidth="2" strokeLinecap="round" />
          <rect x="46" y="85" width="13" height="9" rx="3.5" fill="#3A2F23" />
          <rect x="61" y="85" width="13" height="9" rx="3.5" fill="#3A2F23" />
          <path d="M48 87.5C49.5 86.5 52 86.3 54 87" stroke="#6B5B47" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M63 87.5C64.5 86.5 67 86.3 69 87" stroke="#6B5B47" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ) : null}
      {resolved.accessory === "bow" ? (
        <g>
          <path d="M42 73L32 67L34.5 77Z" fill="#C97A7A" />
          <path d="M42 73L52 67L49.5 77Z" fill="#C97A7A" />
          <circle cx="42" cy="73" r="3.4" fill="#B56363" />
        </g>
      ) : null}
      {resolved.accessory === "bowtie" ? (
        <g>
          <path d="M60 104L51 99.5V108.5Z" fill="#6F8FA6" />
          <path d="M60 104L69 99.5V108.5Z" fill="#6F8FA6" />
          <rect x="57.4" y="101" width="5.2" height="6" rx="1.6" fill="#5C7A91" />
        </g>
      ) : null}
      {resolved.accessory === "glasses" ? (
        <g>
          <circle cx="53" cy="91" r="5" fill="none" stroke="#3A2F23" strokeWidth="1.6" />
          <circle cx="67" cy="91" r="5" fill="none" stroke="#3A2F23" strokeWidth="1.6" />
          <path d="M58 91H62" stroke="#3A2F23" strokeWidth="1.6" />
          <path d="M48 89C49.5 88 51 87.8 53 88.3" stroke="#6B5B47" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M62 89C63.5 88 67 87.8 69 88.3" stroke="#6B5B47" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ) : null}
      {resolved.accessory === "hat" ? (
        <g>
          <path d="M68 70L78 50L88 70Z" fill="#C97A7A" />
          <rect x="66" y="68" width="24" height="4" rx="2" fill="#B56363" />
          <circle cx="78" cy="48" r="3" fill="#E8B5B5" />
        </g>
      ) : null}
      {/* soil */}
      <ellipse cx="60" cy="76" rx="20" ry="4" fill="#6B5138" />

      {stage === 0 ? <ellipse cx="60" cy="73" rx="5" ry="3.4" fill="#8A6A45" /> : null}

      {stage >= 1 ? (
        <>
          <path d="M60 74V56" stroke="#5F7F52" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 64C54 64 49.5 60 49 54C55 54 59.5 58 60 64Z" fill="#7FA66A" />
          <path d="M60 60C66 60 70.5 56 71 50C65 50 60.5 54 60 60Z" fill="#8FB37A" />
        </>
      ) : null}

      {stage >= 2 ? (
        <>
          <path d="M60 56V40" stroke="#5F7F52" strokeWidth="4" strokeLinecap="round" />
          <path d="M60 50C53 50 48 45.5 47.5 39C54.5 39 59.5 43.5 60 50Z" fill="#7FA66A" />
          <path d="M60 45C67 45 72 40.5 72.5 34C65.5 34 60.5 38.5 60 45Z" fill="#8FB37A" />
        </>
      ) : null}

      {stage >= 3 ? (
        <>
          <path d="M60 40V30" stroke="#5F7F52" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="60" cy="24" r="7" fill={bloom.bloom} />
          <circle cx="60" cy="24" r="3" fill={bloom.center} />
        </>
      ) : null}

      {stage >= 4 ? (
        <>
          <path d="M52 47C48 42 47 35 50 29C55 32 57.5 38 56 44Z" fill="#8FB37A" />
          <circle cx="46" cy="30" r="5" fill={bloom.bloom} />
          <circle cx="46" cy="30" r="2.2" fill={bloom.center} />
          <circle cx="73" cy="38" r="4.4" fill={bloom.bloom} />
          <circle cx="73" cy="38" r="2" fill={bloom.center} />
        </>
      ) : null}

      {watered ? (
        <path d="M94 56C94 51 99 44 99 44C99 44 104 51 104 56C104 58.8 101.8 61 99 61C96.2 61 94 58.8 94 56Z" fill="#6F8FA6" />
      ) : (
        <path
          d="M94 56C94 51 99 44 99 44C99 44 104 51 104 56C104 58.8 101.8 61 99 61C96.2 61 94 58.8 94 56Z"
          stroke="#6F8FA6"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      )}
    </svg>
  );
}

export function BuddyCard({
  weeklyApproved,
  wateredToday,
  title = "Sprout, your chore buddy",
  style
}: {
  weeklyApproved: number;
  wateredToday: boolean;
  title?: string;
  style?: Partial<BuddyStyle> | null;
}) {
  const stage = buddyStage(weeklyApproved);
  return (
    <article className="card buddy-card">
      <BuddySprite stage={stage} watered={wateredToday} style={style} />
      <div>
        <h2>{title}</h2>
        <p className="muted">{buddyStatusMessage({ stage, wateredToday, weeklyApproved })}</p>
        <p className="meta">
          {weeklyApproved} chore{weeklyApproved === 1 ? "" : "s"} approved in the last 7 days
        </p>
      </div>
    </article>
  );
}
