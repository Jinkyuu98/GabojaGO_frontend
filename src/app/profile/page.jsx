"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreVertical, ChevronDown, Heart } from "lucide-react"; // [MOD] Heart 추가
import { MobileContainer } from "../../components/layout/MobileContainer";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { Toast } from "../../components/common/Toast"; // [ADD] Toast 임포트
import { clsx } from "clsx";
import {
  getSavedPlaces,
  unregisterPlace,
  registerPlace,
} from "../../services/place";
import { useEffect, useRef } from "react";
import Script from "next/script";

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

export default function MyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("장소"); // "장소" 또는 "사진"
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // [ADD] 더보기 설정 팝업 상태
  const [savedPlaces, setSavedPlaces] = useState([]); // [ADD] 실제 등록된 장소 데이터를 위한 상태 추가
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState("latest"); // [ADD] 정렬 상태 (latest, reviews, oldest)
  const [selectedCategory, setSelectedCategory] = useState("전체"); // [ADD] 카테고리 필터 상태
  const [isSortOpen, setIsSortOpen] = useState(false); // [ADD] 정렬 옵션 드롭다운 상태
  const [locationFilter, setLocationFilter] = useState("map_center"); // [ADD] 위치 기준 필터 (map_center, my_location)
  const [isLocationOpen, setIsLocationOpen] = useState(false); // [ADD] 위치 기준 드롭다운 상태

  // [ADD] Toast 및 되돌리기 기능용 상태
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastPlace, setToastPlace] = useState(null);
  const [unSavedPlaceIds, setUnSavedPlaceIds] = useState([]); // [ADD] 페이지 이탈 전까지 요소 유지를 위한 해제된 장소 ID 배열

  // [ADD] PC 전용 모달 상태
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState(null);
  const modalMapRef = useRef(null);
  const modalMapInstance = useRef(null);

  const user = {
    name: "홍길동님",
    reviewCount: 12,
    profileImage: "/icons/profile.svg", // Using existing profile icon as placeholder
  };

  const tabs = [
    { id: "장소", label: "찜/등록된 장소" },
    { id: "사진", label: "찜한 사진" },
  ];

  useEffect(() => {
    if (activeTab === "장소") {
      const fetchSavedPlaces = async () => {
        setIsLoading(true);
        try {
          // 1. 로컬 스토리지에서 먼저 가져오기
          const localData = JSON.parse(
            localStorage.getItem("saved_places") || "[]",
          );

          // 2. API에서도 가져오기
          let apiData = [];
          try {
            const response = await getSavedPlaces();
            if (response.data) {
              const rawData = response.data;
              apiData = Array.isArray(rawData)
                ? rawData
                : typeof rawData === "object"
                  ? Object.values(rawData)
                  : [];

              apiData = apiData.map((item) => ({
                id: item.id,
                name: item.name,
                address: item.address,
                category: item.strGroupName || item.category || "기타",
                groupCode: item.strGroupCode || item.group_code || "기타",
                latitude: parseFloat(item.latitude),
                longitude: parseFloat(item.longitude),
                rating: item.rating || 0,
                reviewCount: item.review_count || item.reviewCount || 0,
              }));
            }
          } catch (e) {
            console.error("API fetch failed, using local data only:", e);
          }

          // 3. 중복 제거 후 합치기 (ID 기준)
          const merged = [...localData];
          apiData.forEach((item) => {
            if (!merged.find((m) => String(m.id) === String(item.id))) {
              merged.push(item);
            }
          });

          // [ADD] 정렬 로직 적용
          const sorted = [...merged].sort((a, b) => {
            if (sortBy === "reviews") {
              return (b.reviewCount || 0) - (a.reviewCount || 0);
            } else if (sortBy === "oldest") {
              // ID가 커지는 순서 (등록순 가정)
              return parseInt(a.id) - parseInt(b.id);
            } else {
              // latest: ID가 작아지는 순서 (최신등록 가정)
              return parseInt(b.id) - parseInt(a.id);
            }
          });

          setSavedPlaces(sorted);
        } catch (error) {
          console.error("Failed to fetch saved places:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSavedPlaces();
    }
  }, [activeTab, sortBy]);

  const savedPhotos = [{ id: 6, src: "/images/trip-photo-3.png" }];

  // [MOD] 카테고리 필터링 적용 (strGroupCode 기준)
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === "전체") return savedPlaces;

    return savedPlaces.filter((place) => {
      const code = place.groupCode;
      if (selectedCategory === "기타") {
        return !Object.values(CATEGORY_MAP).includes(code);
      }
      return code === CATEGORY_MAP[selectedCategory];
    });
  }, [savedPlaces, selectedCategory]);

  useEffect(() => {
    if (selectedPlaceForModal && window.kakao) {
      window.kakao.maps.load(() => {
        const position = new window.kakao.maps.LatLng(
          selectedPlaceForModal.latitude,
          selectedPlaceForModal.longitude,
        );

        if (!modalMapInstance.current) {
          modalMapInstance.current = new window.kakao.maps.Map(
            modalMapRef.current,
            {
              center: position,
              level: 3,
            },
          );

          // 마커 추가
          const marker = new window.kakao.maps.Marker({ position });
          marker.setMap(modalMapInstance.current);
        } else {
          modalMapInstance.current.setCenter(position);
          modalMapInstance.current.relayout();
        }
      });
    } else {
      modalMapInstance.current = null;
    }
  }, [selectedPlaceForModal]);

  // [MOD] 찜 해제/재등록(리스트에서 즉시 삭제하지 않고 하트 상태만 변경) API 연동 포함
  const toggleSavedPlace = async (e, place) => {
    e.stopPropagation(); // 카드 클릭 이벤트(상세보기 이동 등) 방지

    const payload = {
      iPK: place.id,
      strName: place.name,
      strAddress: place.address,
      strGroupName: place.category,
      strGroupCode: place.groupCode,
      ptLongitude: place.longitude,
      ptLatitude: place.latitude,
      // 기타 필요값
    };

    if (unSavedPlaceIds.includes(place.id)) {
      // 이미 해제된 상태에서 클릭 -> 찜 재등록 (하트 다시 채움)
      try {
        await registerPlace(payload);

        setUnSavedPlaceIds((prev) => prev.filter((id) => id !== place.id));

        const localData = JSON.parse(
          localStorage.getItem("saved_places") || "[]",
        );
        if (!localData.find((p) => p.id === place.id)) {
          localData.push(place);
          localStorage.setItem("saved_places", JSON.stringify(localData));
        }

        if (toastPlace?.id === place.id) {
          setIsToastOpen(false);
        }
      } catch (error) {
        console.error("장소 재등록 실패:", error);
      }
    } else {
      // 찜 해제
      try {
        await unregisterPlace(payload);

        setUnSavedPlaceIds((prev) => [...prev, place.id]);

        const localData = JSON.parse(
          localStorage.getItem("saved_places") || "[]",
        );
        const updatedLocalData = localData.filter((p) => p.id !== place.id);
        localStorage.setItem("saved_places", JSON.stringify(updatedLocalData));

        setToastPlace(place);
        setIsToastOpen(true);
      } catch (error) {
        console.error("찜 해제 실패:", error);
      }
    }
  };

  // [MOD] 방금 삭제한 항목 API로 다시 등록(되돌리기) 핸들러
  const undoRemovePlace = async () => {
    if (!toastPlace) return;

    const payload = {
      iPK: toastPlace.id,
      strName: toastPlace.name,
      strAddress: toastPlace.address,
      strGroupName: toastPlace.category,
      strGroupCode: toastPlace.groupCode,
      ptLongitude: toastPlace.longitude,
      ptLatitude: toastPlace.latitude,
    };

    try {
      await registerPlace(payload);

      // 하트 색상 상태 복구
      setUnSavedPlaceIds((prev) => prev.filter((id) => id !== toastPlace.id));

      // 로컬 스토리지 복구
      const localData = JSON.parse(
        localStorage.getItem("saved_places") || "[]",
      );
      if (!localData.find((p) => p.id === toastPlace.id)) {
        localData.push(toastPlace);
        localStorage.setItem("saved_places", JSON.stringify(localData));
      }

      setIsToastOpen(false);
      setToastPlace(null);
    } catch (error) {
      console.error("되돌리기 재등록 실패:", error);
    }
  };

  return (
    <MobileContainer showNav={true}>
      <Script
        src="//dapi.kakao.com/v2/maps/sdk.js?appkey=57dd33d25e0269c9c37a3ea70b3a3b4f&autoload=false&libraries=services"
        strategy="afterInteractive"
      />
      <div className="w-full h-screen bg-white flex flex-col lg:bg-[#f8f9fa]">
        <header className="flex items-center justify-between py-4 bg-white sticky top-0 z-10 lg:bg-transparent lg:border-none lg:py-6">
          <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between px-5 lg:px-10">
            <h1 className="text-[20px] lg:text-[24px] font-semibold text-[#111] tracking-tighter">
              마이페이지
            </h1>
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 -mr-2 text-[#111] hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <MoreVertical size={24} strokeWidth={2} />
              </button>

              {isSettingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#eceff4] z-50 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      className="px-4 py-3 text-[14px] lg:text-sm font-medium text-[#111] text-left hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        console.log("프로필 수정 클릭");
                        setIsSettingsOpen(false);
                      }}
                    >
                      프로필 수정
                    </button>
                    <button
                      className="px-4 py-3 text-[14px] lg:text-sm font-medium text-[#ff3b3b] text-left hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        console.log("로그아웃 클릭");
                        setIsSettingsOpen(false);
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full pb-32">
          <div className="max-w-[1280px] w-full mx-auto lg:px-10">
            {/* Profile Section */}
            <div className="pt-2 pb-4 px-5 lg:bg-white lg:rounded-2xl lg:mt-2 lg:px-10 lg:border lg:border-[#eceff4] lg:py-6">
              <div className="flex items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-5 lg:gap-6">
                  <div className="w-16 h-16 bg-[#f2f4f6] rounded-full flex items-center justify-center border border-[#eceff4] shrink-0">
                    <Image
                      src={user.profileImage}
                      alt="profile"
                      width={26}
                      height={34}
                      className="grayscale opacity-20"
                    />
                  </div>
                  <div className="flex flex-col gap-1 lg:gap-1.5">
                    <h1 className="text-[20px] font-semibold text-[#111111] tracking-[-0.5px] lg:text-[24px]">
                      {user.name}
                    </h1>
                    <div className="flex items-center gap-1 cursor-pointer group">
                      <span className="text-[14px] font-regular text-[#556574] group-hover:text-[#7a28fa] transition-colors lg:text-[16px]">
                        내 리뷰 {user.reviewCount}개
                      </span>
                      <Image
                        src="/icons/arrow-right.svg"
                        alt="arrow-right"
                        width={16}
                        height={16}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-[#f2f4f6] bg-white lg:mt-4 lg:rounded-t-2xl lg:px-8 lg:border-x lg:border-t lg:border-[#eceff4]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "flex-1 py-4 text-[16px] tracking-[-0.3px] transition-all relative lg:text-[18px] lg:py-6",
                    activeTab === tab.id
                      ? "font-semibold text-[#111111]"
                      : "font-medium text-[#abb1b9]",
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#111111]" />
                  )}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="bg-[#fafafa] lg:bg-white px-5 pt-4 pb-12 lg:py-8 lg:rounded-b-2xl lg:px-8 min-h-[400px] lg:border lg:border-[#eceff4]">
              {activeTab === "장소" ? (
                <div className="flex flex-col gap-2">
                  {/* [ADD] 카테고리 필터 버튼 UI (검색 결과 페이지와 동일한 스타일) */}
                  <div className="flex overflow-x-auto gap-1.5 scrollbar-hide pb-2 -mx-5 px-5 lg:-mx-8 lg:px-8 after:content-[''] after:w-[1px] after:pr-5 lg:after:pr-8">
                    {[
                      "전체",
                      "음식점",
                      "카페",
                      "편의점",
                      "대형마트",
                      "관광명소",
                      "숙박",
                      "문화시설",
                      "지하철역",
                      "주차장",
                      "주유소",
                      "기타",
                    ].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={clsx(
                          "whitespace-nowrap px-3 py-1.5 rounded-full text-[14px] font-medium transition-all border",
                          selectedCategory === cat
                            ? "bg-[#111111] text-white border-[#111111] font-semibold"
                            : "bg-white text-[#111111] border-[#DBDBDB] hover:bg-gray-50",
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* [ADD] 필터 및 정렬 옵션 선택 UI (듀얼 드롭다운) */}
                  <div className="flex justify-start gap-2 pt-1 pb-0 relative z-20">
                    {/* 1. 위치 기준 드롭다운 */}
                    <div className="relative">
                      <button
                        onClick={() => setIsLocationOpen(!isLocationOpen)}
                        className="flex items-center gap-1 py-1 pl-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-[14px] font-medium text-[#898989]">
                          {{
                            map_center: "현재 지도 중심",
                            my_location: "내 위치 중심",
                          }[locationFilter] || "현재 지도 중심"}
                        </span>
                        <ChevronDown
                          size={16}
                          className={clsx(
                            "text-[#898989] transition-transform",
                            isLocationOpen && "rotate-180",
                          )}
                        />
                      </button>

                      {isLocationOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsLocationOpen(false)}
                          />
                          <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#eceff4] z-20 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            {[
                              { id: "map_center", label: "현재 지도 중심" },
                              { id: "my_location", label: "내 위치 중심" },
                            ].map((option) => (
                              <button
                                key={option.id}
                                onClick={() => {
                                  setLocationFilter(option.id);
                                  setIsLocationOpen(false);
                                }}
                                className={clsx(
                                  "px-4 py-3 text-[14px] text-left transition-colors whitespace-nowrap",
                                  locationFilter === option.id
                                    ? "font-bold text-[#111111] bg-gray-50 text-opacity-100"
                                    : "font-medium text-[#6e6e6e] hover:bg-gray-50",
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 2. 정렬 순서 드롭다운 */}
                    <div className="relative">
                      <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className="flex items-center gap-1 py-1 pl-3 pr-1 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-[14px] font-medium text-[#898989]">
                          {{
                            latest: "최신순",
                            reviews: "리뷰순",
                            oldest: "과거순",
                          }[sortBy] || "최신순"}
                        </span>
                        <ChevronDown
                          size={16}
                          className={clsx(
                            "text-[#898989] transition-transform",
                            isSortOpen && "rotate-180",
                          )}
                        />
                      </button>

                      {isSortOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsSortOpen(false)}
                          />
                          <div className="absolute top-full right-0 mt-1 w-28 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#eceff4] z-20 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                            {[
                              { id: "latest", label: "최신순" },
                              { id: "reviews", label: "리뷰순" },
                              { id: "oldest", label: "과거순" },
                            ].map((option) => (
                              <button
                                key={option.id}
                                onClick={() => {
                                  setSortBy(option.id);
                                  setIsSortOpen(false);
                                }}
                                className={clsx(
                                  "px-4 py-3 text-[14px] text-left transition-colors",
                                  sortBy === option.id
                                    ? "font-bold text-[#111111] bg-gray-50 text-opacity-100"
                                    : "font-medium text-[#6e6e6e] hover:bg-gray-50",
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-2">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-[#abb1b9]">
                        <p className="text-[16px] font-medium animate-pulse">
                          장소를 불러오는 중...
                        </p>
                      </div>
                    ) : (
                      <>
                        {filteredPlaces.map((place) => (
                          <div
                            key={place.id}
                            onClick={() => {
                              if (window.innerWidth >= 1024) {
                                setSelectedPlaceForModal(place);
                              } else {
                                localStorage.setItem(
                                  `place_${place.id}`,
                                  JSON.stringify(place),
                                );
                                router.push(`/search/place/${place.id}`);
                              }
                            }}
                            className="bg-white rounded-2xl border border-[#eceff4] p-4 hover:border-[#7a28fa] transition-shadow cursor-pointer relative"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex flex-col gap-1 items-start w-full pr-8">
                                <h3 className="text-[17px] font-bold text-[#111111] w-full line-clamp-1">
                                  {place.name}
                                </h3>
                                {/* [MOD] 카테고리 뱃지와 주소를 나란히 배치 */}
                                <div className="flex items-center gap-2 mt-0.5 w-full">
                                  <span className="text-[12px] font-medium text-[#7a28fa] bg-[#f8f6ff] px-2 py-0.5 rounded-[4px] flex-shrink-0">
                                    {place.category}
                                  </span>
                                  <p className="text-[13px] text-[#6d818f] line-clamp-1">
                                    {place.address}
                                  </p>
                                </div>
                              </div>
                              {/* [MOD] 찜 해제 하트 버튼 (상태에 따른 시각적 변화 처리) */}
                              <button
                                onClick={(e) => toggleSavedPlace(e, place)}
                                className={clsx(
                                  "p-1 -mr-1 -mt-1 hover:bg-gray-50 rounded-full transition-colors absolute right-4 top-4 flex-shrink-0",
                                  unSavedPlaceIds.includes(place.id)
                                    ? "text-[#abb1b9]" // 해제 시 회색
                                    : "text-[#ff3b3b]", // 찜 상태 시 빨간색
                                )}
                                aria-label="찜 상태 변경"
                              >
                                <Heart
                                  size={20}
                                  fill="currentColor"
                                  strokeWidth={0}
                                />
                              </button>
                            </div>
                            <div className="flex flex-col gap-1.5 mt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-bold text-[#7a28fa] flex items-center gap-0.5">
                                  ★ {place.rating || 0}
                                </span>
                                <span className="text-[13px] text-[#abb1b9]">
                                  ({place.reviewCount || 0})
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredPlaces.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 text-[#abb1b9]">
                            <p className="text-[16px] font-medium">
                              해당 카테고리의 찜한 장소가 없습니다.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 lg:gap-3">
                  {savedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                    >
                      <Image
                        src={photo.src}
                        alt="saved-photo"
                        fill
                        className="object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                  ))}
                  {savedPhotos.length === 0 && (
                    <div className="col-span-3 flex flex-col items-center justify-center py-20 text-[#abb1b9]">
                      <p className="text-[16px] font-medium">
                        찜한 사진이 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* [ADD] 찜 해제 알림 Toast */}
        <Toast
          isVisible={isToastOpen}
          onClose={() => setIsToastOpen(false)}
          message="찜한 장소를 해제했어요"
          actionText="되돌리기"
          onAction={undoRemovePlace}
          position="bottom"
        />

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>

      {/* [ADD] PC 전용 상세 정보 모달 */}
      {selectedPlaceForModal && (
        <div className="hidden lg:flex fixed inset-0 z-[100] items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[600px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex flex-col gap-2">
              <div className="flex flex-col gap-1.5 items-start">
                <span className="text-[13px] font-bold text-[#7a28fa] bg-[#f8f6ff] px-3 py-1 rounded-full">
                  {selectedPlaceForModal.category}
                </span>
                <h2 className="text-[28px] font-bold text-[#111111] tracking-tight">
                  {selectedPlaceForModal.name}
                </h2>
              </div>
              <p className="text-[16px] text-[#6d818f]">
                {selectedPlaceForModal.address}
              </p>
            </div>

            {/* Map Area */}
            <div className="flex-1 min-h-[300px] relative">
              <div
                ref={modalMapRef}
                className="absolute inset-0 w-full h-full"
              />
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0px_0px_40px_rgba(0,0,0,0.05)]" />
            </div>

            {/* Modal Footer */}
            <div className="p-8 flex items-center justify-between bg-[#fbfbfc]">
              <button
                onClick={() => {
                  localStorage.setItem(
                    `place_${selectedPlaceForModal.id}`,
                    JSON.stringify(selectedPlaceForModal),
                  );
                  router.push(`/search?select=${selectedPlaceForModal.id}`);
                }}
                className="h-[56px] px-8 bg-[#7a28fa] text-white rounded-2xl text-[16px] font-bold hover:bg-[#6922d5] transition-colors shadow-lg shadow-[#7a28fa]/20 active:scale-95 transition-all"
              >
                상세보기
              </button>
              <button
                onClick={() => setSelectedPlaceForModal(null)}
                className="h-[56px] px-8 border border-[#eceff4] bg-white text-[#6d818f] rounded-2xl text-[16px] font-bold hover:bg-gray-50 active:scale-95 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
