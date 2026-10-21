import apiClient from "./client";

export async function fetchMyProfile() {
  const { data } = await apiClient.get("/api/users/me/profile");
  return data; // { username, email, solved_count }
}
