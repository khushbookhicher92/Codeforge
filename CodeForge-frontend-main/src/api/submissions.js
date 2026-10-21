import apiClient from "./client";

// Both Run and Submit are synchronous/blocking on the backend (it waits out
// the full Judge0 batch-and-poll cycle before responding), so callers should
// show a loading state for the duration of these calls.

export async function runCode(problemId, { language, code, customInput }) {
  const { data } = await apiClient.post(`/api/problems/${problemId}/run`, {
    language,
    code,
    custom_input: customInput,
  });
  return data; // { stdout, stderr, compile_output, status }
}

export async function submitCode(problemId, { language, code }) {
  const { data } = await apiClient.post(`/api/problems/${problemId}/submit`, {
    language,
    code,
  });
  return data; // { submission_id, verdict, submitted_at }
}

export async function fetchSubmissions({ problemId, page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (problemId) params.problem_id = problemId;

  const { data } = await apiClient.get("/api/submissions", { params });
  return data; // { items, total, page, limit }
}

export async function fetchSubmissionDetail(submissionId) {
  const { data } = await apiClient.get(`/api/submissions/${submissionId}`);
  return data; // { id, problem_id, language, code, verdict, submitted_at }
}
