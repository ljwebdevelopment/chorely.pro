"use client";

export function SelectAllChildren() {
  return (
    <label className="checkbox-line select-all-line">
      <input
        type="checkbox"
        onChange={(event) => {
          const form = event.currentTarget.closest("form");
          if (!form) return;
          form
            .querySelectorAll<HTMLInputElement>('input[name="child_ids"]')
            .forEach((checkbox) => {
              checkbox.checked = event.currentTarget.checked;
            });
        }}
      />
      <strong>Assign to everyone</strong>
    </label>
  );
}
