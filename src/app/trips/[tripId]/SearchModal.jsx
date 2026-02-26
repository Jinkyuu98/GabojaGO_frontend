"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { searchPlaces } from "../../../services/place";
import { addScheduleLocation } from "../../../services/schedule";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markerRef = useRef(null);
    const inputRef = useRef(null);

    // Initialize Map
    useEffect(() => {
        if (isOpen && window.kakao && mapRef.current && !mapInstance.current) {
            window.kakao.maps.load(() => {
                const options = {
                    center: new window.kakao.maps.LatLng(37.5665, 126.978),
                    level: 3,
                };
                const map = new window.kakao.maps.Map(mapRef.current, options);
                mapInstance.current = map;
            });
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
            if (markerRef.current) markerRef.current.setMap(null);
            markerRef.current = null;
        }
    }, [isOpen]);

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
                const items = response.data || [];
                const transformed = Object.values(items).slice(0, 15).map((item) => ({
                    id: item.iPK,
                    name: item.strName,
                    address: item.strAddress,
                    category: item.strGroupName || "기타",
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
            await addScheduleLocation({
                iPK: 0,
                iScheduleFK: parseInt(tripId),
                iLocationFK: selectedPlace.id,
                dtSchedule: formattedDate,
                strMemo: ""
            });
            onAddSuccess();
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-white w-[1240px] h-[820px] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="px-8 py-5 border-b border-[#f2f4f6] flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#7a28fa]/10 rounded-xl flex items-center justify-center">
                            <Image src="/icons/search.svg" alt="search" width={20} height={20} className="invert-[35%] sepia-[80%] saturate-[5000%] hue-rotate-[250deg]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#111111] leading-tight">장소 등록</h2>
                            <p className="text-sm text-[#898989] font-medium">{day}일차 일정에 추가할 장소를 검색하세요</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-full transition-all group">
                        <Image src="/icons/close.svg" alt="close" width={28} height={28} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left: Search Area */}
                    <div className="w-[420px] border-r border-[#f2f4f6] flex flex-col bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[5]">
                        <div className="p-6">
                            <div className="flex items-center gap-3 bg-[#f5f7f9] h-14 px-5 rounded-2xl border-2 border-transparent focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7a28fa]/10 focus-within:border-[#7a28fa] transition-all">
                                <Image src="/icons/search.svg" alt="search" width={20} height={20} className="opacity-40" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="장소명, 주소 검색"
                                    className="flex-1 bg-transparent text-[16px] font-semibold text-[#111111] placeholder:text-[#abb1b9] outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center pt-20 gap-4">
                                    <div className="w-8 h-8 border-4 border-[#7a28fa]/20 border-t-[#7a28fa] rounded-full animate-spin" />
                                    <p className="text-[#abb1b9] text-sm font-medium">장소를 찾는 중입니다...</p>
                                </div>
                            ) : searchQuery.trim() && searchResults.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {searchResults.map((place) => (
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
                                                    <HighlightText text={place.name} keyword={searchQuery} />
                                                </h4>
                                                <span className="shrink-0 text-[11px] font-bold text-[#7a28fa] bg-[#7a28fa]/10 px-2 py-1 rounded-lg">
                                                    {place.category}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-[#6e6e6e] line-clamp-2 leading-relaxed">{place.address}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : searchQuery.trim() ? (
                                <div className="flex flex-col items-center justify-center pt-20 text-[#abb1b9] text-sm font-medium opacity-60">
                                    <p>검색 결과가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-20">
                                    <Image src="/icons/search.svg" alt="search" width={64} height={64} className="mb-4" />
                                    <p className="text-lg font-medium">어디로 떠나시나요?</p>
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
                            <div className="absolute bottom-10 left-10 right-10 bg-white/90 backdrop-blur-xl p-8 rounded-[32px] shadow-[0_24px_48px_rgba(0,0,0,0.12)] border border-white flex items-end justify-between animate-in slide-in-from-bottom-5 duration-500 z-10">
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
                        )}

                        {!selectedPlace && !isLoading && (
                            <div className="absolute top-10 left-10 bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-lg border border-white/50 z-10 animate-in fade-in slide-in-from-left-4 duration-700">
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
