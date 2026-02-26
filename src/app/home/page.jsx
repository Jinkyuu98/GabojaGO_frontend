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
  const [ongoingTrips, setOngoingTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        const res = await getScheduleList("B");
        if (res?.schedule_list) {
          const ongoing = res.schedule_list.filter(trip => trip.chStatus?.toUpperCase() === "B");
          setOngoingTrips(ongoing);
          setHasTripData(ongoing.length > 0);
        }
      } catch (err) {
        console.error("일정 목록 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const formatDateRange = (start, end) => {
    if (!start) return "";
    const cleanStart = start.split("T")[0].replace(/-/g, ".");
    if (!end) return cleanStart;
    const cleanEnd = end.split("T")[0].replace(/-/g, ".");
    const startYear = cleanStart.split(".")[0];
    const endYear = cleanEnd.split(".")[0];
    return startYear === endYear ? `${cleanStart} ~ ${cleanEnd.substring(5)}` : `${cleanStart} ~ ${cleanEnd}`;
  };

  // 드래그 스크롤 상태를 각 인덱스별로 관리하는 Ref
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
              className="bg-[#7a28fa] text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-full text-[14px] lg:text-[16px] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => {
                resetTravelData(); // [ADD] 기존 입력 데이터 초기화
                setTravelData({ creationType: "ai" });
                router.push("/onboarding/location");
              }}
            >
              AI 일정 생성
            </button>
          </div>
        </header>

        {/* Dashboard Content - Grid Layout for Desktop */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20 min-h-[50vh]">
            <p className="text-[#898989] text-[15px]">여행 일정을 불러오는 중입니다...</p>
          </div>
        ) : hasTripData ? (
          <div className="lg:grid lg:grid-cols-12 lg:gap-10 px-5">
            {/* Main Travel Card Column */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              <h2 className="hidden lg:block text-[20px] font-bold text-[#111] mb-2">
                나의 진행 중인 여행
              </h2>
              <div className="flex flex-col gap-4">
                {ongoingTrips.map((trip) => {
                  const companionText = trip.strWithWho
                    ? ["친구와", "연인과", "가족과", "부모님과", "친구", "연인", "가족", "부모님"].includes(trip.strWithWho)
                      ? `${trip.strWithWho} 함께`
                      : trip.strWithWho
                    : "나홀로";

                  return (
                    <div
                      key={trip.iPK}
                      className="bg-[#eaf1f7] rounded-2xl p-6 lg:p-8 cursor-pointer hover:shadow-md transition-shadow"
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
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-12 lg:gap-14 mt-12 lg:mt-0">
              {/* Popular Travel Routes */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[18px] lg:text-[20px] font-bold text-[#111111]">
                    인기 여행 코스 TOP10
                  </h2>
                  <button className="text-[14px] font-semibold text-[#7a28fa]">
                    전체보기
                  </button>
                </div>
                <div className="flex flex-col gap-4">
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
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 group cursor-pointer"
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden relative flex-shrink-0">
                        <Image
                          src={item.img}
                          alt="route"
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <p className="text-[15px] font-bold text-[#111] leading-tight group-hover:text-[#7a28fa] transition-colors">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Restaurants */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[18px] lg:text-[20px] font-bold text-[#111111]">
                    실시간 인기 맛집
                  </h2>
                  <button className="text-[14px] font-semibold text-[#7a28fa]">
                    전체보기
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {[
                    {
                      img: "/images/restaurant-1.png",
                      text: "맛있는 초밥집 도쿄",
                    },
                    {
                      img: "/images/restaurant-2.png",
                      text: "정통 파스타 인 로마",
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 group cursor-pointer"
                    >
                      <div className="w-full lg:w-20 h-28 lg:h-20 rounded-2xl overflow-hidden relative">
                        <Image
                          src={item.img}
                          alt="restaurant"
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <p className="text-[15px] font-bold text-[#111] leading-tight group-hover:text-[#7a28fa] transition-colors">
                        {item.text}
                      </p>
                    </div>
                  ))}
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
        )}
      </div>

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
