"use client";

import React, { useState, useEffect, useRef } from "react";
import { searchPlaces, registerPlace } from "../../../services/place";
import { addScheduleLocation } from "../../../services/schedule";
import { getPlaceReviews } from "../../../services/review";

// [ADD] 카테고리 목록 및 코드 매핑 (search/input/page.jsx와 동일)
const CATEGORIES = ["전체", "음식점", "카페", "편의점", "대형마트", "관광명소", "숙박", "문화시설", "지하철역", "주차장", "주유소", "기타"];
const CATEGORY_MAP = {
    음식점: "FD6", 카페: "CE7", 편의점: "CS2", 대형마트: "MT1",
    관광명소: "AT4", 숙박: "AD5", 문화시설: "CT1", 지하철역: "SW8",
    주차장: "PK6", 주유소: "OL7",
};

const HighlightText = ({ text = "", keyword = "" }) => {
    if (!keyword.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${keyword})`, "gi"));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === keyword.toLowerCase()
                    ? <span key={i} className="text-[#7a28fa]">{part}</span>
                    : <span key={i}>{part}</span>
            )}
        </span>
    );
};

/**
 * [ADD] 모바일 장소 검색 시트
 * - sheetHeight: 기존 바텀시트와 동일한 높이(px)를 받아서 지도 노출 영역을 일치시킴
 * - 카테고리 필터(가로 스크롤 칩) 포함
 * - 검색결과 → 장소 상세/추가폼 2단계 뷰
 */
export default function MobilePlaceSearchSheet({
    isOpen, onClose, tripId, day, formattedDate, onAddSuccess,
    sheetHeight = 400, // [ADD] 기존 바텀시트 높이 전달받아 지도 노출 면적 맞춤
}) {
    // 검색
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("전체"); // [ADD] 카테고리 필터

    // 장소 선택 및 추가
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [memo, setMemo] = useState("");

    // 뷰 전환: 'search' | 'detail'
    const [view, setView] = useState("search");

    const inputRef = useRef(null);
    const categoryRef = useRef(null);

    // [ADD] 시트 열릴 때 상태 초기화 및 포커스
    useEffect(() => {
        if (isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setSelectedPlace(null);
            setMemo("");
            setView("search");
            setSelectedCategory("전체");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // [ADD] 장소 선택 시 기본 날짜 설정
    useEffect(() => {
        if (selectedPlace && formattedDate) {
            setScheduleDate(formattedDate.replace(" ", "T").substring(0, 16));
        }
    }, [selectedPlace, formattedDate]);

    // [ADD] 검색 디바운스 + 카테고리 필터 적용
    useEffect(() => {
        const fetch = async () => {
            if (!searchQuery.trim()) { setSearchResults([]); return; }
            setIsLoading(true);
            try {
                const res = await searchPlaces(searchQuery);
                const data = res.data || {};
                let items = data.location_list || data;
                if (typeof items === "object" && !Array.isArray(items)) items = Object.values(items);

                // [ADD] 카테고리 필터
                const filtered = items.filter((item) => {
                    if (selectedCategory === "전체") return true;
                    if (selectedCategory === "기타") return !Object.values(CATEGORY_MAP).includes(item.strGroupCode);
                    return item.strGroupCode === CATEGORY_MAP[selectedCategory];
                }).slice(0, 20);

                // [ADD] 리뷰 병렬 호출로 평점 계산
                const withRatings = await Promise.all(
                    filtered.map(async (item) => {
                        const base = {
                            id: item.iPK,
                            name: item.strName,
                            address: item.strAddress,
                            category: item.strGroupName || "기타",
                            groupCode: item.strGroupCode || "",
                            latitude: parseFloat(item.ptLatitude),
                            longitude: parseFloat(item.ptLongitude),
                            phone: item.strPhone,
                            link: item.strLink,
                            rating: 0,
                            reviewCount: 0,
                        };
                        try {
                            const rv = await getPlaceReviews(Number(item.iPK));
                            const list = rv?.review_list
                                ? (typeof rv.review_list === "string" ? JSON.parse(rv.review_list.replace(/'/g, '"')) : rv.review_list)
                                : [];
                            const count = list.length;
                            const avg = count ? parseFloat((list.reduce((s, r) => s + (r.nScore || 0), 0) / count).toFixed(1)) : 0;
                            return { ...base, rating: avg, reviewCount: count };
                        } catch { return base; }
                    })
                );
                setSearchResults(withRatings);
            } catch { setSearchResults([]); }
            finally { setIsLoading(false); }
        };
        const t = setTimeout(fetch, 400);
        return () => clearTimeout(t);
    }, [searchQuery, selectedCategory]); // [MOD] 카테고리 변경 시에도 재검색

    // [ADD] 일정에 장소 추가
    const handleAddPlace = async () => {
        if (!selectedPlace || isAdding || !scheduleDate) return;
        setIsAdding(true);
        try {
            try {
                await registerPlace({
                    iPK: selectedPlace.id, strName: selectedPlace.name,
                    strAddress: selectedPlace.address, strGroupName: selectedPlace.category || "",
                    strGroupCode: selectedPlace.groupCode || "", strGroupDetail: "",
                    strPhone: selectedPlace.phone || "", strLink: selectedPlace.link || "",
                    chCategory: "", ptLatitude: String(selectedPlace.latitude),
                    ptLongitude: String(selectedPlace.longitude),
                });
            } catch { /* 이미 등록된 장소 무시 */ }

            await addScheduleLocation({
                iPK: 0, iScheduleFK: parseInt(tripId),
                iLocationFK: selectedPlace.id,
                dtSchedule: scheduleDate.replace("T", " ") + ":00",
                strMemo: memo,
            });
            onAddSuccess({ place: selectedPlace, dtSchedule: scheduleDate.replace("T", " ") + ":00", strMemo: memo });
            onClose();
        } catch {
            alert("장소 추가에 실패했습니다.");
        } finally { setIsAdding(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col justify-end pointer-events-none">
            {/* [ADD] 지도 영역 (탭 시 닫기) - sheetHeight와 동일한 영역만큼 시트가 올라오므로 나머지는 지도 */}
            <div
                className="flex-1 pointer-events-auto"
                onClick={onClose}
            />

            {/* [ADD] 시트 본체 - sheetHeight로 높이를 기존 바텀시트와 일치 */}
            <div
                className="bg-white rounded-t-[20px] shadow-[0_-6px_32px_rgba(0,0,0,0.16)] flex flex-col pointer-events-auto"
                style={{ height: sheetHeight }}
            >
                {/* 드래그 핸들 + 헤더 */}
                <div className="flex-shrink-0">
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-9 h-1 bg-[#ddd] rounded-full" />
                    </div>

                    <div className="flex items-center justify-between px-4 pb-2 pt-1">
                        {view === "detail" ? (
                            <button
                                onClick={() => { setView("search"); setSelectedPlace(null); }}
                                className="flex items-center gap-1 text-[#7a28fa] font-semibold text-[13px]"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M15 18l-6-6 6-6" />
                                </svg>
                                목록으로
                            </button>
                        ) : (
                            <h2 className="text-[16px] font-bold text-[#111]">
                                장소 추가 · <span className="text-[#7a28fa]">{day}일차</span>
                            </h2>
                        )}
                        <button
                            onClick={onClose}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#f5f7f9]"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* [ADD] 검색 인풋 */}
                    {view === "search" && (
                        <div className="px-4 pb-2">
                            <div className="flex items-center gap-2 bg-[#f5f7f9] h-11 px-3.5 rounded-xl border-2 border-transparent focus-within:border-[#7a28fa] focus-within:bg-white transition-all">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.2" strokeLinecap="round">
                                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                </svg>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="장소명, 주소 검색"
                                    className="flex-1 bg-transparent text-[14px] font-medium text-[#111] placeholder:text-[#bbb] outline-none"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* [ADD] 카테고리 필터 (가로 스크롤 칩) */}
                    {view === "search" && (
                        <div
                            ref={categoryRef}
                            className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-2.5"
                        >
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`whitespace-nowrap px-3 py-1 rounded-full text-[12px] font-semibold border transition-all flex-shrink-0 ${selectedCategory === cat
                                            ? "bg-[#7a28fa] text-white border-[#7a28fa]"
                                            : "bg-white text-[#555] border-[#e5e5e5] hover:border-[#7a28fa] hover:text-[#7a28fa]"
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="h-[1px] bg-[#f2f4f6]" />
                </div>

                {/* ── 검색 결과 뷰 ── */}
                {view === "search" && (
                    <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center pt-10 gap-2">
                                <div className="w-6 h-6 border-[3px] border-[#7a28fa]/20 border-t-[#7a28fa] rounded-full animate-spin" />
                                <p className="text-[12px] text-[#bbb]">검색 중...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="flex flex-col pt-1">
                                {searchResults.map((place) => (
                                    <div
                                        key={place.id}
                                        onClick={() => { setSelectedPlace(place); setView("detail"); }}
                                        className="flex items-center justify-between py-3 border-b border-[#f5f7f9] last:border-0 cursor-pointer active:bg-[#f9f5ff] rounded-lg px-1 -mx-1 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[14px] font-semibold text-[#111] truncate">
                                                    <HighlightText text={place.name} keyword={searchQuery} />
                                                </span>
                                                <span className="shrink-0 text-[10px] font-bold text-[#7a28fa] bg-[#f4f0fd] px-1.5 py-0.5 rounded">
                                                    {place.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#999] truncate mt-0.5">{place.address}</p>
                                            {place.rating > 0 && (
                                                <span className="text-[10px] font-bold text-[#7a28fa]">★ {place.rating}</span>
                                            )}
                                        </div>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" className="ml-2 flex-shrink-0">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </div>
                                ))}
                            </div>
                        ) : searchQuery.trim() ? (
                            <div className="flex items-center justify-center pt-10 text-[#bbb] text-[13px]">검색 결과가 없습니다.</div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-8 gap-2 text-[#ccc]">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                </svg>
                                <p className="text-[12px]">추가할 장소를 검색하세요</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 장소 상세 + 추가 뷰 ── */}
                {view === "detail" && selectedPlace && (
                    <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide">
                        {/* 장소 정보 */}
                        <div className="bg-[#f9f5ff] rounded-2xl p-4 mt-3 mb-4">
                            <span className="text-[10px] font-bold text-[#7a28fa] bg-white px-2 py-0.5 rounded">
                                {selectedPlace.category}
                            </span>
                            <h3 className="text-[17px] font-bold text-[#111] mt-1.5">{selectedPlace.name}</h3>
                            <p className="text-[12px] text-[#888] mt-0.5">{selectedPlace.address}</p>
                            {selectedPlace.phone && <p className="text-[11px] text-[#aaa] mt-0.5">📞 {selectedPlace.phone}</p>}
                            {selectedPlace.rating > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[11px] font-bold text-[#7a28fa]">★ {selectedPlace.rating}</span>
                                    <span className="text-[11px] text-[#bbb]">({selectedPlace.reviewCount}개)</span>
                                </div>
                            )}
                        </div>

                        {/* 일시 / 메모 */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[12px] font-semibold text-[#666]">📅 일시</label>
                                <input
                                    type="datetime-local"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="h-11 px-3.5 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[13px] font-medium transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[12px] font-semibold text-[#666]">📝 메모 (선택)</label>
                                <input
                                    type="text"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value)}
                                    placeholder="메모를 입력하세요"
                                    className="h-11 px-3.5 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[13px] font-medium placeholder:text-[#ccc] transition-all"
                                />
                            </div>
                        </div>

                        {/* 추가 버튼 */}
                        <button
                            onClick={handleAddPlace}
                            disabled={isAdding || !scheduleDate}
                            className="mt-4 w-full h-12 bg-[#7a28fa] text-white rounded-2xl text-[15px] font-bold
                                       active:scale-[0.98] transition-all disabled:opacity-40
                                       flex items-center justify-center gap-2 shadow-md shadow-[#7a28fa]/20"
                        >
                            {isAdding
                                ? <div className="w-4 h-4 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                                : <>{day}일차 일정에 추가</>
                            }
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
