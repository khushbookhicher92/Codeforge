import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { fetchProblemDetail } from "../api/problems";
import { runCode, submitCode } from "../api/submissions";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

// Phase 1 only supports these three languages, matching Judge0 IDs
// (python=71, java=62, cpp=54) — JavaScript is intentionally not offered.
const LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
];

const DIFFICULTY_COLOR = {
  Easy: "#4ADE80",
  Medium: "#F2B27E",
  Hard: "#F87171",
};

const VERDICT_LABEL = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compile Error",
};

// -----------------------------------------------------------------------
// Lightweight line-numbered code editor (no external editor dependency).
// Swap for @monaco-editor/react's <Editor /> for real syntax highlighting.
// -----------------------------------------------------------------------
function CodeEditor({ value, onChange }) {
  const lineCount = value.split("\n").length;
  const taRef = useRef(null);
  const gutterRef = useRef(null);

  const syncScroll = () => {
    if (gutterRef.current && taRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  return (
    <div className="flex h-full cf-bg-1E1626 font-mono text-[13px]">
      <div
        ref={gutterRef}
        className="select-none text-right pr-3 pt-3 cf-text-5C4F6B overflow-hidden shrink-0"
        style={{ width: 44 }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="leading-[21px]">
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="flex-1 bg-transparent cf-text-F4EAE0 leading-[21px] pt-3 pr-4 outline-none resize-none whitespace-pre"
        style={{ tabSize: 2 }}
      />
    </div>
  );
}

export default function SubmissionPage() {
  const navigate = useNavigate();
  const { problemId } = useParams();

  const [problem, setProblem] = useState(null);
  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("testcase"); // "testcase" | "result"
  const [customInput, setCustomInput] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [judge0Unavailable, setJudge0Unavailable] = useState(false);

  // Load the real problem detail from the backend.
  useEffect(() => {
    let cancelled = false;
    // Resetting loading/error state ahead of a refetch when problemId changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingProblem(true);
    setLoadError(null);

    fetchProblemDetail(problemId)
      .then((data) => {
        if (cancelled) return;
        setProblem(data);
        setLanguage("python");
        setCode(data.function_signatures?.python ?? "");
        setCustomInput(data.examples?.[0]?.input ?? "");
        setActiveTab("testcase");
        setRunResult(null);
        setSubmitResult(null);
        setActionError(null);
        setJudge0Unavailable(false);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProblem(false);
      });

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  // ---- resizable panels: left problem panel width, editor/console height ----
  const splitRef = useRef(null);
  const rightColRef = useRef(null);
  const [leftWidthPct, setLeftWidthPct] = useState(42);
  const [editorHeightPct, setEditorHeightPct] = useState(58);
  const dragState = useRef(null); // "horizontal" | "vertical" | null

  const onDragMove = useCallback((e) => {
    if (dragState.current === "horizontal" && splitRef.current) {
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidthPct(Math.min(60, Math.max(25, pct)));
    } else if (dragState.current === "vertical" && rightColRef.current) {
      const rect = rightColRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setEditorHeightPct(Math.min(78, Math.max(28, pct)));
    }
  }, []);

  const stopDrag = useCallback(() => {
    dragState.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [onDragMove, stopDrag]);

  const startDrag = (axis) => {
    dragState.current = axis;
    document.body.style.cursor = axis === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  const handleLanguageChange = (id) => {
    setLanguage(id);
    setCode(problem?.function_signatures?.[id] ?? "");
    setLangMenuOpen(false);
  };

  const handleJudge0Error = (err) => {
    if (err.status === 503) {
      setJudge0Unavailable(true);
    } else {
      setActionError(err.message);
    }
  };

  const handleRun = async () => {
    setIsRunning(true);
    setActiveTab("result");
    setSubmitResult(null);
    setActionError(null);
    setJudge0Unavailable(false);
    try {
      const result = await runCode(problemId, { language, code, customInput });
      setRunResult(result);
    } catch (err) {
      setRunResult(null);
      handleJudge0Error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsRunning(true);
    setActiveTab("result");
    setRunResult(null);
    setActionError(null);
    setJudge0Unavailable(false);
    try {
      const result = await submitCode(problemId, { language, code });
      setSubmitResult(result);
    } catch (err) {
      setSubmitResult(null);
      handleJudge0Error(err);
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoadingProblem) {
    return (
      <div className="h-screen w-full flex items-center justify-center cf-bg-FFE6C8">
        <style>{`.cf-bg-FFE6C8 { background-color: #FFE6C8; }`}</style>
        <LoadingSpinner label="Loading problem..." />
      </div>
    );
  }

  if (loadError || !problem) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 cf-bg-FFE6C8 px-6">
        <style>{`.cf-bg-FFE6C8 { background-color: #FFE6C8; }`}</style>
        <ErrorMessage message={loadError || "This problem couldn't be found."} />
        <button
          onClick={() => navigate("/problems")}
          className="text-[13px] font-medium"
          style={{ color: "#7F265C" }}
        >
          Back to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full cf-bg-FFE6C8 flex flex-col font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-sans { font-family: 'Inter', sans-serif; }
        .cf-bg-1E1626 { background-color: #1E1626; }
        .cf-text-5C4F6B { color: #5C4F6B; }
        .cf-text-F4EAE0 { color: #F4EAE0; }
        .cf-bg-FFE6C8 { background-color: #FFE6C8; }
        .cf-bg-FFF6EA { background-color: #FFF6EA; }
        .cf-hover-text-3A2E2A:hover { color: #3A2E2A; }
        .cf-hover-bg-FBF7F2:hover { background-color: #FBF7F2; }
        .cf-hover-bg-96336E:hover { background-color: #96336E; }
        .cf-text-3A2E2A { color: #3A2E2A; }
        .cf-bg-FBF7F2 { background-color: #FBF7F2; }
        .cf-border-F0DCC0 { border-color: #F0DCC0; }
        .cf-text-5B4A44 { color: #5B4A44; }
        .cf-text-9A8B82 { color: #9A8B82; }
        .cf-text-7A6A62 { color: #7A6A62; }
        .cf-bg-F0DCC0 { background-color: #F0DCC0; }
        .cf-hover-bg-D6626B:hover { background-color: #D6626B; }
        .cf-active-bg-7F265C:active { background-color: #7F265C; }
        .cf-bg-150F1B { background-color: #150F1B; }
        .cf-border-2A1E37 { border-color: #2A1E37; }
        .cf-text-D9C9E8 { color: #D9C9E8; }
        .cf-bg-2A1E37 { background-color: #2A1E37; }
        .cf-bg-3A2A4A { background-color: #3A2A4A; }
        .cf-hover-bg-2A1E37:hover { background-color: #2A1E37; }
        .cf-hover-bg-7F265C:hover { background-color: #7F265C; }
        .cf-active-bg-96336E:active { background-color: #96336E; }
        .cf-text-7A6A8C { color: #7A6A8C; }
        .cf-hover-text-D9C9E8:hover { color: #D9C9E8; }
        .cf-border-D9C9E8-30 { border-color: rgba(217,201,232,0.3); }
        .cf-border-3A2A4A { border-color: #3A2A4A; }
        .cf-text-8A7B9C { color: #8A7B9C; }
        .cf-text-4ADE80 { color: #4ADE80; }
        .cf-text-F87171 { color: #F87171; }
        .cf-divider-v-line { background-color: #4A3560; }
        .cf-divider-v:hover .cf-divider-v-line { background-color: #D6626B; }
        .cf-divider-v:active .cf-divider-v-line { background-color: #7F265C; }
        .cf-divider-h-line { background-color: #4A3560; }
        .cf-divider-h:hover .cf-divider-h-line { background-color: #7F265C; }
        .cf-divider-h:active .cf-divider-h-line { background-color: #96336E; }
      `}</style>

      {/* top bar */}
      <header
        style={{ backgroundColor: "#150F1B", borderBottom: "1px solid #2A1E37" }}
        className="flex items-center justify-between px-5 py-3 shrink-0"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/problems")}
            style={{ color: "#8A7B9C" }}
            className="flex items-center gap-1.5 cf-hover-text-D9C9E8 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-[13px] font-medium hidden sm:inline">Back to Problems</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 style={{ color: "#F4EAE0" }} className="text-[15px] font-semibold">
              {problem.title}
            </h1>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: DIFFICULTY_COLOR[problem.difficulty],
                backgroundColor: `${DIFFICULTY_COLOR[problem.difficulty]}1F`,
              }}
            >
              {problem.difficulty}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              backgroundColor: "#1E1626",
              border: "1px solid #3A2A4A",
              color: "#D9C9E8",
              opacity: isRunning ? 0.5 : 1,
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium cf-hover-bg-2A1E37 transition-colors"
          >
            <Play size={14} />
            Run
          </button>
          <button
            onClick={handleSubmit}
            disabled={isRunning}
            style={{
              backgroundColor: "#7F265C",
              color: "#FFFFFF",
              opacity: isRunning ? 0.6 : 1,
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold cf-hover-bg-96336E transition-colors"
          >
            {isRunning ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Submit
          </button>
        </div>
      </header>

      {/* main split */}
      <div ref={splitRef} className="flex-1 flex overflow-hidden">
        {/* LEFT — problem panel */}
        <div
          className="cf-bg-1E1626 overflow-y-auto p-6 shrink-0"
          style={{ width: `${leftWidthPct}%` }}
        >
          <p className="text-[14px] cf-text-F4EAE0 leading-relaxed mb-6 whitespace-pre-line">
            {problem.description_markdown}
          </p>

          {problem.examples.map((ex, i) => (
            <div key={i} className="mb-5">
              <p className="text-[12.5px] font-semibold cf-text-F4EAE0 mb-1.5">Example {i + 1}:</p>
              <div className="cf-bg-2A1E37 border cf-border-3A2A4A rounded-lg p-3 font-mono text-[12.5px] cf-text-D9C9E8 space-y-1">
                <div>
                  <span className="cf-text-8A7B9C">Input: </span>
                  {ex.input}
                </div>
                <div>
                  <span className="cf-text-8A7B9C">Output: </span>
                  {ex.output}
                </div>
                {ex.explanation && (
                  <div>
                    <span className="cf-text-8A7B9C">Explanation: </span>
                    {ex.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}

          <p className="text-[12.5px] font-semibold cf-text-F4EAE0 mb-1.5">Constraints:</p>
          <p className="font-mono text-[12px] cf-text-8A7B9C whitespace-pre-line">
            {problem.constraints}
          </p>
        </div>

        {/* vertical drag handle: resize problem panel vs editor column */}
        <div
          onMouseDown={() => startDrag("horizontal")}
          className="cf-divider-v relative w-[9px] shrink-0 cursor-col-resize"
        >
          <div className="cf-divider-v-line absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] transition-colors" />
        </div>

        {/* RIGHT — editor + console */}
        <div ref={rightColRef} className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* language selector */}
          <div style={{ position: "relative" }} className="cf-bg-150F1B border-b cf-border-2A1E37 px-4 py-2 shrink-0">
            <button
              onClick={() => setLangMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[12.5px] font-mono cf-text-D9C9E8 hover:text-white transition-colors"
            >
              {LANGUAGES.find((l) => l.id === language).label}
              <ChevronDown size={13} />
            </button>

            {langMenuOpen && (
              <>
                {/* invisible click-catcher, closes the menu on outside click */}
                <div
                  onClick={() => setLangMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                {/* menu itself — inline styles so it always renders solid regardless of Tailwind build config */}
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 16,
                    zIndex: 50,
                    width: 176,
                    backgroundColor: "#1E1626",
                    border: "1px solid #3A2A4A",
                    borderRadius: 8,
                    overflow: "hidden",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
                  }}
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleLanguageChange(l.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 16px",
                        fontSize: 12.5,
                        backgroundColor: "#1E1626",
                        color: l.id === language ? "#D6626B" : "#D9C9E8",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3A2A4A")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1E1626")}
                      className="font-mono transition-colors"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* editor */}
          <div className="min-h-0" style={{ height: `${editorHeightPct}%` }}>
            <CodeEditor value={code} onChange={setCode} />
          </div>

          {/* horizontal drag handle: resize editor vs console */}
          <div
            onMouseDown={() => startDrag("vertical")}
            className="cf-divider-h relative h-[9px] shrink-0 cursor-row-resize"
          >
            <div className="cf-divider-h-line absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] transition-colors" />
          </div>

          {/* console */}
          <div
            className="min-h-0 flex flex-col cf-bg-1E1626"
            style={{ height: `${100 - editorHeightPct}%` }}
          >
            <div className="flex items-center gap-1 px-4 pt-2.5 shrink-0">
              {["testcase", "result"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-[12px] font-mono rounded-t-md transition-colors ${
                    activeTab === tab
                      ? "text-white cf-bg-2A1E37"
                      : "cf-text-7A6A8C cf-hover-text-D9C9E8"
                  }`}
                >
                  {tab === "testcase" ? "Testcase" : "Result"}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto cf-bg-2A1E37 p-4">
              {activeTab === "testcase" && (
                <div>
                  <p style={{ color: "#8A7B9C" }} className="text-[11px] font-mono mb-1">
                    Custom Input{" "}
                    <span className="normal-case font-sans" style={{ color: "#5C4F6B" }}>
                      (sent to "Run" as-is — format it to match the function signature above)
                    </span>
                  </p>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    rows={4}
                    spellCheck={false}
                    style={{ backgroundColor: "#1E1626", color: "#F4EAE0" }}
                    className="w-full rounded-md px-3 py-2 font-mono text-[12.5px] outline-none resize-y"
                  />
                </div>
              )}

              {activeTab === "result" && (
                <ResultPanel
                  isRunning={isRunning}
                  runResult={runResult}
                  submitResult={submitResult}
                  actionError={actionError}
                  judge0Unavailable={judge0Unavailable}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ isRunning, runResult, submitResult, actionError, judge0Unavailable }) {
  if (isRunning) {
    return <LoadingSpinner variant="dark" label="Running your code..." />;
  }

  if (judge0Unavailable) {
    return (
      <ErrorMessage
        variant="dark"
        tone="warning"
        message="Judge0 service unavailable, try again later."
      />
    );
  }

  if (actionError) {
    return <ErrorMessage variant="dark" message={actionError} />;
  }

  if (submitResult) {
    const accepted = submitResult.verdict === "AC";
    return (
      <div
        className="flex items-center gap-2.5 pb-1"
        style={{ color: accepted ? "#4ADE80" : "#F87171" }}
      >
        {accepted ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
        <div>
          <p className="text-[16px] font-semibold font-mono">
            {VERDICT_LABEL[submitResult.verdict] || submitResult.verdict}
          </p>
          <p className="text-[11.5px] cf-text-8A7B9C font-mono">
            Judged against all visible test cases
          </p>
        </div>
      </div>
    );
  }

  if (runResult) {
    const isSuccess = runResult.status === "success";
    return (
      <div className="space-y-3">
        <div
          className="flex items-center gap-2"
          style={{ color: isSuccess ? "#4ADE80" : "#F87171" }}
        >
          {isSuccess ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span className="text-[12.5px] font-mono">
            {runResult.status.replace(/_/g, " ")}
          </span>
        </div>
        {runResult.stdout && (
          <div>
            <p style={{ color: "#8A7B9C" }} className="text-[11px] font-mono mb-1">
              stdout
            </p>
            <pre
              style={{ backgroundColor: "#1E1626", color: "#F4EAE0" }}
              className="rounded-md px-3 py-2 font-mono text-[12.5px] whitespace-pre-wrap"
            >
              {runResult.stdout}
            </pre>
          </div>
        )}
        {runResult.stderr && (
          <div>
            <p style={{ color: "#8A7B9C" }} className="text-[11px] font-mono mb-1">
              stderr
            </p>
            <pre
              style={{ backgroundColor: "#1E1626", color: "#F87171" }}
              className="rounded-md px-3 py-2 font-mono text-[12.5px] whitespace-pre-wrap"
            >
              {runResult.stderr}
            </pre>
          </div>
        )}
        {runResult.compile_output && (
          <div>
            <p style={{ color: "#8A7B9C" }} className="text-[11px] font-mono mb-1">
              compile output
            </p>
            <pre
              style={{ backgroundColor: "#1E1626", color: "#F87171" }}
              className="rounded-md px-3 py-2 font-mono text-[12.5px] whitespace-pre-wrap"
            >
              {runResult.compile_output}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="text-[12.5px] font-mono cf-text-7A6A8C py-2">
      Run your code to see results here.
    </p>
  );
}
