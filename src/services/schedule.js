import { api } from "../lib/api";

/**
 * 일정 생성 API
 * @param {Object} scheduleData - 일정 생성에 필요한 데이터
 * @returns {Promise}
 */
export const createSchedule = async (scheduleData) => {
    console.log("[스케쥴 생성 백엔드 전송 직전 페이로드 검사]", JSON.stringify(scheduleData));
    const res = await api.post("/schedule/append", scheduleData);
    return res.data;
};

// [ADD] 일정 삭제 API 추가
/**
 * 일정 삭제 API
 * @param {number} iSchedulePK - 삭제할 일정의 PK
 * @returns {Promise}
 */
export const removeSchedule = async (iSchedulePK) => {
    const res = await api.post(`/schedule/remove?iSchedulePK=${iSchedulePK}`);
    return res.data;
};

// [ADD] 일정 수정 API
/**
 * 일정 수정 API
 * @param {Object} data - 수정할 일정 데이터 (iPK 필수, 나머지 수정 대상)
 * @returns {Promise}
 */
export const modifySchedule = async (data) => {
    const res = await api.post("/schedule/modify", data);
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
 * @param {string} status - 조회할 일정 상태 (예: "A", "B", "C")
 * @returns {Promise}
 */
export const getScheduleList = async (status = "A") => {
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

// [ADD] 동행자 추가 API
/**
 * @param {Object} data - { iScheduleFK, iUserFK, dtCreate }
 */
export const addScheduleUser = async (data) => {
    // [MOD] dtCreate가 없으면 현재 시각을 자동 생성
    const now = new Date();
    const dtCreate = data.dtCreate ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const res = await api.post("/schedule/user/append", { ...data, dtCreate });
    return res.data;
};

// [ADD] 동행자 삭제 API
/**
 * @param {number} iScheduleUserPK - 삭제할 동행자 매핑 PK
 */
export const removeScheduleUser = async (iScheduleUserPK) => {
    const res = await api.post("/schedule/user/remove", null, {
        params: { iScheduleUserPK }
    });
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

// [ADD] 장소 삭제 API 추가
/**
 * 일정 내 장소 삭제 API
 * @param {number} iScheduleLocationPK - 삭제할 장소의 PK
 * @returns {Promise}
 */
export const removeScheduleLocation = async (iScheduleLocationPK) => {
    // 백엔드가 필수 입력 (query) 로 요구하므로 params 에 담아 보냅니다.
    const res = await api.post(`/schedule/location/remove`, null, {
        params: { iScheduleLocationPK }
    });
    return res.data;
};

// [ADD] 장소 수정 API 추가
/**
 * 일정 내 장소 일시 및 메모 수정 API
 * @param {Object} data - { iPK, iScheduleFK, iLocationFK, dtSchedule, strMemo }
 * @returns {Promise}
 */
export const modifyScheduleLocation = async (data) => {
    console.log("🚨 [장소 수정 백엔드 전송 직전 페이로드 검사]", JSON.stringify(data));
    const res = await api.post("/schedule/location/modify", data);
    return res.data;
};

// [ADD] 지출 삭제 API
/**
 * 일정 내 지출 삭제 API
 * @param {number} iScheduleExpensePK - 삭제할 지출의 PK
 * @returns {Promise}
 */
export const removeScheduleExpense = async (iScheduleExpensePK) => {
    const res = await api.post(`/schedule/expense/remove`, null, {
        params: { iScheduleExpensePK }
    });
    return res.data;
};

// [ADD] 지출 수정 API
/**
 * 일정 내 지출 수정 API
 * @param {Object} data - { iPK, nMoney, dtExpense, chCategory, strMemo }
 * @returns {Promise}
 */
export const modifyScheduleExpense = async (data) => {
    const res = await api.post("/schedule/expense/modify", data);
    return res.data;
};

// ==========================================
// [ADD] 준비물(Checklist) 관련 API
// ==========================================

/**
 * 일정 준비물 목록 조회 API
 * @param {number} iSchedulePK 
 * @returns {Promise}
 */
export const getSchedulePreparations = async (iSchedulePK) => {
    const res = await api.get(`/schedule/preparation/list?iSchedulePK=${iSchedulePK}`);
    return res.data;
};

/**
 * 일정 준비물 추가 API
 * @param {Object} data - { iScheduleFK, strName, bCheck }
 * @returns {Promise}
 */
export const addSchedulePreparation = async (data) => {
    const res = await api.post("/schedule/preparation/append", data);
    return res.data;
};

/**
 * 일정 준비물 수정 API (체크 여부 토글용)
 * @param {Object} data - { iPK, bCheck }
 * @returns {Promise}
 */
export const modifySchedulePreparation = async (data) => {
    const res = await api.post("/schedule/preparation/modify", data);
    return res.data;
};

/**
 * 일정 준비물 삭제 API
 * @param {number} iSchedulePreparationPK 
 * @returns {Promise}
 */
export const removeSchedulePreparation = async (iSchedulePreparationPK) => {
    const res = await api.post(`/schedule/preparation/remove`, null, {
        params: { iSchedulePreparationPK }
    });
    return res.data;
};
