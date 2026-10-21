import apiClient from "./client";

// difficulty: "Easy" | "Medium" | "Hard" | undefined
// tags: array of strings (joined into a comma-separated string) | undefined
// status: "solved" | "unsolved" | undefined
// page, limit: numbers
export async function fetchProblems({ difficulty, tags, status, page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (difficulty) params.difficulty = difficulty;
  if (tags && tags.length > 0) params.tags = Array.isArray(tags) ? tags.join(",") : tags;
  if (status) params.status = status;

  const { data } = await apiClient.get("/api/problems", { params });
  return data; // { items, total, page, limit }
}

export async function fetchProblemDetail(problemId) {
  const { data } = await apiClient.get(`/api/problems/${problemId}`);
  return data; // { id, title, description_markdown, examples, constraints, difficulty, tags, function_signatures }
}
