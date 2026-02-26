export const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * 커스텀 에러 클래스
 */
export class ImageValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ImageValidationError";
    }
}

/**
 * MIME 타입 및 파일 크기 검증
 * @param {string} contentType - 파일의 MIME 타입
 * @param {number} size - 파일 크기 (bytes)
 */
export function validateImage(contentType, size) {
    if (!ALLOWED_MIME.has(contentType)) {
        throw new ImageValidationError("지원하지 않는 이미지 형식입니다. (jpeg/png/webp만 가능)");
    }
    if (size > MAX_BYTES) {
        throw new ImageValidationError("이미지 파일 크기가 너무 큽니다. (최대 10MB)");
    }
}

/**
 * 이미지 바이트 배열을 Base64 Data URI로 변환
 * @param {Buffer} imageBuffer - 이미지 데이터
 * @param {string} contentType - 이미지의 컨텐츠 타입
 * @returns {string} base64 Data URI 문자열
 */
export function toDataURI(imageBuffer, contentType) {
    validateImage(contentType, imageBuffer.length);
    const b64 = imageBuffer.toString("base64");
    return `data:${contentType};base64,${b64}`;
}
