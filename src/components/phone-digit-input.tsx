"use client";

import { useRef, useState } from "react";

const GROUPS = [3, 3, 4];
const DIGIT_COUNT = GROUPS.reduce((total, size) => total + size, 0);

export function PhoneDigitInput({ name = "phone" }: { name?: string }) {
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function setDigitAt(index: number, value: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigitAt(index, digit);
    if (digit && index < DIGIT_COUNT - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    let pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    if (pasted.length === DIGIT_COUNT + 1 && pasted.startsWith("1")) {
      pasted = pasted.slice(1);
    }
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < pasted.length && index + i < DIGIT_COUNT; i++) {
        next[index + i] = pasted[i];
      }
      return next;
    });
    const lastIndex = Math.min(index + pasted.length, DIGIT_COUNT) - 1;
    inputsRef.current[lastIndex]?.focus();
  }

  const groupStarts = GROUPS.reduce<number[]>((starts, groupSize, index) => {
    starts.push(index === 0 ? 0 : starts[index - 1] + GROUPS[index - 1]);
    return starts;
  }, []);

  return (
    <div className="digit-input-group">
      <input type="hidden" name={name} value={digits.join("")} />
      {GROUPS.map((groupSize, groupIndex) => {
        const startIndex = groupStarts[groupIndex];
        return (
          <div className="digit-input-section" key={groupIndex}>
            {digits.slice(startIndex, startIndex + groupSize).map((digit, offset) => {
              const index = startIndex + offset;
              return (
                <input
                  key={index}
                  id={index === 0 ? `${name}-digit-1` : undefined}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="digit-box"
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => handlePaste(index, event)}
                  aria-label={`Phone number digit ${index + 1}`}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
