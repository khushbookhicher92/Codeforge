import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { fetchSubmissions, fetchSubmissionDetail } from "../api/submissions";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const VERDICT_LABEL = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compile Error",
};

const LANGUAGE_LABEL = {
  python: "Python",
  java: "Java",
  cpp: "C++",
};

function VerdictBadge({ verdict }) {
  const accepted = verdict === "AC";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        color: accepted ? "#22A35C" : "#D6626B",
        backgroundColor: accepted ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
      }}
    >
      {accepted ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {VERDICT_LABEL[verdict] || verdict}
    </span>
  );
}

export default function SubmissionHistoryPage() {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSubmissions({ limit: 50 })
      .then((data) => {
        if (!cancelled) setSubmissions(data.items);
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
  }, []);

  const toggleExpand = async (submissionId) => {
    if (expandedId === submissionId) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(submissionId);
    setExpandedDetail(null);
    setDetailLoading(true);
    try {
      const detail = await fetchSubmissionDetail(submissionId);
      setExpandedDetail(detail);
    } catch {
      setExpandedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full pt-28 pb-16 px-6 sm:px-10" style={{ backgroundColor: "#FFE6C8" }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[28px] font-bold mb-1" style={{ color: "#6A0D45" }}>
          Submission History
        </h1>
        <p className="text-[14px] mb-6" style={{ color: "#7A6A62" }}>
          Every attempt you've made, across all problems.
        </p>

        {error && (
          <div className="mb-4">
            <ErrorMessage message={error} />
          </div>
        )}

        <div className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: "#F0DCC0" }}>
          <div
            className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: "#FBF7F2", color: "#9A8B82" }}
          >
            <span>Problem</span>
            <span>Language</span>
            <span>Verdict</span>
            <span>Submitted</span>
          </div>

          {isLoading && (
            <div className="px-5 py-6">
              <LoadingSpinner label="Loading submission history..." />
            </div>
          )}

          {!isLoading && !error && submissions.length === 0 && (
            <p className="px-5 py-8 text-center text-[14px]" style={{ color: "#9A8B82" }}>
              You haven't submitted anything yet.
            </p>
          )}

          {!isLoading &&
            submissions.map((s, i) => {
              const isExpanded = expandedId === s.id;
              return (
                <div key={s.id} style={{ borderTop: i === 0 ? "none" : "1px solid #F0DCC0" }}>
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 text-left transition-colors hover:bg-[#FBF7F2]"
                  >
                    <span className="text-[13.5px] font-mono" style={{ color: "#3A2E2A" }}>
                      {s.problem_id}
                    </span>
                    <span className="text-[13px]" style={{ color: "#7A6A62" }}>
                      {LANGUAGE_LABEL[s.language] || s.language}
                    </span>
                    <VerdictBadge verdict={s.verdict} />
                    <span className="flex items-center gap-2 text-[12.5px] font-mono" style={{ color: "#9A8B82" }}>
                      {new Date(s.submitted_at).toLocaleString()}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5">
                      {detailLoading && <LoadingSpinner label="Loading code..." />}
                      {!detailLoading && expandedDetail && (
                        <pre
                          className="rounded-lg p-4 font-mono text-[12.5px] overflow-x-auto whitespace-pre-wrap"
                          style={{ backgroundColor: "#1E1626", color: "#F4EAE0" }}
                        >
                          {expandedDetail.code}
                        </pre>
                      )}
                      {!detailLoading && !expandedDetail && (
                        <ErrorMessage message="Couldn't load this submission's code." />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
