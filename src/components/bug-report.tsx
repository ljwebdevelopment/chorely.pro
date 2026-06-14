"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, X } from "lucide-react";
import { submitBugReportAction, type BugReportState } from "@/lib/actions";

const initialState: BugReportState = { status: "idle" };

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(submitBugReportAction, initialState);
  const userAgentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userAgentRef.current) {
      userAgentRef.current.value = navigator.userAgent;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" className="bug-report-trigger" onClick={() => setOpen(true)}>
        <Bug size={16} aria-hidden="true" />
        Report a Bug
      </button>
      {open ? (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Report a bug"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h2>Report a Bug</h2>
              <button type="button" className="ghost-button" aria-label="Close" onClick={() => setOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {state.status === "success" ? (
              <p className="notice">{state.message}</p>
            ) : (
              <form className="form-grid" action={formAction}>
                {state.status === "error" ? <p className="error field full">{state.message}</p> : null}
                <input type="hidden" name="page_path" value={pathname || ""} />
                <input type="hidden" name="user_agent" ref={userAgentRef} />
                <div className="field full">
                  <label htmlFor="bug-what-happened">What happened?</label>
                  <textarea id="bug-what-happened" name="what_happened" required maxLength={2000} rows={3} />
                </div>
                <div className="field full">
                  <label htmlFor="bug-what-trying">What were you trying to do?</label>
                  <textarea id="bug-what-trying" name="what_trying_to_do" maxLength={2000} rows={3} />
                </div>
                <div className="field full">
                  <label htmlFor="bug-device-type">Device type</label>
                  <select id="bug-device-type" name="device_type" defaultValue="">
                    <option value="">Select a device...</option>
                    <option value="iPhone">iPhone</option>
                    <option value="Android">Android</option>
                    <option value="iPad">iPad</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="field full">
                  <button className="button" type="submit" disabled={pending}>
                    {pending ? "Sending..." : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
