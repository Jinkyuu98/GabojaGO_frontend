"use client";

import Script from "next/script";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { Toast } from "../../components/common/Toast";
import { searchPlaces, registerPlace } from "../../services/place";

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
    const items =
      typeof data === "object" && !Array.isArray(data)
        ? Object.values(data)
        : data;

    return items.map((item) => ({
      id: item.iPK || item.id,
      name: item.strName || item.name || "",
      address: item.strAddress || item.address || "",
      category: item.strGroupName || item.category || "기타",
      groupCode: item.strGroupCode || item.group_code || "기타",
      rating: item.rating || 0,
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
        setSearchResults(transformedData);
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
        src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=57dd33d25e0269c9c37a3ea70b3a3b4f&autoload=false&libraries=services"
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
              <div className="flex flex-col h-full overflow-y-auto scrollbar-hide pt-2">
                <div className="sticky top-0 bg-white z-10 flex items-center mb-6 pb-2">
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <Image
                      src="/icons/arrow-left.svg"
                      alt="back"
                      width={20}
                      height={16}
                      className="w-5 h-4"
                    />
                  </button>
                  <h2 className="ml-4 text-[18px] font-bold text-[#111111]">
                    장소 상세
                  </h2>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex">
                        <span className="text-[12px] font-semibold text-[#7a28fa] bg-[#f9f5ff] px-2 py-0.5 rounded">
                          {selectedPlace.category}
                        </span>
                      </div>
                      <h1 className="text-[24px] font-bold text-[#111111] tracking-[-1px]">
                        {selectedPlace.name}
                      </h1>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      <p className="text-[14px] text-[#6e6e6e] leading-relaxed">
                        {selectedPlace.address}
                      </p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {selectedPlace.phone && (
                          <p className="text-[13px] text-[#6e6e6e] flex items-center gap-1">
                            📞{" "}
                            <a
                              href={`tel:${selectedPlace.phone}`}
                              className="hover:underline"
                            >
                              {selectedPlace.phone}
                            </a>
                          </p>
                        )}
                        {selectedPlace.link && (
                          <p className="text-[13px] text-[#6e6e6e] flex items-center gap-1 overflow-hidden">
                            🔗{" "}
                            <a
                              href={selectedPlace.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-[#7a28fa] truncate"
                            >
                              {selectedPlace.link}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-col gap-1">
                    <button
                      onClick={async () => {
                        try {
                          // [ADD] 장소 등록 API 호출 (기존 유지)
                          try {
                            await registerPlace({
                              id: selectedPlace.id,
                              name: selectedPlace.name,
                              address: selectedPlace.address,
                              category: selectedPlace.category,
                              groupCode: selectedPlace.groupCode,
                              latitude: selectedPlace.latitude,
                              longitude: selectedPlace.longitude,
                              phone: selectedPlace.phone,
                              link: selectedPlace.link,
                            });
                          } catch (e) {
                            console.error(
                              "API registration failed, falling back to local storage only:",
                              e,
                            );
                          }

                          // [ADD] 로컬 스토리지에도 저장하여 즉시 확인 가능하도록 처리
                          const savedList = JSON.parse(
                            localStorage.getItem("saved_places") || "[]",
                          );
                          if (
                            !savedList.find((p) => p.id === selectedPlace.id)
                          ) {
                            savedList.push(selectedPlace);
                            localStorage.setItem(
                              "saved_places",
                              JSON.stringify(savedList),
                            );
                          }

                          setSelectedPlace(null);
                          setSearchQuery("");
                          setIsToastVisible(true);
                        } catch (error) {
                          console.error("Failed to register place:", error);
                          // 에러 처리 로직 (필요시 추가 토스트 등)
                        }
                      }}
                      className="w-full h-[56px] bg-[#111111] text-white rounded-2xl text-[16px] font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      찜한 장소로 등록하기
                    </button>
                  </div>

                  <div className="h-[1px] bg-[#f2f4f6] mt-2" />

                  <section>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[16px] font-bold text-[#111111]">
                        리뷰{" "}
                        <span className="text-[#abb1b9] font-medium ml-1">
                          {selectedPlace.reviewCount}
                        </span>
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[#7a28fa] text-[14px]">★</span>
                        <span className="text-[16px] font-bold text-[#7a28fa]">
                          {selectedPlace?.rating}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      {[
                        {
                          user: "김여행",
                          rating: 5,
                          content:
                            "부모님 모시고 갔는데 정말 좋아하셨어요! 물이 정말 깨끗하고 시설도 훌륭합니다.",
                        },
                        {
                          user: "이제주",
                          rating: 4,
                          content:
                            "경치가 너무 예뻐요. 다음에 제주도 오면 또 올 거예요!",
                        },
                        {
                          user: "박온천",
                          rating: 5,
                          content:
                            "인생 온천을 만났습니다. 시설이 깨끗해서 너무 좋았어요.",
                        },
                      ].map((review, i) => (
                        <div key={i} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold text-[#111111]">
                              {review.user}
                            </span>
                            <div className="flex text-[#7a28fa] text-[10px]">
                              {"★".repeat(review.rating)}
                            </div>
                          </div>
                          <p className="text-[13px] text-[#6e6e6e] leading-snug">
                            {review.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
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
    </MobileContainer>
  );
}
