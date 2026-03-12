// [ADD] AI 일정 장소 클릭 시 카카오 검색 결과 목록을 표시하는 패널 컴포넌트
// PlaceDetailPanel과 동일한 슬라이드 패널 UI 방식으로 표시

import React from "react";
import Image from "next/image";

/**
 * 카카오지도 API 검색 결과 패널
 * @param {Object}   place    - AI 일정의 place 객체 { name, originalName, kakaoList, kakao }
 * @param {Function} onClose  - 패널 닫기 콜백
 */
export function KakaoSearchResultPanel({ place, onClose, onSelect }) {
    if (!place) return null;

    const kakaoList = place.kakaoList;
    const originalName = place.originalName || place.name;

    // 현재 일정에 연결된 카카오 장소 ID (비교용)
    const currentKakaoId = place.kakao?.iPK || place.kakao?.id;

    // [ADD] 카테고리 코드 → 한국어 라벨 매핑
    const CATEGORY_LABEL = {
        FD6: "음식점",
        CE7: "카페",
        AD5: "숙박",
        AT4: "관광명소",
        CT1: "문화시설",
        MT1: "마트",
        CS2: "편의점",
        PK6: "주차장",
        OL7: "주유소",
        SW8: "지하철역",
        BK9: "은행",
        HP8: "병원",
        PM9: "약국",
        SC4: "학교",
        AC5: "학원",
        PO3: "공공기관",
    };

    const getCategoryLabel = (item) => {
        // strGroupCode 또는 chCategory에서 라벨 추출
        const code = item.strGroupCode || item.chCategory;
        return CATEGORY_LABEL[code] || item.strGroupName || item.strCategory || code || "기타";
    };

    return (
        // [ADD] 전체 오버레이 컨테이너 (PlaceDetailPanel과 동일한 구조)
        <div className="flex flex-col h-full bg-white relative w-full overflow-y-auto scrollbar-hide pt-2 lg:px-2">
            {/* 상단 헤더 */}
            <div className="bg-white flex items-center mb-4 pb-2 px-4 pt-4 shrink-0">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Image src="/icons/arrow-left.svg" alt="back" width={20} height={16} className="w-5 h-4" />
                </button>
                <div className="ml-4 flex-1">
                    <h2 className="text-[18px] font-bold text-[#111111]">장소 검색 결과</h2>
                    <p className="text-[13px] text-[#6e6e6e] mt-0.5">
                        AI 추천: <span className="text-[#7a28fa] font-semibold">{originalName}</span>
                    </p>
                </div>
            </div>

            <div className="px-4 flex flex-col gap-3 pb-8">
                {/* [ADD] 검색 결과 개수 안내 */}
                {kakaoList && kakaoList.length > 0 ? (
                    <>
                        <p className="text-[13px] text-[#abb1b9]">
                            총 <span className="text-[#111111] font-semibold">{kakaoList.length}</span>개의 검색 결과
                        </p>

                        {/* [ADD] 검색 결과 목록 */}
                        <div className="flex flex-col gap-2">
                            {kakaoList.map((item, idx) => {
                                // 현재 장소와 ID가 일치하는지 확인
                                const itemId = item.iPK || item.id;
                                const isSelected = currentKakaoId && itemId && String(itemId) === String(currentKakaoId);

                                const name = item.strName || item.place_name || `결과 ${idx + 1}`;
                                const address = item.strAddress || item.road_address_name || item.address_name || "";
                                const categoryLabel = getCategoryLabel(item);

                                return (
                                    <div
                                        key={itemId || idx}
                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                                            isSelected
                                                ? "border-[#7a28fa] bg-[#f9f5ff]"
                                                : "border-[#e5ebf2] bg-white"
                                        }`}
                                    >
                                        {/* [ADD] 순서 번호 */}
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 mt-0.5 ${
                                                isSelected
                                                    ? "bg-[#7a28fa] text-white"
                                                    : "bg-[#f2f4f6] text-[#6e6e6e]"
                                            }`}
                                        >
                                            {idx + 1}
                                        </div>

                                        {/* [ADD] 장소 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap justify-between">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                                                    <span
                                                        className={`text-[14px] font-bold truncate ${
                                                            isSelected ? "text-[#7a28fa]" : "text-[#111111]"
                                                        }`}
                                                    >
                                                        {name}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="text-[11px] font-semibold text-[#7a28fa] bg-[#f0e8ff] px-1.5 py-0.5 rounded flex-shrink-0">
                                                            적용됨
                                                        </span>
                                                    )}
                                                </div>

                                                {/* [ADD] 선택 버튼 */}
                                                {!isSelected && onSelect && (
                                                    <button
                                                        onClick={() => onSelect(item)}
                                                        className="px-3 py-1 bg-[#7a28fa] text-white text-[11px] font-bold rounded-lg hover:bg-[#6620d6] transition-colors flex-shrink-0"
                                                    >
                                                        선택
                                                    </button>
                                                )}
                                            </div>

                                            {/* [ADD] 카테고리 */}
                                            {categoryLabel && (
                                                <span className="text-[12px] text-[#7a28fa] bg-[#f9f5ff] px-1.5 py-0.5 rounded mt-1 inline-block">
                                                    {categoryLabel}
                                                </span>
                                            )}

                                            {/* [ADD] 주소 */}
                                            {address && (
                                                <p className="text-[12px] text-[#6e6e6e] mt-1 leading-relaxed break-words">
                                                    {address}
                                                </p>
                                            )}

                                            {/* [ADD] 전화번호 (있는 경우) */}
                                            {item.strPhone && (
                                                <p className="text-[12px] text-[#6e6e6e] mt-0.5 flex items-center gap-1">
                                                    📞{" "}
                                                    <a href={`tel:${item.strPhone}`} className="hover:underline">
                                                        {item.strPhone}
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    // [ADD] 검색 결과 없음 상태
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-16 h-16 bg-[#f9f5ff] rounded-full flex items-center justify-center text-3xl">
                            🔍
                        </div>
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-[#111111] mb-1">검색 결과가 없습니다</p>
                            <p className="text-[13px] text-[#6e6e6e]">
                                &apos;{originalName}&apos;에 대한<br />
                                카카오지도 검색 결과를 찾지 못했습니다.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
