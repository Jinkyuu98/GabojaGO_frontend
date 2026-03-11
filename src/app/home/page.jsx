"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getScheduleList, getScheduleExpenses } from "../../services/schedule";
import { getSavedPlaces, getTopLocations } from "../../services/place"; // [MOD] getTopLocations 추가
import { getPlaceReviews } from "../../services/review";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { ActionSheet } from "../../components/common/ActionSheet";
import { ChevronRight, Filter, TrendingUp, TrendingDown, Minus, Camera, ImageIcon, MapPin } from "lucide-react"; // [MOD] 아이콘 추가
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { clsx } from "clsx";


export default function HomePage() {
  const router = useRouter();
  const { setTravelData, resetTravelData } = useOnboardingStore();
  const [activeTab, setActiveTab] = useState("전체");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [hasTripData, setHasTripData] = useState(false);
  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [ongoingTrips, setOngoingTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rankingList, setRankingList] = useState([]); // [ADD] 랭킹 리스트 상태
  const [selectedCategory, setSelectedCategory] = useState("AT4"); // [ADD] 선택된 카테고리 (기본: 관광명소)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false); // [ADD] 카테고리 선택 액션시트 

  // [ADD] 컴포넌트 마운트 시 최초 1회 실행되는 useEffect
  // 진행 중인 일정을 백엔드로부터 불러오는 로직을 포함
  useEffect(() => {
    // [ADD] 브라우즈(둘러보기) 모드 체크
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "browse") {
      setIsBrowseMode(true);
      setIsLoading(false);
      return;
    }

    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        // [MOD] 백엔드에서 chStatus 값을 필수로 요구하므로, "A" 상태의 일정을 호출
        // 사용자의 일정 중 "A" (진행 중 또는 예정된 상태) 필터링
        const resA = await getScheduleList("A");

        // [MOD] API 응답 데이터를 확인하여 빈 배열 또는 다른 구조로 반환되는지 확인
        console.log("resA:", resA);

        // [ADD] 실제 배열 데이터 추출. 없을 경우 빈 배열 값 할당 처리
        const listA = resA?.schedule_list || [];
        const ongoing = [...listA];

        console.log("ongoing trips:", ongoing);

        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        // [MOD] 최우선: 현재 여행 중인 일정 (시작일 <= 오늘 <= 종료일)
        const currentTrips = ongoing.filter((trip) => {
          if (!trip.dtDate1 || !trip.dtDate2) return false;
          const startDateStr = trip.dtDate1.split('T')[0];
          const endDateStr = trip.dtDate2.split('T')[0];

          const startDate = new Date(startDateStr.replace(/\./g, '-'));
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endDateStr.replace(/\./g, '-'));
          endDate.setHours(0, 0, 0, 0);

          return todayDate >= startDate && todayDate <= endDate;
        });

        // [MOD] 차우선: 다가오는 가장 임박한 미래 일정 (시작일 > 오늘)
        const upcomingTrips = ongoing
          .filter((trip) => {
            if (!trip.dtDate1) return false;
            const startDateStr = trip.dtDate1.split('T')[0];
            const startDate = new Date(startDateStr.replace(/\./g, '-'));
            startDate.setHours(0, 0, 0, 0);
            return startDate > todayDate;
          })
          .sort((a, b) => {
            return new Date(a.dtDate1) - new Date(b.dtDate1);
          });

        let targetTrip = null;
        let otherUpcoming = [];
        if (currentTrips.length > 0) {
          const sortedCurrent = currentTrips.sort((a, b) => new Date(a.dtDate1) - new Date(b.dtDate1));
          targetTrip = sortedCurrent[0];
          otherUpcoming = [...sortedCurrent.slice(1), ...upcomingTrips];
        } else if (upcomingTrips.length > 0) {
          targetTrip = upcomingTrips[0];
          otherUpcoming = upcomingTrips.slice(1);
        }

        if (targetTrip) {
          // [ADD] 지출 내역을 가져와서 합산 계산 (대표 일정만)
          try {
            const expenseRes = await getScheduleExpenses(targetTrip.iPK);
            const eList = expenseRes?.expense_list || [];
            const nTotalSpent = eList.reduce((sum, exp) => sum + (exp.nMoney || 0), 0);
            targetTrip.nTotalSpent = nTotalSpent;
          } catch (e) {
            console.error("지출 내역 조회 실패:", e);
            targetTrip.nTotalSpent = 0;
          }
          // [MOD] 대표 일정과 예정 일정 1개만 포함 (대표 1 + 예정 1)
          setOngoingTrips([targetTrip, ...otherUpcoming.slice(0, 1)]);
          setHasTripData(true);
        } else {
          setOngoingTrips([]);
          setHasTripData(false);
        }

      } catch (err) {
        console.error("일정 목록 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, [isBrowseMode]); // [FIX] tripId 제거 (홈페이지에는 tripId가 없음)

  const fetchRankings = async () => {
    try {
      // [MOD] "ALL"인 경우 카테고리 필터 없이 조회
      const res = await getTopLocations(10, selectedCategory === "ALL" ? null : selectedCategory);
      if (res.data?.location_list) {
        setRankingList(res.data.location_list);
      } else if (res.location_list) {
        setRankingList(res.location_list);
      }
    } catch (err) {
      console.error("랭킹 조회 실패:", err);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [selectedCategory]);

  const categoryMap = {
    "ALL": "전체", // [ADD] 전체 필터 추가
    "AT4": "관광명소",
    "AD5": "숙박",
    "FD6": "음식점",
    "CE7": "카페"
  };

  // [ADD] 백엔드에서 받아온 Date(ISO형식 등) 문자열을 YYYY.MM.DD 형식으로 변경하는 헬퍼 함수
  const formatDateRange = (start, end) => {
    if (!start) return "";
    const cleanStart = start.split("T")[0].replace(/-/g, ".");
    if (!end) return cleanStart;
    const cleanEnd = end.split("T")[0].replace(/-/g, ".");
    const startYear = cleanStart.split(".")[0];
    const endYear = cleanEnd.split(".")[0];
    // [MOD] 시작 연도와 종료 연도가 같을 경우 종료 연도는 생략 처리
    return startYear === endYear ? `${cleanStart} ~ ${cleanEnd.substring(5)}` : `${cleanStart} ~ ${cleanEnd}`;
  };

  // [ADD] 하단 인기 여행 코스의 가로 스크롤을 드래그로 조작하기 위한 상태값을 저장하는 Ref
  const dragState = useRef({});

  const onDragStart = (e, idx) => {
    dragState.current[idx] = {
      isDragging: true,
      dragged: false, // 실제 드래그 여부
      startX: e.pageX - e.currentTarget.offsetLeft,
      scrollLeft: e.currentTarget.scrollLeft,
    };
  };

  const onDragEnd = (idx) => {
    if (dragState.current[idx]) {
      dragState.current[idx].isDragging = false;
    }
  };

  const onDragMove = (e, idx) => {
    const state = dragState.current[idx];
    if (!state || !state.isDragging) return;

    const x = e.pageX - e.currentTarget.offsetLeft;
    const walk = (x - state.startX) * 1.5; // 스크롤 속도

    // 5px 이상 움직이면 드래그로 간주
    if (Math.abs(x - state.startX) > 5) {
      state.dragged = true;
    }

    if (state.dragged) {
      e.preventDefault();
      e.currentTarget.scrollLeft = state.scrollLeft - walk;
    }
  };

  const categories = ["전체", "대한민국", "일본", "유럽", "동남아"];

  const handleCardClick = () => {
    router.push("/trips/1");
  };

  return (
    <MobileContainer showNav={true}>
      <div className="w-full min-h-screen bg-white max-w-[1280px] mx-auto relative shadow-sm lg:shadow-none pb-32">
        {/* Header - Desktop Adjusted (Matched with Profile Page) */}
        <header className="flex items-center justify-between py-4 bg-white sticky top-0 z-10 lg:bg-transparent lg:border-none lg:py-6">
          <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between px-5 lg:px-8">
            <h1 className="text-[20px] lg:text-[24px] font-bold tracking-[-0.5px] text-[#111111]">
              가보자<span className="text-[#7a28fa]">GO</span>
            </h1>
            <div className={`flex gap-2 ${!hasTripData && !isBrowseMode ? "hidden" : ""}`}>
              {/* [MOD] 일정 생성하기 버튼을 AI/직접 두 개로 분리 및 액션시트 제거 */}
              <button
                className="bg-[#7a28fa] text-white px-4 py-2.5 lg:px-5 lg:py-3 rounded-full text-[13px] lg:text-[15px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                onClick={() => {
                  resetTravelData();
                  setTravelData({ creationType: "ai" });
                  router.push("/onboarding/location");
                }}
              >
                AI 일정 생성
              </button>
              <button
                className="bg-[#111111] text-white px-4 py-2.5 lg:px-5 lg:py-3 rounded-full text-[13px] lg:text-[15px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                onClick={() => {
                  resetTravelData();
                  setTravelData({ creationType: "manual" });
                  router.push("/onboarding/location");
                }}
              >
                직접 일정 생성
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content - Grid Layout for Desktop */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20 min-h-[50vh]">
            <p className="text-[#898989] text-[15px]">여행 일정을 불러오는 중입니다...</p>
          </div>
        ) : isBrowseMode ? (
          <div className="flex flex-col gap-10 px-5 mt-4 lg:gap-16 pb-20">
            <div className="w-full max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-10 pb-4 border-b">
                <h2 className="text-[22px] lg:text-[28px] font-black text-[#111111]">
                  실시간 인기 <span className="text-[#7a28fa]">{categoryMap[selectedCategory]}</span>
                </h2>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100/80 hover:bg-gray-200 rounded-full text-[15px] font-bold text-[#111] transition-colors"
                  onClick={() => setIsCategoryOpen(true)}
                >
                  <Filter size={18} />
                  {categoryMap[selectedCategory]}
                </button>
              </div>

              <div className="flex flex-col gap-8">
                {rankingList.map((item, index) => (
                  <div
                    key={item.iPK || index}
                    className="flex items-center gap-6 group cursor-pointer"
                    onClick={() => window.open(item.strLink || `https://map.kakao.com/link/place/${item.iPK}`, '_blank')}
                  >
                    <span className={clsx(
                      "text-[22px] lg:text-[24px] font-black w-10 text-center italic",
                      index < 3 ? "text-[#7a28fa]" : "text-[#111111]/15"
                    )}>
                      {index + 1}
                    </span>
                    {/* [DEL] 이미지 영역 삭제 */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <h3 className="text-[18px] lg:text-[21px] font-bold text-[#111] truncate group-hover:text-[#7a28fa] transition-colors leading-tight mb-1">
                        {item.strName || item.place_name}
                      </h3>
                      {selectedCategory === "ALL" && (
                        <p className="text-[15px] font-semibold text-[#8e8e93] truncate">
                          {item.strGroupName || item.category_name || "장소"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-end w-14">
                      {/* [MOD] 실제 기능이 없는 mock 트렌드 아이콘 대신 대시(-) 표시 */}
                      <Minus size={18} className="text-gray-200" strokeWidth={4} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : hasTripData ? (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 px-5">
            {/* Main Travel Card Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                {ongoingTrips.map((trip, idx) => {
                  // [ADD] 동행자 데이터에 '가족과, 연인과' 등의 서술어가 없는 경우
                  // 자연스럽게 '와/과 함께'를 붙여주는 텍스트 전처리
                  const companionText = trip.strWithWho
                    ? ["친구와", "연인과", "가족과", "부모님과", "친구", "연인", "가족", "부모님"].includes(trip.strWithWho)
                      ? `${trip.strWithWho} 함께`
                      : trip.strWithWho
                    : "나홀로";

                  return (
                    <div
                      key={trip.iPK || "single-trip"}
                      className={clsx(
                        "rounded-2xl p-6 lg:p-8 cursor-pointer hover:shadow-xl transition-shadow lg:shadow-",
                        idx === 0 ? "bg-[#f4f1ff]" : "bg-[#f8f9fa] border border-[#e9ecef]"
                      )}
                      onClick={() => router.push(`/trips/${trip.iPK}`)}
                    >
                      {/* Trip Status Label */}
                      <div className="mb-4">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[12px] font-bold",
                          idx === 0 ? "bg-[#7a28fa] text-white" : "bg-gray-200 text-gray-600"
                        )}>
                          {idx === 0 ? "다가오는 일정" : "예정된 일정"}
                        </span>
                      </div>

                      {/* Trip Info */}
                      <div className="flex flex-col gap-2 mb-6">
                        <div className={clsx(
                          "flex justify-between border-b pb-4",
                          idx === 0 ? "border-[#e4e1ff]" : "border-gray-200"
                        )}>
                          <span className="text-[15px] font-medium text-[#6d818f]">
                            {companionText}
                          </span>
                          <span className="text-[15px] font-medium text-[#6d818f]">
                            {formatDateRange(trip.dtDate1, trip.dtDate2)}
                          </span>
                        </div>
                        <h2 className="text-[24px] lg:text-[32px] font-bold tracking-[-0.5px] text-[#111111] pt-4">
                          {trip.strWhere}
                        </h2>
                      </div>

                      {/* Category Tags */}
                      <div className="flex flex-wrap gap-2 mb-10">
                        {(trip.strTripStyle
                          ? trip.strTripStyle.split(",").map(t => t.trim()).filter(Boolean)
                          : []
                        ).map((tag, idx) => (
                          <span
                            key={`${tag}-${idx}`}
                            className="text-[14px] font-semibold text-[#6d818f] px-4 py-2 rounded-xl bg-white/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Budget Section */}
                      <div className="flex flex-col gap-3 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-[16px] font-medium text-[#556574]">
                            남은 예산
                          </span>
                          <span className="text-[16px] text-[#556574]">
                            <span className="font-bold text-[#111]">
                              {((trip.nTotalBudget || 0) - (trip.nTotalSpent || 0)).toLocaleString()}원
                            </span> /
                            {(trip.nTotalBudget || 0).toLocaleString()}원
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="relative w-full h-4 bg-white rounded-full overflow-hidden border border-[#111111]/5">
                          <div
                            className={clsx(
                              "absolute top-0 left-0 h-full rounded-full transition-all",
                              idx === 0 ? "bg-[#7a28fa]" : "bg-gray-400"
                            )}
                            style={{
                              width: `${Math.min(100, Math.max(0, (((trip.nTotalBudget || 0) - (trip.nTotalSpent || 0)) / (trip.nTotalBudget || 1)) * 100))}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* [ADD] 사진/영수증/지도 버튼 복구 (대표 일정에만 노출) */}
                      {idx === 0 && (
                        <div className="flex gap-3">
                          <button
                            className="flex-1 bg-white hover:bg-gray-50 text-[#111] py-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/trips/${trip.iPK}?tab=사진&action=uploadPhoto`);
                            }}
                          >
                            <ImageIcon size={20} className="text-[#7a28fa]" />
                            <span className="text-[11px] font-bold">사진 등록</span>
                          </button>
                          <button
                            className="flex-1 bg-white hover:bg-gray-50 text-[#111] py-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              // [MOD] 비용 탭까지만 redirect (영수증 불러오기 자동 실행 제거)
                              router.push(`/trips/${trip.iPK}?tab=비용`);
                            }}
                          >
                            <Camera size={20} className="text-[#3b82f6]" />
                            <span className="text-[11px] font-bold">영수증 등록</span>
                          </button>
                          <button
                            className="flex-1 bg-white hover:bg-gray-50 text-[#111] py-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/trips/${trip.iPK}?tab=일정`);
                            }}
                          >
                            <MapPin size={20} className="text-[#10b981]" />
                            <span className="text-[11px] font-bold">지도 보기</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Content Column - Ranking List */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-12 lg:gap-16 mt-12 lg:mt-0 lg:border lg:border-[#e5eef4] lg:p-6 lg:rounded-2xl bg-white">
              <div>
                <div className="flex justify-between items-center mb-8 pb-2 border-b border-gray-50">
                  <h2 className="text-[18px] lg:text-[20px] font-bold text-[#111111] flex items-center gap-2">
                    실시간 인기 {categoryMap[selectedCategory]} <span className="text-[14px] text-[#7a28fa] font-black italic">TOP 10</span>
                  </h2>
                  <div
                    className="flex items-center gap-1.5 cursor-pointer group px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsCategoryOpen(true)}
                  >
                    <span className="text-[13px] font-bold text-[#111111]">
                      {categoryMap[selectedCategory]}
                    </span>
                    <Filter size={14} className="text-[#111111]" />
                  </div>
                </div>

                <div className="flex flex-col gap-7">
                  {rankingList.map((item, index) => (
                    <div
                      key={item.iPK || index}
                      className="flex items-center gap-4 group cursor-pointer"
                      onClick={() => window.open(item.strLink || `https://map.kakao.com/link/place/${item.iPK}`, '_blank')}
                    >
                      <span className={clsx(
                        "text-[18px] lg:text-[20px] font-black w-7 text-center italic",
                        index < 3 ? "text-[#7a28fa]" : "text-[#111111]/30"
                      )}>
                        {index + 1}
                      </span>
                      {/* [DEL] 이미지 영역 삭제 */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <h3 className="text-[16px] lg:text-[17px] font-bold text-[#111] truncate group-hover:text-[#7a28fa] transition-colors leading-tight">
                          {item.strName || item.place_name}
                        </h3>
                        {selectedCategory === "ALL" && (
                          <p className="text-[13px] text-[#8e8e93] truncate font-medium mt-1">
                            {item.strGroupName || item.category_name || "장소"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-end w-10">
                        {/* [MOD] 실제 기능이 없는 mock 트렌드 아이콘 대신 대시(-) 표시 */}
                        <Minus size={14} className="text-[#8e8e93]/20" strokeWidth={3} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-16 px-5 mt-1 lg:gap-24">
            {/* Empty State Card */}
            <div className="w-full max-w-2xl mx-auto bg-[#f9fafb] rounded-[24px] py-14 px-8 flex flex-col items-center justify-center text-center border border-gray-100">
              <p className="text-[17px] text-[#4b5563] leading-relaxed mb-8 font-medium">
                아직 여행 일정이 없어요<br />첫 여행 일정을 만들어볼까요?
              </p>
              <div className="flex gap-3">
                {/* [MOD] 일정 생성하기 버튼을 AI/직접 두 개로 분리 */}
                <button
                  onClick={() => {
                    resetTravelData();
                    setTravelData({ creationType: "ai" });
                    router.push("/onboarding/location");
                  }}
                  className="bg-[#7a28fa] text-white px-8 py-4 rounded-full text-[16px] font-bold hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-[#7a28fa]/20"
                >
                  AI 일정 생성
                </button>
                <button
                  onClick={() => {
                    resetTravelData();
                    setTravelData({ creationType: "manual" });
                    router.push("/onboarding/location");
                  }}
                  className="bg-[#111] text-white px-8 py-4 rounded-full text-[16px] font-bold hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-black/10"
                >
                  직접 일정 생성
                </button>
              </div>
            </div>

            {/* Ranking List for Empty State */}
            <div className="w-full max-w-2xl mx-auto pb-12">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[20px] lg:text-[24px] font-bold text-[#111111]">
                  실시간 인기 <span className="text-[#7a28fa] font-black">{categoryMap[selectedCategory]}</span>
                </h2>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 rounded-full text-[14px] font-bold text-[#111]"
                  onClick={() => setIsCategoryOpen(true)}
                >
                  <Filter size={16} />
                  {categoryMap[selectedCategory]}
                </button>
              </div>

              <div className="flex flex-col gap-7">
                {rankingList.map((item, index) => (
                  <div
                    key={item.iPK || index}
                    className="flex items-center gap-5 group cursor-pointer"
                    onClick={() => window.open(item.strLink || `https://map.kakao.com/link/place/${item.iPK}`, '_blank')}
                  >
                    <span className={clsx(
                      "text-[20px] lg:text-[22px] font-black w-8 text-center italic",
                      index < 3 ? "text-[#7a28fa]" : "text-[#111111]/20"
                    )}>
                      {index + 1}
                    </span>
                    {/* [DEL] 이미지 영역 삭제 (일정 있을 때와 통일성 유지) */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <h3 className="text-[17px] lg:text-[19px] font-bold text-[#111] truncate group-hover:text-[#7a28fa] transition-colors leading-tight">
                        {item.strName || item.place_name}
                      </h3>
                      {selectedCategory === "ALL" && (
                        <p className="text-[14px] font-medium text-[#6b7280] truncate mt-1.5">
                          {item.strGroupName || item.category_name || "장소"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-end w-12 mr-2">
                      {/* [MOD] 실제 기능이 없는 mock 트렌드 아이콘 대신 대시(-) 표시 */}
                      <Minus size={16} className="text-gray-300" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ActionSheet
        isOpen={isCategoryOpen}
        onClose={() => setIsCategoryOpen(false)}
        title="카테고리 선택"
        options={Object.entries(categoryMap).map(([code, name]) => ({
          label: name,
          onClick: () => {
            setSelectedCategory(code);
            setIsCategoryOpen(false);
          }
        }))}
      />

      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        title="어떤 방식으로 생성할까요?"
        options={[
          {
            label: "AI 일정 생성",
            onClick: () => {
              resetTravelData();
              setTravelData({ creationType: "ai" });
              router.push("/onboarding/location");
            },
          },
          {
            label: "직접 일정 생성",
            onClick: () => {
              resetTravelData();
              setTravelData({ creationType: "manual" });
              router.push("/onboarding/location");
            },
          },
        ]}
      />

      <BottomNavigation />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </MobileContainer >
  );
}
