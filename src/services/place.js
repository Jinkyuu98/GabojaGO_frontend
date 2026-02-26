import { api } from "../lib/api";

/**
 * 장소 검색 API (실제 백엔드 사양 적용)
 * @param {string} query - 검색어 (필수)
 * @returns {Promise} - 검색 결과 (LocationModel Map)
 */
export const searchPlaces = (query) =>
  api.post("/location/search/keyword", { query });

/**
 * 장소 상세 정보 조회
 * (현재 백엔드 명세에는 별도 조회가 없으며 검색 결과에 상세 정보가 포함됨)
 */
// export const getPlaceDetail = (id) => api.get(`/places/${id}`);

/**
 * 장소 등록 API
 * @param {Object} placeData - 등록할 장소 데이터
 * @returns {Promise}
 */
export const registerPlace = (placeData) =>
  api.post("/location/register", placeData);

/**
 * 등록된 장소 목록 조회 API
 * @returns {Promise}
 */
export const getSavedPlaces = () => api.get("/location/register");

/**
 * 장소 등록 취소(찜 해제) API
 * @param {Object} placeData - 취소할 장소 데이터 (iPK 등)
 * @returns {Promise}
 */
export const unregisterPlace = (placeData) =>
  api.post("/location/unregister", placeData);
