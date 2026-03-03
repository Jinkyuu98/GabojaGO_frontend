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
 * [ADD] 장소를 특정 즐겨찾기 그룹에 추가
 * @param {Object} payload 
 * @param {number} payload.iFavoriteFK - 즐겨찾기 그룹 PK
 * @param {number} payload.iLocationFK - 추가할 장소의 DB PK
 */
export const appendFavoriteLocation = (payload) =>
    api.post("/favorite/location/append", payload);

/**
 * [ADD] 즐겨찾기에 등록된 특정 예약/저장 내역 삭제
 * @param {number} iFavoriteLocationPK - 즐겨찾기-장소 매핑 테이블 PK
 */
export const removeFavoriteLocation = (iFavoriteLocationPK) =>
    api.post("/favorite/location/remove", null, { params: { iFavoriteLocationPK } });
