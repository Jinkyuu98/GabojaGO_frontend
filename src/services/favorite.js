import { api } from "../lib/api";

/**
 * [ADD] 즐겨찾기 폴더/그룹 목록 조회
 * 기본 폴더의 iPK를 얻기 위해 사용될 수 있습니다.
 */
export const getFavoriteList = () => api.get("/favorite/list");

/**
 * [ADD] 특정 즐겨찾기 그룹(iFavoritePK)에 속한 장소 목록 조회
 * @param {number} iFavoritePK - 즐겨찾기 PK (예: 기본 1)
 */
export const getFavoriteLocationList = (iFavoritePK) =>
    api.get("/favorite/location/list", { params: { iFavoritePK } });

/**
 * [MOD] 장소를 특정 즐겨찾기 그룹에 추가
 * @param {Object} payload 
 * @param {number} payload.iFavoriteFK - 즐겨찾기 그룹 PK
 * @param {number} payload.iLocationFK - 추가할 장소의 DB PK
 * [MOD] 백엔드 API 업데이트: dtFavorite (datetime) 필수 추가됨 → 자동 생성
 */
export const appendFavoriteLocation = (payload) => {
    // [MOD] dtFavorite가 없으면 현재 시각을 자동으로 추가
    const now = new Date();
    const dtFavorite = payload.dtFavorite ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return api.post("/favorite/location/append", { ...payload, dtFavorite });
};

/**
 * [ADD] 즐겨찾기에 등록된 특정 예약/저장 내역 삭제
 * @param {number} iFavoriteLocationPK - 즐겨찾기-장소 매핑 테이블 PK
 */
export const removeFavoriteLocation = (iFavoriteLocationPK) =>
    api.post("/favorite/location/remove", null, { params: { iFavoriteLocationPK } });
/**
 * [ADD] 즐겨찾기 폴더 (그룹) 생성
 * @param {Object} payload 
 * @param {string} payload.strName - 새 그룹 이름
 */
export const appendFavoriteGroup = (payload) =>
    api.post("/favorite/append", payload);

/**
 * [ADD] 즐겨찾기 폴더 (그룹) 삭제
 * @param {number} iFavoritePK - 삭제할 그룹 PK
 */
export const removeFavoriteGroup = (iFavoritePK) =>
    api.post("/favorite/remove", null, { params: { iFavoritePK } });
