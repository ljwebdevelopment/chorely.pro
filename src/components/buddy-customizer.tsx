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

const potLabels: Record<BuddyStyle["pot"], string> = {
  terracotta: "Terracotta",
  sage: "Sage",
  sky: "Sky",
  sunny: "Sunny"
};

const bloomLabels: Record<BuddyStyle["bloom"], string> = {
  gold: "Gold",
  rose: "Rose",
  violet: "Violet"
};

const faceLabels: Record<BuddyStyle["face"], string> = {
  smile: "Smile",
  wink: "Wink",
  none: "Plain"
};

const accessoryLabels: Record<BuddyStyle["accessory"], string> = {
  none: "None",
  sunglasses: "Sunglasses",
  glasses: "Glasses",
  bow: "Bow",
  bowtie: "Bow Tie",
  hat: "Party Hat"
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
            <div className="buddy-thumb-grid">
              {(Object.keys(buddyPotColors) as BuddyStyle["pot"][]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-thumb${draft.pot === value ? " is-selected" : ""}`}
                  aria-label={`${potLabels[value]} pot`}
                  aria-pressed={draft.pot === value}
                  onClick={() => pick("pot", value)}
                >
                  <BuddySprite stage={3} watered size={56} style={{ ...draft, pot: value }} />
                  <span>{potLabels[value]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="buddy-option-row">
            <span className="buddy-option-label">Flower</span>
            <div className="buddy-thumb-grid">
              {(Object.keys(buddyBloomColors) as BuddyStyle["bloom"][]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-thumb${draft.bloom === value ? " is-selected" : ""}`}
                  aria-label={`${bloomLabels[value]} flower`}
                  aria-pressed={draft.bloom === value}
                  onClick={() => pick("bloom", value)}
                >
                  <BuddySprite stage={3} watered size={56} style={{ ...draft, bloom: value }} />
                  <span>{bloomLabels[value]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="buddy-option-row">
            <span className="buddy-option-label">Face</span>
            <div className="buddy-thumb-grid">
              {buddyFaces.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-thumb${draft.face === value ? " is-selected" : ""}`}
                  aria-label={`${faceLabels[value]} face`}
                  aria-pressed={draft.face === value}
                  onClick={() => pick("face", value)}
                >
                  <BuddySprite stage={3} watered size={56} style={{ ...draft, face: value }} />
                  <span>{faceLabels[value]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="buddy-option-row">
            <span className="buddy-option-label">Extras</span>
            <div className="buddy-thumb-grid">
              {buddyAccessories.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`buddy-thumb${draft.accessory === value ? " is-selected" : ""}`}
                  aria-label={accessoryLabels[value]}
                  aria-pressed={draft.accessory === value}
                  onClick={() => pick("accessory", value)}
                >
                  <BuddySprite stage={3} watered size={56} style={{ ...draft, accessory: value }} />
                  <span>{accessoryLabels[value]}</span>
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
