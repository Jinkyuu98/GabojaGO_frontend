// import { NextResponse } from "next/server";
import { ExpenseGPT } from "./visionLLM.js";
import { toDataURI, ImageValidationError } from "./imageValidation.js";

// 단일 공유 인스턴스 (메모리 절약)
const ocrModel = new ExpenseGPT();

/**
 * 1단계: 영수증 이미지 수신 및 파싱 (Next.js API Route)
 * POST /api/vision/parse 호환
 */
export async function POST(req) {
    try {
        // multipart/form-data 파싱 (Next.js App Router 방식)
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return new Response(
                JSON.stringify({ error: "No file uploaded" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 브라우저의 File 혹은 Blob 스펙이므로 arrayBuffer() 및 MIME 타입 검증
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = file.type;

        // Base64 URI 변환 및 유효성 검사
        const dataUri = toDataURI(buffer, contentType);

        console.log(`[Vision] 영수증 파싱 시작. 파일 크기: ${buffer.length} bytes`);

        // LLM 추론 호출
        const result = await ocrModel.parse(dataUri);

        console.log(`[Vision] 영수증 파싱 성공:`, result);

        return new Response(JSON.stringify(result), {
            status: 200, headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("[Vision API Error]:", error);

        if (error instanceof ImageValidationError) {
            return new Response(
                JSON.stringify({ error: "Image Validation Failed", detail: error.message }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (error.message?.includes("parse") || error.message?.includes("output")) {
            return new Response(
                JSON.stringify({ error: "LLM output parsing failed", detail: error.message }),
                { status: 422, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Server error", detail: error.toString() }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
