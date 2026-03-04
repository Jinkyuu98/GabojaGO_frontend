"use client";

import Script from "next/script";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { Toast } from "../../components/common/Toast";
import { searchPlaces } from "../../services/place";
import { getPlaceReviews } from "../../services/review"; // [ADD] 리뷰 API import (평점 계산용)
import PlaceDetailPanel from "../trips/[tripId]/PlaceDetailPanel";

const HighlightText = ({ text = "", keyword = "" }) => {
  if (!text) return null;
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

export default function SearchClient() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const overlayRef = useRef(null);
  const router = useRouter();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    // [ADD] 장소 자동 선택 처리 (select 쿼리 파라미터 기반)
    const selectId = searchParams.get("select");
    if (selectId) {
      const savedData = localStorage.getItem(`place_${selectId}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setSelectedPlace(parsed);
          setIsSidePanelOpen(true);
        } catch (e) {
          console.error("Failed to parse place data for select param", e);
        }
      }
    }

    if (searchParams.get("saved") === "true") {
      setIsToastVisible(true);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("saved");
      newParams.delete("select"); // 정리가 필요할 수 있음
      router.replace(
        `/search${newParams.toString() ? "?" + newParams.toString() : ""}`,
      );
    }
  }, [searchParams]);

  const transformServerData = (data) => {
    if (!data) return [];

    // [MOD] 장소 검색 API의 응답 규격이 {"location_list": [...]} 형태일 수 있으므로 이를 우선 추출
    let items = data.location_list || data;
    if (typeof items === "object" && !Array.isArray(items)) {
      items = Object.values(items);
    }

    return items.map((item) => ({
      id: item.iPK || item.id,
      name: item.strName || item.name || "",
      address: item.strAddress || item.address || "",
      category: item.strGroupName || item.category || "기타",
      groupCode: item.strGroupCode || item.group_code || "기타",
      rating: item.nScore || item.rating || 0, // [FIX] nScore를 rating으로 매핑 (기존에는 item.rating만 참조해 항상 0이었음)
      reviewCount: item.reviewCount || 0,
      longitude: parseFloat(item.ptLongitude || item.longitude || 0),
      latitude: parseFloat(item.ptLatitude || item.latitude || 0),
      link: item.strLink || item.link || "",
      phone: item.strPhone || item.phone || "",
      image:
        item.first_image ||
        item.image_url ||
        item.image ||
        item.thumbnail_url ||
        "",
    }));
  };

  const initMap = () => {
    if (!window.kakao || !mapRef.current) return;

    window.kakao.maps.load(() => {
      if (mapInstance.current) return;

      const center = new window.kakao.maps.LatLng(37.5665, 126.978);
      mapInstance.current = new window.kakao.maps.Map(mapRef.current, {
        center,
        level: 4,
      });
    });
  };

  useEffect(() => {
    if (window.kakao) {
      initMap();
    }
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const targets = selectedPlace ? [selectedPlace] : searchResults;

    targets.forEach((place) => {
      if (!place.latitude || !place.longitude) return;

      const position = new window.kakao.maps.LatLng(
        place.latitude,
        place.longitude,
      );

      const marker = new window.kakao.maps.Marker({ position });
      marker.setMap(map);
      markersRef.current.push(marker);
    });

    if (overlayRef.current) {
      overlayRef.current.setMap(null);
    }

    if (selectedPlace) {
      const position = new window.kakao.maps.LatLng(
        selectedPlace.latitude,
        selectedPlace.longitude,
      );
      const content = `
        <div class="mt-10 bg-black/80 backdrop-blur-md px-2 py-0 rounded-[6px] border border-white/20 shadow-lg">
          <span class="text-white text-[13px] font-medium whitespace-nowrap">
            ${selectedPlace.name}
          </span>
        </div>
      `;

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
      });

      customOverlay.setMap(map);
      overlayRef.current = customOverlay;
      map.setCenter(position);
    }
  }, [searchResults, selectedPlace]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchPlaces(searchQuery);
        const transformedData = transformServerData(response.data);

        // [ADD] 검색 API는 nScore를 반환하지 않으므로, 리뷰 API를 병렬 호출해 평점 계산
        const withRatings = await Promise.all(
          transformedData.map(async (place) => {
            try {
              const reviewRes = await getPlaceReviews(Number(place.id));
              const list = reviewRes?.review_list
                ? (typeof reviewRes.review_list === "string"
                  ? JSON.parse(reviewRes.review_list.replace(/'/g, '"'))
                  : reviewRes.review_list)
                : [];
              const count = list.length;
              const avg = count
                ? parseFloat((list.reduce((s, r) => s + (r.nScore || 0), 0) / count).toFixed(1))
                : 0;
              return { ...place, rating: avg, reviewCount: count };
            } catch {
              return place; // [FIX] 리뷰 조회 실패 시 원본 유지
            }
          })
        );

        setSearchResults(withRatings);
      } catch (error) {
        console.error("Place search failed:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchResults();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <MobileContainer showNav={true} className="!max-w-none">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_API_KEY}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onLoad={initMap}
      />
      <div className="relative w-full h-screen bg-white overflow-hidden lg:flex lg:flex-row">
        <div
          className={clsx(
            "hidden lg:flex flex-col h-full bg-white border-r border-[#f2f4f6] z-20 transition-all duration-300 ease-in-out relative",
            isSidePanelOpen ? "w-[400px] lg:shadow-2xl" : "w-0 border-none",
          )}
        >
          <div
            className={clsx(
              "flex flex-col h-full p-6 w-[400px] transition-opacity duration-200",
              isSidePanelOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            {selectedPlace ? (
              <PlaceDetailPanel
                place={selectedPlace}
                onClose={() => setSelectedPlace(null)}
                onFavoriteSaved={() => setIsToastVisible(true)}
              />
            ) : (
              <>
                <h2 className="text-[22px] font-bold text-[#111111] mb-6 tracking-[-0.5px]">
                  장소 검색
                </h2>

                <div className="flex items-center gap-3 bg-[#f5f7f9] h-14 px-4 rounded-xl border border-[#f2f4f6] transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7a28fa]/20 focus-within:border-[#7a28fa]">
                  <Image
                    src="/icons/search.svg"
                    alt="search"
                    width={20}
                    height={20}
                    className="opacity-50"
                  />
                  <input
                    type="text"
                    placeholder="장소, 숙소, 지하철 역 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-[16px] font-medium text-[#111111] placeholder:text-[#abb1b9] outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-[#abb1b9] p-0.5 hover:text-[#7a28fa] transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {searchQuery.trim() ? (
                  <div className="flex-1 overflow-y-auto mt-6 scrollbar-hide">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center pt-20 text-[#abb1b9]">
                        <p className="text-[14px] font-medium animate-pulse">
                          검색 중...
                        </p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="flex flex-col gap-5 pb-10">
                        {searchResults.map((place) => (
                          <div
                            key={`${place.id}-${place.name}`}
                            onClick={() => {
                              localStorage.setItem(
                                `place_${place.id}`,
                                JSON.stringify(place),
                              );
                              if (window.innerWidth < 1024) {
                                router.push(`/search/place/${place.id}`);
                              } else {
                                setSelectedPlace(place);
                              }
                            }}
                            className="flex flex-col gap-1 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="text-[15px] font-semibold text-[#111111] group-hover:text-[#7a28fa] transition-colors">
                                <HighlightText
                                  text={place.name}
                                  keyword={searchQuery}
                                />
                              </h3>
                              <span className="text-[11px] font-medium text-[#7a28fa] bg-[#f9f5ff] px-2 py-0.5 rounded">
                                {place.category}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <p className="text-[12px] text-[#898989] line-clamp-1">
                                {place.address}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-bold text-[#7a28fa]">
                                  ★ {place.rating}
                                </span>
                                <span className="text-[11px] text-[#abb1b9]">
                                  ({place.reviewCount})
                                </span>
                              </div>
                            </div>
                            <div className="h-[1px] bg-[#f2f4f6] mt-4" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-20 text-[#abb1b9]">
                        <p className="text-[15px] font-medium">
                          검색 결과가 없습니다.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {["음식점", "카페", "편의점", "숙소", "버스"].map(
                        (category) => (
                          <button
                            key={category}
                            className="whitespace-nowrap px-4 py-2 bg-white rounded-full text-[14px] font-semibold text-[#111111] border border-[#DBDBDB] hover:bg-gray-50 active:scale-95 transition-all"
                          >
                            {category}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => {
              setIsSidePanelOpen(!isSidePanelOpen);
              setTimeout(() => {
                if (mapInstance.current) {
                  mapInstance.current.relayout();
                  if (selectedPlace) {
                    const moveLatLon = new window.kakao.maps.LatLng(
                      selectedPlace.latitude,
                      selectedPlace.longitude,
                    );
                    mapInstance.current.setCenter(moveLatLon);
                  }
                }
              }, 300);
            }}
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 -right-4 w-8 h-12 bg-white border border-[#f2f4f6] rounded-xl shadow-md z-30 flex items-center justify-center hover:bg-gray-50 transition-all",
              !isSidePanelOpen && "!-right-10 rounded-xl",
            )}
          >
            <Image
              src="/icons/arrow-left.svg"
              alt="toggle"
              width={16}
              height={16}
              className={clsx(
                "transition-transform duration-300",
                !isSidePanelOpen && "rotate-180",
              )}
            />
          </button>
        </div>



        <div className="relative flex-1 h-full overflow-hidden">
          <div className="absolute inset-0 w-full h-full">
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />
          </div>

          <div className="lg:hidden absolute top-0 left-0 right-0 px-5 pt-6 pb-4 z-20">
            <div
              className="flex items-center gap-3 bg-white h-14 px-4 rounded-xl border border-[#111111] cursor-pointer shadow-md"
              onClick={() => router.push("/search/input")}
            >
              <Image
                src="/icons/search.svg"
                alt="search"
                width={20}
                height={20}
                className="opacity-100"
              />
              <div className="flex-1 text-[16px] font-medium text-[#abb1b9]">
                장소, 숙소, 지하철 역 검색
              </div>
            </div>

            <div className="mt-3 flex overflow-x-auto gap-1 scrollbar-hide pb-2 px-5 -mx-5 text-black">
              {["음식점", "카페", "편의점", "숙소", "버스"].map((category) => (
                <button
                  key={category}
                  className="whitespace-nowrap px-3 py-1.5 bg-white rounded-full text-[14px] font-medium text-[#111111] transition-all shadow-md"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Toast
          isVisible={isToastVisible}
          onClose={() => setIsToastVisible(false)}
          message="찜한 장소로 등록되었어요"
          actionText="목록보기"
          onAction={() => router.push("/profile")}
          position={selectedPlace ? "top" : "bottom"}
        />

        <BottomNavigation />
      </div>
    </MobileContainer >
  );
}
