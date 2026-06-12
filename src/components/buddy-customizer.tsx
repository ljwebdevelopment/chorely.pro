"use client";

import { useState } from "react";
import {
  buddyAccessories,
  buddyBloomColors,
  buddyFaces,
  buddyPotColors,
  normalizeBuddyStyle,
  type BuddyStyle
} from "@/lib/buddy-domain";
import { BuddySprite } from "@/components/chore-buddy";
import { saveBuddyStyleAction } from "@/lib/actions";

const faceLabels: Record<BuddyStyle["face"], string> = {
  smile: "🙂 Smiley",
  wink: "😉 Winking",
  none: "🌱 No face"
};

const accessoryLabels: Record<BuddyStyle["accessory"], string> = {
  none: "None",
  sunglasses: "🕶️ Sunglasses",
  bow: "🎀 Bow",
  bowtie: "🤵 Bow tie"
};

export function BuddyCustomizer({ style, source }: { style?: Partial<BuddyStyle> | null; source: string }) {
  const [draft, setDraft] = useState<BuddyStyle>(() => normalizeBuddyStyle(style));
  const pick = <K extends keyof BuddyStyle>(key: K, value: BuddyStyle[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <details className="buddy-customizer">
      <summary className="secondary-button">🎨 Customize Sprout</summary>
      <form className="buddy-studio" action={saveBuddyStyleAction}>
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="pot" value={draft.pot} />
        <input type="hidden" name="bloom" value={draft.bloom} />
        <input type="hidden" name="face" value={draft.face} />
        <input type="hidden" name="accessory" value={draft.accessory} />

        <div className="buddy-preview">
          <BuddySprite stage={3} watered size={150} style={draft} />
          <p className="meta">This is Sprout&apos;s new look</p>
        </div>

        <div className="buddy-options">
          <div className="buddy-option-row">
            <span className="buddy-option-label">Pot</span>
            <div className="buddy-swatches">
              {(Object.keys(buddyPotColors) as BuddyStyle["pot"][]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-swatch${draft.pot === value ? " is-selected" : ""}`}
                  style={{ background: buddyPotColors[value].pot }}
                  aria-label={`${value} pot`}
                  aria-pressed={draft.pot === value}
                  onClick={() => pick("pot", value)}
                />
              ))}
            </div>
          </div>

          <div className="buddy-option-row">
            <span className="buddy-option-label">Flower</span>
            <div className="buddy-swatches">
              {(Object.keys(buddyBloomColors) as BuddyStyle["bloom"][]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-swatch${draft.bloom === value ? " is-selected" : ""}`}
                  style={{ background: buddyBloomColors[value].bloom }}
                  aria-label={`${value} flower`}
                  aria-pressed={draft.bloom === value}
                  onClick={() => pick("bloom", value)}
                />
              ))}
            </div>
          </div>

          <div className="buddy-option-row">
            <span className="buddy-option-label">Face</span>
            <div className="buddy-choices">
              {buddyFaces.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-choice${draft.face === value ? " is-selected" : ""}`}
                  aria-pressed={draft.face === value}
                  onClick={() => pick("face", value)}
                >
                  {faceLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="buddy-option-row">
            <span className="buddy-option-label">Extras</span>
            <div className="buddy-choices">
              {buddyAccessories.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-choice${draft.accessory === value ? " is-selected" : ""}`}
                  aria-pressed={draft.accessory === value}
                  onClick={() => pick("accessory", value)}
                >
                  {accessoryLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <button className="button" type="submit">
            Save Sprout&apos;s look
          </button>
        </div>
      </form>
    </details>
  );
}
