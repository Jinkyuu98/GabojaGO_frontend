import axios from "axios";

// [MOD] CORS 우회: 클라이언트(브라우저)에서는 Next.js 프록시(/proxy) 경로 사용,
// 서버 사이드에서는 직접 백엔드 URL 사용
const isServer = typeof window === "undefined";
const baseURL = isServer
  ? (process.env.API_URL || "http://localhost:8000")
  : "/proxy";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error("localStorage access error:", e);
    }
  }
  return config;
});
