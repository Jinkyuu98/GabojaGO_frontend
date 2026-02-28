"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getScheduleList } from "../../services/schedule";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { ActionSheet } from "../../components/common/ActionSheet";
import { ChevronRight } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

export default function HomePage() {
  const router = useRouter();
  const { setTravelData, resetTravelData } = useOnboardingStore();
  const [activeTab, setActiveTab] = useState("전체");
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [hasTripData, setHasTripData] = useState(false);
  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [ongoingTrips, setOngoingTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

        let targetTrip = [];
        if (currentTrips.length > 0) {
          // [ADD] 현재 여행 중인 일정이 2개 이상일 경우 시작일이 가까운 걸 우선
          targetTrip = [currentTrips.sort((a, b) => new Date(a.dtDate1) - new Date(b.dtDate1))[0]];
        } else if (upcomingTrips.length > 0) {
          targetTrip = [upcomingTrips[0]];
        }

        setOngoingTrips(targetTrip);
        setHasTripData(targetTrip.length > 0);
      } catch (err) {
        // [FIX] 데이터 가져오기 실패 시 오류 콘솔 출력
        console.error("일정 목록 조회 실패:", err);
      } finally {
        // [ADD] 성공, 에러 여부 상관없이 로딩 상태는 false로 변경
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, []);

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
            <button
              // [MOD] 둘러보기 모드일 때 "AI 일정 생성"으로 노출, 둘 다 아니면(일정 데이터 없는 로그인 유저) 숨김
              className={`bg-[#111111] text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-full text-[14px] lg:text-[16px] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all ${!hasTripData && !isBrowseMode ? "hidden" : ""}`}
              onClick={() => {
                if (isBrowseMode) {
                  // [MOD] 둘러보기 모드(AI 일정 생성 버튼)에서는 바텀시트를 건너뛰고 바로 진입
                  router.push("/onboarding/location");
                } else {
                  // [MOD] 일정 생성하기 버튼일 때는 ActionSheet를 띄움
                  setIsActionSheetOpen(true);
                }
              }}
            >
              {isBrowseMode ? "AI 일정 생성" : "일정 생성하기"}
            </button>
          </div>
        </header>

        {/* Dashboard Content - Grid Layout for Desktop */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20 min-h-[50vh]">
            <p className="text-[#898989] text-[15px]">여행 일정을 불러오는 중입니다...</p>
          </div>
        ) : isBrowseMode ? (
          <div className="flex flex-col gap-16 px-5 mt-1 lg:gap-24">
            {/* [ADD] 둘러보기 모드: Empty State 카드 없이 인기 코스 리스트만 노출 */}
            <div className="flex flex-col gap-10 lg:gap-24 pb-8 pt-6">
              {[
                { title: "제주도 인기 여행 코스", items: [{ img: "/images/jeju-beach.png", text: "금릉해변과 카페 맛집 코스" }, { img: "/images/jeju-hill.png", text: "제주 오름과 먹방 숙소 추천" }, { img: "/images/jeju-forest.png", text: "제주 비밀의 숲 힐링 코스" }, { img: "/images/jeju-beach.png", text: "애월 해안도로 드라이브" }, { img: "/images/jeju-hill.png", text: "성산일출봉 해돋이 투어" }, { img: "/images/jeju-forest.png", text: "안돌오름 비밀의 숲 산책" }, { img: "/images/jeju-beach.png", text: "우도 당일치기 자전거 코스" }, { img: "/images/jeju-hill.png", text: "한라산 영실코스 등반" }] },
                { title: "부산 인기 여행 코스", items: [{ img: "/images/restaurant-1.png", text: "해운대 오션뷰 감성 숙소 모음" }, { img: "/images/restaurant-2.png", text: "광안리 야경과 함께하는 디너" }, { img: "/images/restaurant-1.png", text: "부산 로컬 맛집 투어 코스" }, { img: "/images/restaurant-2.png", text: "청사포 조개구이 먹방 코스" }, { img: "/images/restaurant-1.png", text: "흰여울문화마을 산책로 코스" }, { img: "/images/restaurant-2.png", text: "송도 해상케이블카 뷰 맛집" }, { img: "/images/restaurant-1.png", text: "기장 해동용궁사 힐링 코스" }, { img: "/images/restaurant-2.png", text: "서면 전포 카페거리 투어" }] },
                { title: "경주 인기 여행 코스", items: [{ img: "/images/jeju-hill.png", text: "황리단길 핫플 카페 투어" }, { img: "/images/jeju-forest.png", text: "야경이 예쁜 동궁과 월지 코스" }, { img: "/images/jeju-beach.png", text: "불국사부터 시작하는 역사 탐방" }, { img: "/images/restaurant-1.png", text: "경주월드 어뮤즈먼트 코스" }, { img: "/images/jeju-hill.png", text: "대릉원 사진 명소 탐방 코스" }, { img: "/images/jeju-forest.png", text: "첨성대 핑크뮬리 스냅 코스" }, { img: "/images/jeju-beach.png", text: "보문관광단지 호수 산책" }, { img: "/images/restaurant-1.png", text: "교촌마을 한옥 체험과 맛집" }] },
              ].map((section, idx) => (
                <div key={idx} className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] lg:text-[24px] font-bold text-[#111111]">
                      {section.title}
                    </h2>
                    <ChevronRight size={20} className="text-[#abb1b9] cursor-pointer" />
                  </div>
                  <div
                    className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x pl-5 scroll-pl-5 lg:pl-0 lg:scroll-pl-0 -mx-5 lg:mx-0 relative cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => onDragStart(e, idx)}
                    onMouseLeave={() => onDragEnd(idx)}
                    onMouseUp={() => onDragEnd(idx)}
                    onMouseMove={(e) => onDragMove(e, idx)}
                  >
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className={`gap-3 w-[140px] lg:w-[220px] flex-shrink-0 cursor-pointer group snap-start flex-col ${itemIdx >= 5 ? 'hidden lg:flex' : 'flex'}`}
                        onClickCapture={(e) => {
                          if (dragState.current[idx]?.dragged) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          router.push(`/trips/popular/${idx}-${itemIdx}`)
                        }}
                      >
                        <div className="w-[140px] h-[140px] lg:w-[220px] lg:h-[220px] rounded-2xl overflow-hidden relative bg-[#f5f5f5]">
                          <Image
                            src={item.img}
                            alt="course thumbnail"
                            fill
                            draggable={false}
                            className="object-cover group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-[16px] lg:text-[20px] font-medium lg:font-regular text-[#111] leading-tight group-hover:text-[#7a28fa] transition-colors break-keep mt-1 lg:mt-2">
                          {item.text}
                        </p>
                      </div>
                    ))}
                    <div className="flex flex-col gap-3 w-[100px] lg:w-[140px] flex-shrink-0 cursor-pointer group snap-start items-center justify-center pt-4 lg:pt-8">
                      <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#f5f7f9] rounded-full flex items-center justify-center group-hover:bg-[#eceff4] transition-colors mt-2">
                        <ChevronRight className="w-6 h-6 lg:w-8 lg:h-8 text-[#6d818f]" />
                      </div>
                      <span className="text-[14px] lg:text-[16px] font-medium text-[#6d818f] mt-1 lg:mt-2">더보기</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasTripData ? (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 px-5">
            {/* Main Travel Card Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                {ongoingTrips.map((trip) => {
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
                      className="bg-[#eaf1f7] rounded-2xl p-6 lg:p-8 cursor-pointer hover:shadow-xl transition-shadow lg:shadow-"
                      onClick={() => router.push(`/trips/${trip.iPK}`)}
                    >
                      {/* Trip Info */}
                      <div className="flex flex-col gap-2 mb-6">
                        <div className="flex justify-between border-b border-[#d1dbe2] pb-4">
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
                          : trip.tags || ["자연", "맛집", "카페", "쇼핑"]
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
                            남은 예산 (임시)
                          </span>
                          <span className="text-[16px] text-[#556574]">
                            <span className="font-bold text-[#111]">
                              {(trip.nTotalBudget || 500000).toLocaleString()}원
                            </span> /
                            {(trip.nTotalBudget || 500000).toLocaleString()}원
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="relative w-full h-4 bg-white rounded-full overflow-hidden border border-[#111111]/5">
                          <div
                            className="absolute top-0 left-0 h-full bg-[#111111] rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-4">
                        {[
                          { icon: "/icons/camera.svg", label: "사진 등록" },
                          { icon: "/icons/receipt.svg", label: "영수증 등록" },
                          { icon: "/icons/map-pin.svg", label: "지도 보기" },
                        ].map((btn, idx) => (
                          <button
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-2 bg-white rounded-2xl border border-[#e5eef4] py-6 hover:bg-[#fcfdfe] transition-colors"
                          >
                            <Image
                              src={btn.icon}
                              alt={btn.label}
                              width={28}
                              height={28}
                            />
                            <span className="text-[14px] font-bold text-[#556574]">
                              {btn.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Content Column - Popular Lists */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-12 lg:gap-16 mt-12 lg:mt-0 lg:border lg:border-[#e5eef4] lg:p-6 lg:rounded-2xl">
              {/* Popular Travel Routes */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[18px] lg:text-[20px] font-bold text-[#111111]">
                    인기 여행 코스 TOP10
                  </h2>
                  <button className="text-[14px] font-semibold text-[#999999]">
                    더보기
                  </button>
                </div>
                {/* [MOD] 모바일 화면에서는 가로 스크롤로, PC 화면(lg)에서는 2x2 배열 grid 유지 */}
                <div
                  className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 snap-x pl-5 scroll-pl-5 -mx-5 relative lg:static lg:overflow-x-visible lg:pb-0 lg:snap-none lg:pl-0 lg:scroll-pl-0 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-6 lg:flex-col lg:flex-wrap"
                  onMouseDown={(e) => onDragStart(e, 'routes')}
                  onMouseLeave={() => onDragEnd('routes')}
                  onMouseUp={() => onDragEnd('routes')}
                  onMouseMove={(e) => onDragMove(e, 'routes')}
                >
                  {[
                    {
                      img: "/images/jeju-beach.png",
                      text: "금릉해변과 카페 맛집 코스",
                    },
                    {
                      img: "/images/jeju-hill.png",
                      text: "제주 오름과 먹방 숙소 추천",
                    },
                    {
                      img: "/images/jeju-forest.png",
                      text: "제주 비밀의 숲 힐링 코스",
                    },
                    {
                      img: "/images/jeju-beach.png",
                      text: "애월 해안도로 드라이브",
                    },
                    {
                      img: "/images/jeju-forest.png",
                      text: "사려니숲길 아침 산책",
                    },
                  ].map((item, index) => (
                    // [MOD] 5번째 아이템(index === 4)일 경우 PC 화면(lg)에서는 숨김 처리(lg:hidden)하여 2x2 배열 유지
                    <div
                      key={index}
                      className={`flex flex-col w-[140px] lg:w-auto flex-shrink-0 lg:flex-shrink cursor-pointer group snap-start lg:snap-align-none lg:items-start gap-3 ${index === 4 ? 'lg:hidden' : ''}`}
                      onClickCapture={(e) => {
                        if (dragState.current['routes']?.dragged) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                      }}
                    >
                      <div className="w-[140px] h-[140px] lg:w-full lg:h-32 rounded-xl overflow-hidden relative bg-[#f5f5f5]">
                        <Image
                          src={item.img}
                          alt="route"
                          fill
                          draggable={false}
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <p className="text-[15px] font-regular text-[#111] leading-tight group-hover:text-[#7a28fa] transition-colors lg:text-[16px] lg:mt-0 break-keep">
                        {item.text}
                      </p>
                    </div>
                  ))}

                  {/* [ADD] 모바일 가로 스크롤 마지막 "더보기" 요소 추가 (PC에서는 숨김) */}
                  <div className="flex flex-col gap-3 w-[100px] lg:hidden flex-shrink-0 cursor-pointer group snap-start items-center justify-center pt-4">
                    <div className="w-14 h-14 bg-[#f5f7f9] rounded-full flex items-center justify-center group-hover:bg-[#eceff4] transition-colors mt-2">
                      <ChevronRight className="w-6 h-6 text-[#6d818f]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#6d818f] mt-1">더보기</span>
                  </div>
                </div>
              </div>

              {/* Popular Restaurants */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[18px] lg:text-[20px] font-bold text-[#111111]">
                    실시간 인기 맛집
                  </h2>
                  <button className="text-[14px] font-semibold text-[#999999]">
                    더보기
                  </button>
                </div>
                {/* [MOD] 모바일 화면에서는 가로 스크롤로, PC 화면(lg)에서는 2x2 배열 grid-cols-2 적용 */}
                <div
                  className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 snap-x pl-5 scroll-pl-5 -mx-5 relative lg:static lg:overflow-x-visible lg:pb-0 lg:snap-none lg:pl-0 lg:scroll-pl-0 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-6 lg:flex-col lg:flex-wrap"
                  onMouseDown={(e) => onDragStart(e, 'restaurants')}
                  onMouseLeave={() => onDragEnd('restaurants')}
                  onMouseUp={() => onDragEnd('restaurants')}
                  onMouseMove={(e) => onDragMove(e, 'restaurants')}
                >
                  {[
                    {
                      img: "/images/jeju-beach.png",
                      text: "금릉해변과 카페 맛집 코스",
                    },
                    {
                      img: "/images/jeju-hill.png",
                      text: "제주 오름과 먹방 숙소 추천",
                    },
                    {
                      img: "/images/jeju-forest.png",
                      text: "제주 비밀의 숲 힐링 코스",
                    },
                    {
                      img: "/images/jeju-beach.png",
                      text: "해운대 오션뷰 감성 숙소 모음",
                    },
                    {
                      img: "/images/jeju-hill.png",
                      text: "황리단길 핫플레이스 투어",
                    },
                  ].map((item, index) => (
                    // [MOD] 5번째 아이템(index === 4)일 경우 PC 화면(lg)에서는 숨김 처리(lg:hidden)하여 2x2 배열 유지
                    <div
                      key={index}
                      className={`flex flex-col w-[140px] lg:w-auto flex-shrink-0 lg:flex-shrink cursor-pointer group snap-start lg:snap-align-none lg:items-start gap-3 ${index === 4 ? 'lg:hidden' : ''}`}
                      onClickCapture={(e) => {
                        if (dragState.current['restaurants']?.dragged) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                      }}
                    >
                      <div className="w-[140px] h-[140px] lg:w-full lg:h-32 rounded-xl overflow-hidden relative bg-[#f5f5f5]">
                        <Image
                          src={item.img}
                          alt="restaurant"
                          fill
                          draggable={false}
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <p className="text-[15px] font-regular text-[#111] leading-tight group-hover:text-[#7a28fa] transition-colors lg:text-[16px] lg:mt-0 break-keep">
                        {item.text}
                      </p>
                    </div>
                  ))}

                  {/* [ADD] 모바일 가로 스크롤 마지막 "더보기" 요소 추가 (PC에서는 숨김) */}
                  <div className="flex flex-col gap-3 w-[100px] lg:hidden flex-shrink-0 cursor-pointer group snap-start items-center justify-center pt-4">
                    <div className="w-14 h-14 bg-[#f5f7f9] rounded-full flex items-center justify-center group-hover:bg-[#eceff4] transition-colors mt-2">
                      <ChevronRight className="w-6 h-6 text-[#6d818f]" />
                    </div>
                    <span className="text-[14px] font-medium text-[#6d818f] mt-1">더보기</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-16 px-5 mt-1 lg:gap-24">
            {/* Empty State Card */}
            <div className="bg-[#f5f7f9] rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center">
              <p className="text-[16px] text-[#556574] leading-relaxed mb-6 font-regular">
                아직 여행 일정이 없어요<br />첫 여행 일정을 만들어볼까요?
              </p>
              <button
                onClick={() => setIsActionSheetOpen(true)}
                className="bg-[#111] text-white px-6 py-3 rounded-full text-[15px] lg:text-[16px] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all outline-none"
              >
                일정 생성하기
              </button>
            </div>

            {/* Popular Courses Sections */}
            <div className="flex flex-col gap-10 lg:gap-24 pb-8">
              {[
                { title: "제주도 여행 인기 코스 TOP10", items: [{ img: "/images/jeju-beach.png", text: "금릉해변과 카페 맛집 코스" }, { img: "/images/jeju-hill.png", text: "제주 오름과 먹방 숙소 추천" }, { img: "/images/jeju-forest.png", text: "제주 비밀의 숲 힐링 코스" }, { img: "/images/jeju-beach.png", text: "애월 해안도로 드라이브" }, { img: "/images/jeju-hill.png", text: "성산일출봉 해돋이 투어" }, { img: "/images/jeju-forest.png", text: "안돌오름 비밀의 숲 산책" }, { img: "/images/jeju-beach.png", text: "우도 당일치기 자전거 코스" }, { img: "/images/jeju-hill.png", text: "한라산 영실코스 등반" }] },
                { title: "부산 여행 인기 코스 TOP10", items: [{ img: "/images/restaurant-1.png", text: "해운대 오션뷰 감성 숙소 모음" }, { img: "/images/restaurant-2.png", text: "광안리 야경과 함께하는 디너" }, { img: "/images/restaurant-1.png", text: "부산 로컬 맛집 투어 코스" }, { img: "/images/restaurant-2.png", text: "청사포 조개구이 먹방 코스" }, { img: "/images/restaurant-1.png", text: "흰여울문화마을 산책로 코스" }, { img: "/images/restaurant-2.png", text: "송도 해상케이블카 뷰 맛집" }, { img: "/images/restaurant-1.png", text: "기장 해동용궁사 힐링 코스" }, { img: "/images/restaurant-2.png", text: "서면 전포 카페거리 투어" }] },
                { title: "경주 여행 인기 코스 TOP10", items: [{ img: "/images/jeju-hill.png", text: "황리단길 핫플 카페 투어" }, { img: "/images/jeju-forest.png", text: "야경이 예쁜 동궁과 월지 코스" }, { img: "/images/jeju-beach.png", text: "불국사부터 시작하는 역사 탐방" }, { img: "/images/restaurant-1.png", text: "경주월드 어뮤즈먼트 코스" }, { img: "/images/jeju-hill.png", text: "대릉원 사진 명소 탐방 코스" }, { img: "/images/jeju-forest.png", text: "첨성대 핑크뮬리 스냅 코스" }, { img: "/images/jeju-beach.png", text: "보문관광단지 호수 산책" }, { img: "/images/restaurant-1.png", text: "교촌마을 한옥 체험과 맛집" }] },
              ].map((section, idx) => (
                <div key={idx} className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] lg:text-[24px] font-bold text-[#111111]">
                      {section.title}
                    </h2>
                    <ChevronRight size={20} className="text-[#abb1b9] cursor-pointer" />
                  </div>
                  <div
                    className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x pl-5 scroll-pl-5 lg:pl-0 lg:scroll-pl-0 -mx-5 lg:mx-0 relative cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => onDragStart(e, idx)}
                    onMouseLeave={() => onDragEnd(idx)}
                    onMouseUp={() => onDragEnd(idx)}
                    onMouseMove={(e) => onDragMove(e, idx)}
                  >
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className={`gap-3 w-[140px] lg:w-[220px] flex-shrink-0 cursor-pointer group snap-start flex-col ${itemIdx >= 5 ? 'hidden lg:flex' : 'flex'}`}
                        onClickCapture={(e) => {
                          // 드래그 중이거나 이미 드래그되었으면 클릭(이동) 방지
                          if (dragState.current[idx]?.dragged) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                          }
                          router.push(`/trips/popular/${idx}-${itemIdx}`)
                        }}
                      >
                        <div className="w-[140px] h-[140px] lg:w-[220px] lg:h-[220px] rounded-2xl overflow-hidden relative bg-[#f5f5f5]">
                          {/* // [ADD] add dummy image handler to prevent crash */}
                          <Image
                            src={item.img}
                            alt="course thumbnail"
                            fill
                            draggable={false}
                            className="object-cover group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <p className="text-[16px] lg:text-[20px] font-medium lg:font-regular text-[#111] leading-tight group-hover:text-[#7a28fa] transition-colors break-keep mt-1 lg:mt-2">
                          {item.text}
                        </p>
                      </div>
                    ))}

                    {/* [ADD] 더보기 버튼 추가 */}
                    <div className="flex flex-col gap-3 w-[100px] lg:w-[140px] flex-shrink-0 cursor-pointer group snap-start items-center justify-center pt-4 lg:pt-8">
                      <div className="w-14 h-14 lg:w-16 lg:h-16 bg-[#f5f7f9] rounded-full flex items-center justify-center group-hover:bg-[#eceff4] transition-colors mt-2">
                        <ChevronRight className="w-6 h-6 lg:w-8 lg:h-8 text-[#6d818f]" />
                      </div>
                      <span className="text-[14px] lg:text-[16px] font-medium text-[#6d818f] mt-1 lg:mt-2">더보기</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
        }
      </div >

      <ActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        title="어떤 방식으로 생성할까요?"
        options={[
          {
            label: "AI 일정 생성",
            onClick: () => {
              resetTravelData(); // [ADD] 기존 입력 데이터 초기화
              setTravelData({ creationType: "ai" });
              router.push("/onboarding/location");
            },
          },
          {
            label: "직접 일정 생성",
            onClick: () => {
              resetTravelData(); // [ADD] 기존 입력 데이터 초기화
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
