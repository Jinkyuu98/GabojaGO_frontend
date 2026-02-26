import { z } from "zod";

// --- Request Models ---

export const ScheduleRequestSchema = z.object({
    iPK: z.number().int().optional().describe("PK"),
    iUserFK: z.number().int().describe("사용자 ID"),
    dtDate1: z.string().describe("출발일 (depart_date)"),
    dtDate2: z.string().describe("종료일 (return_date)"),
    strWhere: z.string().describe("여행지 (location)"),
    strWithWho: z.string().describe("동행자 (companion)"),
    strTransport: z.string().describe("교통수단 (transport)"),
    nTotalPeople: z.number().int().default(1).describe("인원수"),
    nTotalBudget: z.number().int().default(0).describe("총 예산"),
    nAlarmRatio: z.number().int().default(25).describe("알림 비율"),
    nTransportRatio: z.number().int().default(0).describe("교통 예산"),
    nLodgingRatio: z.number().int().default(0).describe("숙박 예산"),
    nFoodRatio: z.number().int().default(0).describe("식비 예산"),
    chStatus: z.string().optional().describe("상태"),
    dtCreate: z.string().optional().describe("생성일시"),
});

// --- Response Models for LLM ---

export const ScheduleActivitySchema = z.object({
    dtSchedule: z.string().describe("일정 시간 (YYYY-MM-DD HH:MM:SS)"),
    place_name: z.string().describe("방문 장소 명칭 (지도 API 검색이 가능한 공식 명칭)"),
    category_group_code: z.string().optional().describe("장소 성격에 맞는 카카오 카테고리 그룹 코드 (예: CT1, AT4, FD6, CE7 등)"),
    strMemo: z.string().describe("짧은 활동 요약 (필요 없으면 빈 값)"),
});

export const ScheduleDaySchema = z.object({
    day: z.string().describe("Day1, Day2..."),
    activities: z.array(ScheduleActivitySchema),
});

export const ScheduleResponseSchema = z.object({
    day_schedules: z.array(ScheduleDaySchema),
});

// --- Models for DB / Kakao API Server ---

export const LocationRequestItemModelSchema = z.object({
    place_name: z.string().describe("장소 명칭"),
    category_group_code: z.string().optional().describe("카카오톡 지도API에 해당하는 카테고리 그룹 코드"),
});

export const LocationRequestListModelSchema = z.object({
    request_list: z.array(LocationRequestItemModelSchema).describe("AI가 생성한 방문 장소 명칭 리스트"),
});

// Types extracted from schemas
// (TypeScript를 사용할 수 있다면 z.infer를 쓰지만, JSDoc 용도로 참고 가능합니다)
/**
 * @typedef {z.infer<typeof ScheduleRequestSchema>} ScheduleRequest
 * @typedef {z.infer<typeof ScheduleActivitySchema>} ScheduleActivity
 * @typedef {z.infer<typeof ScheduleDaySchema>} ScheduleDay
 * @typedef {z.infer<typeof ScheduleResponseSchema>} ScheduleResponse
 * @typedef {z.infer<typeof LocationRequestItemModelSchema>} LocationRequestItemModel
 * @typedef {z.infer<typeof LocationRequestListModelSchema>} LocationRequestListModel
 */
