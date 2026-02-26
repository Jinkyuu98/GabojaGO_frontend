// NextResponse 임포트 제거. 기본 Web Response 사용
import { ScheduleRequestSchema } from "./scheduleModel.js";
import { ScheduleGPT } from "./scheduleLLM.js";

// 단일 인스턴스로 재사용
const scheduleAi = new ScheduleGPT();

/**
 * 1단계: 일정 생성 (DB 저장 안 함)
 * POST /api/schedule/generate 와 같은 API 용도
 */
export async function POST(req) {
    try {
        const startTime = performance.now();
        const body = await req.json();

        // 입력 데이터 검증 (zod)
        const parsedData = ScheduleRequestSchema.parse(body);

        console.log(`[일정 생성 시작]: `, parsedData);

        // AI 스케줄 생성 호출
        const aiRes = await scheduleAi.generate(parsedData);

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`[일정 생성 완료] 시간: ${duration}초`);
        console.log(`[AI 응답 구조체 점검] day_schedules 존재 여부:`, !!aiRes.day_schedules);
        if (aiRes.day_schedules) {
            console.log(`[AI 응답 구조체 점검] Day 1 활동 수:`, aiRes.day_schedules[0]?.activities?.length);
        } else {
            console.log(`[AI 응답 구조체 점검] aiRes 전체:`, JSON.stringify(aiRes).substring(0, 300));
        }

        return new Response(JSON.stringify(aiRes), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("[일정 생성 실패]: ", error);
        return new Response(
            JSON.stringify({ error: "생성 실패", details: error.message }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}

/**
 * 2단계: 생성된 일정에서 DB 서버 전송용 장소 목록 추출
 * 필요한 경우, 별도의 라우트 파일이나 다른 HTTP 메서드로 분리할 수 있습니다.
 * 이 예제에서는 동일 라우트에서 별도로 사용할 수 있는 헬퍼 함수로 남기거나
 * 라우팅 파라미터에 따라 분기하도록 구현할 수 있습니다.
 * 
 * Next.js App Router 특성상 여러 POST를 한 파일에 둘 수 없으므로,
 * 2단계 처리는 별도의 API 라우트(예: /api/location/request/route.js)에 분리하는 것이 좋습니다.
 * 여기서는 동일 기능의 범용 함수로도 노출합니다.
 */
export async function requestLocationExtraction(scheduleData) {
    try {
        const placeItems = [];

        // ScheduleResponse 구조 탐색
        if (scheduleData && Array.isArray(scheduleData.day_schedules)) {
            for (const day of scheduleData.day_schedules) {
                if (Array.isArray(day.activities)) {
                    for (const act of day.activities) {
                        placeItems.push({
                            place_name: act.place_name,
                            category_group_code: act.category_group_code || null,
                        });
                    }
                }
            }
        }

        return { request_list: placeItems };
    } catch (error) {
        throw new Error(`Location extraction failed: ${error.message}`);
    }
}
