import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CheckCircle2, Circle } from "lucide-react";
import { fetchProblems } from "../api/problems";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const DIFFICULTY_COLOR = {
  Easy: "#4ADE80",
  Medium: "#F2B27E",
  Hard: "#F87171",
};

const FILTERS = ["All", "Easy", "Medium", "Hard"];

export default function ProblemsPage() {
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    // Resetting loading/error state ahead of a refetch when the filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    fetchProblems({
      difficulty: difficultyFilter === "All" ? undefined : difficultyFilter,
      // limit kept generous since there's no pagination UI yet — a "load
      // more" control can be added later if problem counts grow.
      limit: 100,
    })
      .then((data) => {
        if (!cancelled) setProblems(data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [difficultyFilter]);

  // Backend doesn't support free-text title search, so this filters
  // whatever page of results we already have client-side.
  const filtered = useMemo(() => {
    return problems.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
  }, [problems, query]);

  return (
    <div className="min-h-screen w-full pt-28 pb-16 px-6 sm:px-10" style={{ backgroundColor: "#FFE6C8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-bold mb-1" style={{ color: "#6A0D45" }}>
          Problems
        </h1>
        <p className="text-[14px] mb-6" style={{ color: "#7A6A62" }}>
          Pick a problem and start solving.
        </p>

        {/* controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#B6A79B" }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search problems..."
              className="w-full bg-white border rounded-lg pl-9 pr-3.5 py-2.5 text-[14px] outline-none transition-all duration-200"
              style={{ borderColor: "#E9DED2", color: "#3A2E2A" }}
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => {
              const active = difficultyFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setDifficultyFilter(f)}
                  className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "#7F265C" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#3A2E2A",
                    border: active ? "1px solid #7F265C" : "1px solid #E9DED2",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* problem list */}
        <div className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: "#F0DCC0" }}>
          {/* header row */}
          <div
            className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: "#FBF7F2", color: "#9A8B82" }}
          >
            <span className="w-5" />
            <span>Title</span>
            <span>Difficulty</span>
          </div>

          {isLoading && (
            <div className="px-5 py-6">
              <LoadingSpinner label="Loading problems..." />
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <p className="px-5 py-8 text-center text-[14px]" style={{ color: "#9A8B82" }}>
              {problems.length === 0
                ? "No problems yet — check back once some have been added."
                : "No problems match your search."}
            </p>
          )}

          {!isLoading &&
            filtered.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/submit/${p.id}`)}
                className="w-full grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 text-left transition-colors hover:bg-[#FBF7F2]"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid #F0DCC0",
                }}
              >
                {p.solved ? (
                  <CheckCircle2 size={16} style={{ color: "#4ADE80" }} />
                ) : (
                  <Circle size={16} style={{ color: "#E9DED2" }} />
                )}
                <span>
                  <span className="text-[14.5px] font-medium block" style={{ color: "#3A2E2A" }}>
                    {p.title}
                  </span>
                  <span className="flex gap-1.5 mt-1">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10.5px] font-mono px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "#FBF7F2", color: "#9A8B82" }}
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                </span>
                <span
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-full text-center"
                  style={{
                    color: DIFFICULTY_COLOR[p.difficulty],
                    backgroundColor: `${DIFFICULTY_COLOR[p.difficulty]}1F`,
                  }}
                >
                  {p.difficulty}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
