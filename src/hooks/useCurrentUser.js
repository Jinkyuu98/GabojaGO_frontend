// [ADD] 현재 로그인한 유저 정보를 JWT 토큰에서 파싱하는 공통 훅
// JWT payload 구조: { iPK, strUserID, strName, strEmail, exp }
// - iPK      : 유저 PK (리뷰의 iUserFK와 동일)
// - strUserID: 로그인 아이디
// - strName  : 유저 이름

export function useCurrentUser() {
    try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) return { userId: null, userLoginId: null, userName: null };

        const payload = JSON.parse(atob(token.split(".")[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp ? payload.exp < currentTime : false;

        return {
            userId: payload.iPK ?? null,         // 유저 PK → 리뷰의 iUserFK와 비교용
            userLoginId: payload.strUserID ?? null, // 로그인 아이디 표시용
            userName: payload.strName ?? null,       // 이름 표시용
            isExpired,                               // 토큰 만료 여부
        };
    } catch (e) {
        return { userId: null, userLoginId: null, userName: null, isExpired: true };
    }
}
