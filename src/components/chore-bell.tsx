import { Bell } from "lucide-react";
import { sendChoreReminderAction } from "@/lib/actions";

export function ChoreBell({ choreId, source }: { choreId: string; source: string }) {
  return (
    <form action={sendChoreReminderAction}>
      <input type="hidden" name="chore_id" value={choreId} />
      <input type="hidden" name="source" value={source} />
      <button className="bell-button" type="submit" title="Send a reminder to the assigned kids" aria-label="Send chore reminder">
        <Bell size={17} aria-hidden="true" />
        <span className="bell-label">Remind</span>
      </button>
    </form>
  );
}
