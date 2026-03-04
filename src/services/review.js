import { api } from "../lib/api";

/**
 * 장소 리뷰 목록 조회 API
 * @param {number} iLocationPK - 장소 PK
 * @returns {Promise}
 */
export const getPlaceReviews = async (iLocationPK) => {
    const res = await api.get(`/location/review/list?iLocationPK=${iLocationPK}`);
    return res.data;
};

/**
 * 장소 리뷰 추가 API
 * @param {Object} data - { iLocationFK, nScore, bRevisit, strReview }
 * @returns {Promise}
 */
export const addPlaceReview = async (data) => {
    const res = await api.post("/location/review/append", data);
    return res.data;
};

/**
 * 장소 리뷰 수정 API
 * @param {Object} data - { iPK, nScore, bRevisit, strReview }
 * @returns {Promise}
 */
export const modifyPlaceReview = async (data) => {
    const res = await api.post("/location/review/modify", data);
    return res.data;
};

/**
 * 장소 리뷰 삭제 API
 * @param {number} iLocationReviewPK - 리뷰 PK
 * @returns {Promise}
 */
export const removePlaceReview = async (iLocationReviewPK) => {
    const res = await api.post(`/location/review/remove`, null, {
        params: { iLocationReviewPK }
    });
    return res.data;
};
