import { NextResponse } from "next/server";
import { requestLocationExtraction } from "../../../backend_source/route.js"; // 공용 함수 재사용

/**
 * 2단계: 생성된 일정(ScheduleResponse)에서 
 * 카카오/DB 통신용 장소 리스트(LocationRequestListModel)만 추출하는 API 라우트
 * 
 * POST /api/schedule/location/request 호환
 */
export async function POST(req) {
    try {
        const body = await req.json();

        // requestLocationExtraction 함수는 schedule_front/route.js 에 정의되어 있습니다.
        const locationRequestList = await requestLocationExtraction(body);

        console.log(`[Location Request] ${locationRequestList.request_list.length}개의 장소 추출 완료.`);

        return NextResponse.json(locationRequestList, { status: 200 });
    } catch (error) {
        console.error("[Location Request API Error]:", error);
        return NextResponse.json(
            { error: "Location extraction failed", details: error.message },
            { status: 500 }
        );
    }
}
