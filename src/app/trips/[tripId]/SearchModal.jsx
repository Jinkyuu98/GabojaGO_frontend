"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { searchPlaces, registerPlace } from "../../../services/place";
import { addScheduleLocation } from "../../../services/schedule";
import { getFavoriteList, getFavoriteLocationList } from "../../../services/favorite";
import { clsx } from "clsx";

const CATEGORIES = ["전체", "음식점", "카페", "편의점", "관광명소", "문화시설", "숙박", "지하철역", "주차장", "주유소", "대형마트"];
const CATEGORY_MAP = {
    음식점: "FD6",
    카페: "CE7",
    편의점: "CS2",
    대형마트: "MT1",
    관광명소: "AT4",
    숙박: "AD5",
    문화시설: "CT1",
    지하철역: "SW8",
    주차장: "PK6",
    주유소: "OL7",
};

const HighlightText = ({ text, keyword }) => {
    if (!keyword.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${keyword})`, "gi"));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === keyword.toLowerCase() ? (
                    <span key={i} className="text-[#7a28fa]">
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </span>
    );
};

export default function SearchModal({ isOpen, onClose, tripId, day, formattedDate, onAddSuccess }) {
    const [activeTab, setActiveTab] = useState("search"); // [ADD] "search" | "favorites"
    
    // 검색 관련
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // [ADD] 즐겨찾기 관련 상태
    const [favoriteGroups, setFavoriteGroups] = useState([]);
    const [selectedGroupPK, setSelectedGroupPK] = useState(null);
    const [favoritePlaces, setFavoritePlaces] = useState([]);
    const [isFavLoading, setIsFavLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("전체");

    // [ADD] 카테고리 스크롤 관련 Ref 및 상태
    const categoryScrollRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // [ADD] 스크롤 상태 체크 함수
    const checkScroll = () => {
        if (categoryScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [activeTab]);

    // [ADD] 드래그 이벤트 핸들러
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - categoryScrollRef.current.offsetLeft);
        setScrollLeft(categoryScrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - categoryScrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        categoryScrollRef.current.scrollLeft = scrollLeft - walk;
        checkScroll();
    };

    const scroll = (direction) => {
        if (categoryScrollRef.current) {
            const scrollAmount = 200;
            categoryScrollRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
            setTimeout(checkScroll, 300);
        }
    }; // [ADD] 카테고리 필터 상태

    // 장소 선택 및 상세 입력
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [scheduleDate, setScheduleDate] = useState("");
    const [memo, setMemo] = useState("");

    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markerRef = useRef(null);
    const inputRef = useRef(null);

    // [FIX] Initialize Map - SDK가 이미 완전히 로드된 경우와 아닌 경우를 분기하여 지도 생성
    useEffect(() => {
        if (isOpen && window.kakao && mapRef.current && !mapInstance.current) {
            const createMap = () => {
                if (!mapRef.current || mapInstance.current) return;
                const options = {
                    center: new window.kakao.maps.LatLng(37.5665, 126.978),
                    level: 3,
                };
                const map = new window.kakao.maps.Map(mapRef.current, options);
                mapInstance.current = map;
            };

            // [FIX] SDK가 이미 완전 로드된 경우 (Map 생성자가 존재) → 직접 생성
            // autoload=false로 로드 후 이미 load() 완료된 상태에서는 다시 load()를 호출해도 콜백이 실행되지 않을 수 있음
            if (window.kakao.maps?.Map) {
                createMap();
            } else {
                window.kakao.maps.load(createMap);
            }
        }

        if (isOpen && mapInstance.current) {
            setTimeout(() => {
                mapInstance.current.relayout();
            }, 300);
        }

        if (!isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setSelectedPlace(null);
            setScheduleDate("");
            setMemo("");
            setActiveTab("search");
            setSelectedCategory("전체"); // [ADD] 닫힐 때 카테고리 초기화
            if (markerRef.current) markerRef.current.setMap(null);
            markerRef.current = null;
            // [FIX] 모달 닫힐 때 mapInstance 초기화하여 다음 열림 시 새로 생성되도록 보장
            mapInstance.current = null;
        }
    }, [isOpen]);

    // [ADD] 모달 열릴 때 즐겨찾기 그룹 목록 가져오기
    useEffect(() => {
        if (isOpen && favoriteGroups.length === 0) {
            const fetchGroups = async () => {
                try {
                    const res = await getFavoriteList();
                    if (res.data?.favorite_list) {
                        setFavoriteGroups(res.data.favorite_list);
                        if (res.data.favorite_list.length > 0 && !selectedGroupPK) {
                            setSelectedGroupPK(res.data.favorite_list[0].iPK);
                        }
                    }
                } catch (e) {
                    console.error("즐겨찾기 그룹 조회 실패:", e);
                }
            };
            fetchGroups();
        }
    }, [isOpen, favoriteGroups.length]);

    // [ADD] 선택된 즐겨찾기 그룹의 장소 목록 조회
    useEffect(() => {
        if (isOpen && activeTab === "favorites" && selectedGroupPK) {
            const fetchFavPlaces = async () => {
                setIsFavLoading(true);
                try {
                    const res = await getFavoriteLocationList(selectedGroupPK);
                    if (res.data?.location_list) {
                        // API 응답 구조에 따라 데이터 가공
                        const rawData = Array.isArray(res.data.location_list) 
                            ? res.data.location_list 
                            : [res.data.location_list];
                        
                        const mapped = rawData.map(item => {
                            const loc = item.location;
                            return {
                                id: loc.iPK,
                                name: loc.strName,
                                address: loc.strAddress,
                                category: loc.strGroupName || "기타",
                                groupCode: loc.strGroupCode || "",
                                latitude: parseFloat(loc.ptLatitude),
                                longitude: parseFloat(loc.ptLongitude),
                                phone: loc.strPhone,
                                link: loc.strLink,
                            };
                        });
                        setFavoritePlaces(mapped);
                    } else {
                        setFavoritePlaces([]);
                    }
                } catch (e) {
                    console.error("즐겨찾기 장소 조회 실패:", e);
                    setFavoritePlaces([]);
                } finally {
                    setIsFavLoading(false);
                }
            };
            fetchFavPlaces();
        }
    }, [activeTab, selectedGroupPK, isOpen]);

    // [ADD] 검색 결과 카테고리 필터링
    const filteredSearchResults = React.useMemo(() => {
        if (selectedCategory === "전체") return searchResults;
        return searchResults.filter((place) => {
            const code = place.groupCode;
            if (selectedCategory === "기타") {
                return !Object.values(CATEGORY_MAP).includes(code);
            }
            return code === CATEGORY_MAP[selectedCategory];
        });
    }, [searchResults, selectedCategory]);

    // [ADD] 카테고리 필터링 로직 (마이페이지와 동일)
    const filteredFavoritePlaces = React.useMemo(() => {
        if (selectedCategory === "전체") return favoritePlaces;
        return favoritePlaces.filter((place) => {
            const code = place.groupCode;
            if (selectedCategory === "기타") {
                return !Object.values(CATEGORY_MAP).includes(code);
            }
            return code === CATEGORY_MAP[selectedCategory];
        });
    }, [favoritePlaces, selectedCategory]);

    // Focus input on open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle place selection and map update
    useEffect(() => {
        if (selectedPlace && mapInstance.current && window.kakao) {
            const map = mapInstance.current;
            const position = new window.kakao.maps.LatLng(selectedPlace.latitude, selectedPlace.longitude);

            // Update layout once more to be sure center is accurate
            map.relayout();

            // Give a small delay for relayout to apply before centering
            setTimeout(() => {
                // Remove existing marker
                if (markerRef.current) {
                    markerRef.current.setMap(null);
                }

                // Create new marker
                const marker = new window.kakao.maps.Marker({
                    position: position,
                    map: map
                });

                markerRef.current = marker;

                // Set center with a slight offset to the south so the marker appears higher (north)
                // This prevents the bottom info card from making it feel crowded
                const offsetLat = selectedPlace.latitude - 0.0010; // Adjust this value to set the "upward" shift
                const centerPosition = new window.kakao.maps.LatLng(offsetLat, selectedPlace.longitude);

                map.setCenter(centerPosition);
                map.setLevel(3);
            }, 50);
        }
    }, [selectedPlace]);

    // [ADD] 장소 선택 시 기본 일시를 해당 일차 날짜로 설정
    useEffect(() => {
        if (selectedPlace && formattedDate) {
            setScheduleDate(formattedDate.replace(" ", "T").substring(0, 16));
        }
    }, [selectedPlace, formattedDate]);

    // Search Logic
    useEffect(() => {
        const fetchResults = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await searchPlaces(searchQuery);

                // [MOD] 장소 검색 API의 응답 규격이 {"location_list": [...]} 형태일 수 있으므로 이를 우선 추출
                const data = response.data || {};
                let items = data.location_list || data;
                if (typeof items === "object" && !Array.isArray(items)) {
                    items = Object.values(items);
                }

                const transformed = items.slice(0, 15).map((item) => ({
                    id: item.iPK,
                    name: item.strName,
                    address: item.strAddress,
                    category: item.strGroupName || "기타",
                    groupCode: item.strGroupCode || "",
                    latitude: parseFloat(item.ptLatitude),
                    longitude: parseFloat(item.ptLongitude),
                    phone: item.strPhone,
                    link: item.strLink,
                }));
                setSearchResults(transformed);
            } catch (error) {
                console.error("Search failed:", error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleAddPlace = async () => {
        if (!selectedPlace || isAdding) return;
        setIsAdding(true);
        try {
            // [ADD] 장소를 먼저 백엔드 DB에 등록 (이미 등록된 경우에도 안전)
            try {
                await registerPlace({
                    iPK: selectedPlace.id,
                    strName: selectedPlace.name,
                    strAddress: selectedPlace.address,
                    strGroupName: selectedPlace.category || "",
                    strGroupCode: "",
                    strGroupDetail: "",
                    strPhone: selectedPlace.phone || "",
                    strLink: selectedPlace.link || "",
                    chCategory: "",
                    ptLatitude: String(selectedPlace.latitude),
                    ptLongitude: String(selectedPlace.longitude),
                });
            } catch (e) {
                console.error("registerPlace 실패 (이미 등록된 장소일 수 있음):", e);
            }

            // [MOD] 사용자가 입력한 일시/메모를 사용하여 장소 등록
            await addScheduleLocation({
                iPK: 0,
                iScheduleFK: parseInt(tripId),
                iLocationFK: selectedPlace.id,
                dtSchedule: scheduleDate.replace("T", " ") + ":00",
                strMemo: memo
            });
            // [MOD] 추가된 장소 정보를 콜백으로 전달하여 리로드 없이 즉시 반영
            onAddSuccess({
                place: selectedPlace,
                dtSchedule: scheduleDate.replace("T", " ") + ":00",
                strMemo: memo
            });
            onClose();
        } catch (error) {
            console.error("Failed to add place:", error);
            alert("장소 추가에 실패했습니다.");
        } finally {
            setIsAdding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white w-[90vw] max-w-[1240px] h-[90vh] max-h-[820px] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-5 border-b border-[#f2f4f6] flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-4">

                        <div>
                            <h2 className="text-xl font-bold text-[#111111] leading-tight">장소 등록</h2>
                            <p className="pt-1 text-md text-[#898989] font-medium">{day}일차 일정에 추가할 장소를 검색하세요</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-full transition-all group">
                        <Image src="/icons/close-icon.svg" alt="close" width={16} height={16} className="group-hover:rotate-90 transition-transform duration-300 w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Search Area */}
                    <div className="w-[420px] border-r border-[#f2f4f6] flex flex-col bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[5]">
                        {/* [ADD] 탭 영역 */}
                        <div className="flex px-6 border-b border-[#f2f4f6]">
                            <button
                                onClick={() => setActiveTab("search")}
                                className={clsx(
                                    "flex-1 py-4 text-[15px] font-bold transition-all relative",
                                    activeTab === "search" ? "text-[#7a28fa]" : "text-[#abb1b9]"
                                )}
                            >
                                장소 검색
                                {activeTab === "search" && (
                                    <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#7a28fa]" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab("favorites")}
                                className={clsx(
                                    "flex-1 py-4 text-[15px] font-bold transition-all relative",
                                    activeTab === "favorites" ? "text-[#7a28fa]" : "text-[#abb1b9]"
                                )}
                            >
                                찜한 장소
                                {activeTab === "favorites" && (
                                    <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#7a28fa]" />
                                )}
                            </button>
                        </div>

                        {/* [MOD] 모든 탭에서 카테고리 필터 노출 */}
                        <div className="p-6 pb-4">
                            {activeTab === "search" && (
                                <div className="flex items-center gap-3 bg-[#f5f7f9] h-14 px-5 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7a28fa]/10 focus-within:border-[#7a28fa] transition-all mb-4">
                                    <Image src="/icons/search.svg" alt="search" width={20} height={20} className="opacity-40" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="장소명, 주소 검색"
                                        className="flex-1 bg-transparent text-[16px] font-medium text-[#111111] placeholder:text-[#abb1b9] outline-none"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                {activeTab === "favorites" && (
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                                        {favoriteGroups.map((group) => (
                                            <button
                                                key={group.iPK}
                                                onClick={() => setSelectedGroupPK(group.iPK)}
                                                className={clsx(
                                                    "whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-bold border-2 transition-all",
                                                    selectedGroupPK === group.iPK
                                                        ? "bg-[#7a28fa] text-white border-[#7a28fa] shadow-md shadow-[#7a28fa]/20"
                                                        : "bg-white text-[#555555] border-[#f2f4f6] hover:bg-gray-50"
                                                )}
                                            >
                                                {group.strName}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="relative group/nav">
                                    {showLeftArrow && (
                                        <button
                                            onClick={() => scroll("left")}
                                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 border border-[#f2f4f6] rounded-full shadow-sm text-[#7a28fa] hover:bg-white transition-all shadow-lg"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="15 18 9 12 15 6"></polyline>
                                            </svg>
                                        </button>
                                    )}
                                    <div
                                        ref={categoryScrollRef}
                                        onScroll={checkScroll}
                                        onMouseDown={handleMouseDown}
                                        onMouseLeave={handleMouseLeave}
                                        onMouseUp={handleMouseUp}
                                        onMouseMove={handleMouseMove}
                                        className={clsx(
                                            "flex gap-1.5 overflow-x-auto scrollbar-hide py-1 cursor-grab active:cursor-grabbing select-none",
                                            activeTab === "favorites" && "border-t border-[#f2f4f6] pt-3 mt-1"
                                        )}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={clsx(
                                                    "whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all shrink-0",
                                                    selectedCategory === cat
                                                        ? "bg-[#7a28fa] text-white border-[#7a28fa]"
                                                        : "bg-white text-[#898989] border-[#f2f4f6] hover:border-[#7a28fa] hover:text-[#7a28fa]"
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    {showRightArrow && (
                                        <button
                                            onClick={() => scroll("right")}
                                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 border border-[#f2f4f6] rounded-full shadow-sm text-[#7a28fa] hover:bg-white transition-all shadow-lg"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                            {(activeTab === "search" ? isLoading : isFavLoading) ? (
                                <div className="flex flex-col items-center justify-center pt-20 gap-4">
                                    <div className="w-8 h-8 border-4 border-[#7a28fa]/20 border-t-[#7a28fa] rounded-full animate-spin" />
                                    <p className="text-[#abb1b9] text-sm font-medium">데이터를 불러오는 중입니다...</p>
                                </div>
                            ) : (activeTab === "search" ? filteredSearchResults : filteredFavoritePlaces).length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {(activeTab === "search" ? filteredSearchResults : filteredFavoritePlaces).map((place) => (
                                        <div
                                            key={place.id}
                                            onClick={() => setSelectedPlace(place)}
                                            className={`p-4 rounded-2xl cursor-pointer transition-all border-2 flex flex-col gap-1 ${selectedPlace?.id === place.id
                                                ? "bg-[#f9f5ff] border-[#7a28fa] shadow-sm"
                                                : "bg-white border-transparent hover:bg-gray-50 hover:border-[#f2f4f6]"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-[16px] font-bold text-[#111111] leading-snug">
                                                    {activeTab === "search" ? (
                                                        <HighlightText text={place.name} keyword={searchQuery} />
                                                    ) : (
                                                        place.name
                                                    )}
                                                </h4>
                                                <span className="shrink-0 text-[11px] font-bold text-[#7a28fa] bg-[#7a28fa]/10 px-2 py-1 rounded-lg">
                                                    {place.category}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-[#6e6e6e] line-clamp-2 leading-relaxed">{place.address}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (activeTab === "search" && searchQuery.trim()) || (activeTab === "favorites" && selectedGroupPK) ? (
                                <div className="flex flex-col items-center justify-center pt-20 text-[#abb1b9] text-sm font-medium opacity-60">
                                    <p>{activeTab === "search" ? "검색 결과가 없습니다." : "이 그룹에 찜한 장소가 없습니다."}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-20">
                                    <p className="text-md font-medium">
                                        {activeTab === "search" ? "찾고 싶으신 장소를 검색해 보세요!" : "찜한 장소를 선택해 보세요!"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Map Area */}
                    <div className="flex-1 relative bg-[#f5f7f9]">
                        {/* Map Container */}
                        <div ref={mapRef} className="w-full h-full" />

                        {/* Overlay Info Card */}
                        {selectedPlace && (
                            <div className="absolute bottom-10 left-10 right-10 bg-white/90 backdrop-blur-xl p-8 rounded-[32px] shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-white flex flex-col animate-in slide-in-from-bottom-5 duration-500 z-10">
                                <div className="flex items-end justify-between">
                                    <div className="flex-1 max-w-[60%]">
                                        <span className="text-[14px] font-bold text-[#7a28fa] mb-3 block">{selectedPlace.category}</span>
                                        <h3 className="text-[28px] font-semibold text-[#111111] mb-3 truncate leading-tight">{selectedPlace.name}</h3>
                                        <div className="flex flex-col gap-2">
                                            <p className="text-[#6e6e6e] text-[16px] font-medium flex items-center gap-2">
                                                <span className="opacity-50 text-xl">📍</span> {selectedPlace.address}
                                            </p>
                                            {selectedPlace.phone && (
                                                <p className="text-[#898989] text-[15px] flex items-center gap-2">
                                                    <span className="opacity-50 text-xl">📞</span> {selectedPlace.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 min-w-[220px]">
                                        {selectedPlace.link && (
                                            <a
                                                href={selectedPlace.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-14 border-2 border-[#111111] text-[#111111] rounded-2xl flex items-center justify-center font-medium text-base hover:bg-gray-50 transition-all"
                                            >
                                                상세 정보 보기
                                            </a>
                                        )}
                                        <button
                                            onClick={handleAddPlace}
                                            disabled={isAdding}
                                            className="h-16 bg-[#111111] text-white rounded-2xl text-md font-medium hover:bg-[#333333] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-black/10 flex items-center justify-center gap-3"
                                        >
                                            {isAdding ? (
                                                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                "일정에 추가"
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* [ADD] 일시/메모 입력 영역 - 사용자가 직접 일자와 메모를 입력 */}
                                <div className="flex gap-4 mt-5 pt-5 border-t border-[#f2f4f6] w-full">
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[13px] font-semibold text-[#6e6e6e]">📅 일시</label>
                                        <input
                                            type="datetime-local"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1">
                                        <label className="text-[13px] font-semibold text-[#6e6e6e]">📝 메모</label>
                                        <input
                                            type="text"
                                            value={memo}
                                            onChange={(e) => setMemo(e.target.value)}
                                            placeholder="메모를 입력하세요"
                                            className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium placeholder:text-[#abb1b9] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!selectedPlace && !isLoading && (
                            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-lg border border-white/50 z-10 animate-in fade-in slide-in-from-left-4 duration-700">
                                <p className="text-[#111111] font-bold text-base flex items-center gap-2">
                                    <span className="text-xl">🗺️</span> 왼쪽 목록에서 장소를 선택해 위치를 확인하세요
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
