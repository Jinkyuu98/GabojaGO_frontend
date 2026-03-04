import { api } from "../lib/api";

// [MOD] api 인스턴스 사용하도록 통일 및 중복 코드 정리
export const signup = async (data) => {
  const res = await api.post("/auth/register", data);

  // ⭐ 회원가입 즉시 로그인 처리
  if (res.data?.access_token) {
    localStorage.setItem("token", res.data.access_token);
  }

  return res.data;
};

// [MOD] api 인스턴스 사용 및 데이터 형식({strUserID, strUserPW}) 으로 변경
export const login = async (id, password) => {
  const res = await api.post("/auth/login", {
    strUserID: id,
    strUserPW: password,
  });

  if (res.data?.access_token) {
    localStorage.setItem("token", res.data.access_token);
  }

  return res.data;
};

// [ADD] 사용자 이름으로 검색 API (업데이트된 OpenAPI: /auth/user/search)
/**
 * @param {string} strUserName - 검색할 사용자 이름
 * @returns {Promise} - { user_list: [...] }
 */
export const searchUserByName = async (strUserName) => {
  const res = await api.get("/auth/user/search", { params: { strUserName } });
  return res.data;
};
