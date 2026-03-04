import axios from "axios";

// [MOD] CORS 우회: 클라이언트(브라우저)에서는 Next.js 프록시(/proxy) 경로 사용,
// 서버 사이드에서는 직접 백엔드 URL 사용
const isServer = typeof window === "undefined";
const baseURL = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
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

// [ADD] Response Interceptor for 401 Unauthorized handling
let isAlertShown = false; // 플래그를 두어 중복 알림을 방지

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        // 현재 위치가 로그인 페이지가 아닌 경우에만 처리
        if (window.location.pathname !== "/login" && !isAlertShown) {
          isAlertShown = true;
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");

          localStorage.removeItem("token");
          localStorage.removeItem("loginTime");
          localStorage.removeItem("saved_places");

          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
