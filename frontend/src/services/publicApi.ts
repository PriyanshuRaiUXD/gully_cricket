/**
 * Public API client — no auth redirect on 401.
 * Attaches the JWT token if the user is logged in (admin gets richer data),
 * but a 401 simply rejects rather than triggering a refresh/logout cycle.
 */
import axios from "axios";
import { useAuthStore } from "../store/authStore";

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

publicApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default publicApi;
