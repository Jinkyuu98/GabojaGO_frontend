import { api } from "../lib/api";

/**
 * 일정 생성 API
 * @param {Object} scheduleData - 일정 생성에 필요한 데이터
 * @returns {Promise}
 */
export const createSchedule = async (scheduleData) => {
    const res = await api.post("/schedule/append", scheduleData);
    return res.data;
};

/**
 * AI 명칭 리스트로 백엔드에서 카카오 장소 데이터 조회 (location_list) 
 * @param {Object} data - { request_list: [{ place_name, category_group_code }] }
 */
export const requestScheduleLocations = async (data) => {
    const res = await api.post("/location/request", data);
    return res.data;
};

/**
 * 일정 목록 조회 API
 * @param {string} status - 조회할 일정 상태 (예: "a", "b", "c")
 * @returns {Promise}
 */
export const getScheduleList = async (status = "") => {
    const url = status ? `/schedule/list?chStatus=${status}` : "/schedule/list";
    const res = await api.get(url);
    return res.data;
};

export const getScheduleLocations = async (iSchedulePK) => {
    const res = await api.get(`/schedule/location/list?iSchedulePK=${iSchedulePK}`);
    return res.data;
};

export const getScheduleExpenses = async (iSchedulePK) => {
    const res = await api.get(`/schedule/expense/list?iSchedulePK=${iSchedulePK}`);
    return res.data;
};

export const getScheduleUsers = async (iSchedulePK) => {
    const res = await api.get(`/schedule/user/list?iSchedulePK=${iSchedulePK}`);
    return res.data;
};

/**
 * 일정 내 장소 추가 API
 * @param {Object} data - { iScheduleFK, dtSchedule, strMemo, iLocationFK }
 */
export const addScheduleLocation = async (data) => {
    console.log("🚨 [백엔드 전송 직전 페이로드 검사]", JSON.stringify(data));
    const res = await api.post("/schedule/location/append", data);
    return res.data;
};

/**
 * [Vison] AI로 전처리된 영수증 지출 내역 DB 저장 API
 * @param {Object} data - { iScheduleFK, category, total, strMemo, date }
 */
export const addScheduleExpense = async (data) => {
    const res = await api.post("/schedule/expense/append", data);
    return res.data;
};
