import { AlertCircle } from "lucide-react";

// Shared error banner. `variant="dark"` matches the SubmissionPage editor
// palette; the default light variant matches Problems/Profile/History/Auth.
// `tone="warning"` is used for the Judge0-unavailable case specifically, so
// it never looks visually identical to a WA/RE verdict badge.
export default function ErrorMessage({ message, variant = "light", tone = "error" }) {
  if (!message) return null;

  const isDark = variant === "dark";
  const isWarning = tone === "warning";

  const colors = isWarning
    ? { text: "#B45309", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" }
    : isDark
    ? { text: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" }
    : { text: "#B91C1C", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" };

  return (
    <div
      className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-[13.5px]"
      style={{
        color: colors.text,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
