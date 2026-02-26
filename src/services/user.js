import { api } from "../lib/api";

// [MOD] 정의되지 않은 data 변수 제거
export const getUsers = () => api.get("/auth/register");
// [MOD] 정의되지 않은 id, password 변수 수정 (data 객체 전달)
export const login = (data) => api.post("/auth/login", data);
export const getMe = () => api.get("/auth/test");
