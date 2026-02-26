import { z } from "zod";

/**
 * 프론트엔드/백엔드 공통으로 사용되는 영수증 지출 Pydantic 모델의 Zod 리팩토링 스키마
 */

export const ExpenseEvidenceSchema = z.object({
    store_name: z.string().describe("영수증에 적힌 상호명 (예: 스타벅스 제주성산점)"),
    category_evidence: z.string().optional().describe("영수증의 주요 항목 (예: 아메리카노)"),
});

export const ExpenseModelSchema = z.object({
    // 추후 프론트엔드 연동 전까지 기본값(0)을 주어 테스트 가능하게 함
    iUserFK: z.number().int().default(0).describe("사용자 ID"),
    iScheduleFK: z.number().int().default(0).describe("일정 ID"),
    category: z.string().describe("지출 카테고리(F: 식비, T: 교통비, L: 숙박비, E: 기타)"),
    date: z.string().describe("YYYY-MM-DD HH:MM:SS 형식의 영수증 날짜/시간"),
    total: z.number().int().describe("실제 지불된 결제 금액"),
    strMemo: z.string().optional().describe("상호명, 원가, 할인, 근거 등이 합성된 통합 메모"),
});
