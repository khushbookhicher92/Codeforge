// Shared loading indicator. Two visual variants so it reads correctly on
// both the light (#FFE6C8 / #6A0D45) pages and the dark editor (#1E1626 /
// #D9C9E8) without callers needing to know the palette themselves.
export default function LoadingSpinner({ label = "Loading...", variant = "light", size = "md" }) {
  const isDark = variant === "dark";
  const dimension = size === "sm" ? 16 : size === "lg" ? 32 : 22;

  const spinnerStyle = {
    width: dimension,
    height: dimension,
    borderWidth: size === "sm" ? 2 : 3,
    borderStyle: "solid",
    borderColor: isDark ? "rgba(217,201,232,0.3)" : "rgba(127,38,92,0.2)",
    borderTopColor: isDark ? "#D9C9E8" : "#7F265C",
    borderRadius: "9999px",
  };

  return (
    <div
      className="flex items-center justify-center gap-2.5 py-4"
      style={{ color: isDark ? "#D9C9E8" : "#7A6A62" }}
    >
      <span className="animate-spin" style={spinnerStyle} />
      {label && <span className={isDark ? "text-[13px] font-mono" : "text-[14px]"}>{label}</span>}
    </div>
  );
}
