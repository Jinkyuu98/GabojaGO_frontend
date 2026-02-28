"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script"; // [ADD] Script import for Kakao Map
import { clsx } from "clsx";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

export default function ResultPage() {
  const router = useRouter();
  const { saveTrip, generatedTripData } = useOnboardingStore();
  const [selectedTab, setSelectedTab] = useState("일정");
  const [selectedDay, setSelectedDay] = useState(1);
  const [sheetHeight, setSheetHeight] = useState(478);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [maxHeight, setMaxHeight] = useState(800);
  const [minHeight] = useState(100);
  const sheetRef = useRef(null);

  // [ADD] 데스크톱 레이아웃 및 카카오맵 관련 상태
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // Define 3-tier snap heights
  const SNAPS = {
    LOW: 100,
    MID: 550, // Roughly 60-70% on many devices
    HIGH: 800,
  };

  const tabs = ["일정"]; // [MOD] 불필요한 탭 없앰

  // Mock Trip Data (Sync with TripDetailPage structure)
  const MOCK_TRIP = {
    id: "1",
    title: "제주도 여행",
    budget: {
      total: 500000,
      spent: [
        {
          category: "숙박비",
          amount: 500000,
          color: "#14b8a6",
          percentage: 62,
        },
        { category: "식비", amount: 150000, color: "#3b82f6", percentage: 25 },
        {
          category: "교통비",
          amount: 80000,
          color: "#ffa918",
          percentage: 12,
        },
        { category: "기타", amount: 40000, color: "#b115fa", percentage: 6 },
      ],
      planned: [
        {
          category: "숙박비",
          amount: 500000,
          color: "#14b8a6",
          percentage: 62,
        },
        { category: "식비", amount: 150000, color: "#3b82f6", percentage: 25 },
        {
          category: "교통비",
          amount: 80000,
          color: "#ffa918",
          percentage: 12,
        },
        { category: "기타", amount: 40000, color: "#b115fa", percentage: 6 },
      ],
    },
    checklist: [
      { id: 1, name: "충전기", checked: false },
      { id: 2, name: "여벌 옷", checked: false },
      { id: 3, name: "세면도구", checked: false },
      { id: 4, name: "상비약", checked: false },
      { id: 5, name: "신분증", checked: false },
      { id: 6, name: "보조배터리", checked: false },
      { id: 7, name: "우산/우의", checked: false },
    ],
    companions: [
      { id: 1, name: "나", isOwner: true },
      { id: 2, name: "김철수", isOwner: false },
      { id: 3, name: "이영희", isOwner: false },
    ],
    days: [
      {
        places: [
          { name: "제주산방산탄산온천", time: "10:00", duration: "1시간" },
          { name: "카멜리아 힐", time: "12:00", duration: "2시간" },
          { name: "헬로키티아일랜드", time: "14:00", duration: "1.5시간" },
          { name: "제주도해안도로", time: "16:00", duration: "2시간" },
        ],
        records: [
          {
            name: "제주산방산탄산온천",
            photos: [
              { src: "/images/trip-photo-1.png", likes: 20 },
              { src: "/images/trip-photo-2.png" },
              { src: "/images/trip-photo-3.png", moreCount: 12 },
            ],
          },
          {
            name: "카멜리아 힐",
            photos: [
              { src: "/images/trip-photo-1.png" },
              { src: "/images/trip-photo-2.png" },
              { src: "/images/trip-photo-3.png", moreCount: 12 },
            ],
          },
        ],
      },
      { places: [], records: [] },
      { places: [], records: [] },
    ],
  };

  // Transform AI Data to UI mockup structure
  const trip = generatedTripData ? {
    ...MOCK_TRIP,
    days: generatedTripData.day_schedules?.map((dayObj) => ({
      places: dayObj.activities?.map((act) => ({
        name: act.kakao_location?.strName || act.place_name,
        time: act.dtSchedule ? act.dtSchedule.split(' ')[1]?.substring(0, 5) : "",
        duration: act.strMemo || "방문",
        kakao: act.kakao_location || null // 실제 지도 렌더링에 사용할 카카오 API 데이터
      })) || [],
      records: []
    })) || []
  } : MOCK_TRIP;
  const currentDayPlaces = trip.days?.[selectedDay - 1]?.places || [];
  const currentDayRecords = trip.days?.[selectedDay - 1]?.records || [];
  const dayCount = trip.days?.length || 1;
  const days = Array.from({ length: dayCount }, (_, i) => `${i + 1}일차`);

  // [ADD] 카카오맵 초기화 로직
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
    if (window.kakao && !mapInstance.current) {
      initMap();
    }
  }, []);

  // [ADD] 일정에 따라 카카오맵 마커 동기화
  useEffect(() => {
    if (!mapInstance.current || !window.kakao) return;
    const map = mapInstance.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (currentDayPlaces.length === 0) return;

    const bounds = new window.kakao.maps.LatLngBounds();

    currentDayPlaces.forEach((place, idx) => {
      const lat = place.kakao?.y || place.kakao?.ptLatitude;
      const lng = place.kakao?.x || place.kakao?.ptLongitude;

      if (!lat || !lng) return;

      const position = new window.kakao.maps.LatLng(parseFloat(lat), parseFloat(lng));

      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map
      });

      markersRef.current.push(marker);
      bounds.extend(position);

      const content = `
        <div class="bg-[#7a28fa] text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md text-[13px] font-bold mb-10">
          ${idx + 1}
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 1.2
      });

      overlay.setMap(map);
      markersRef.current.push(overlay);
    });

    if (markersRef.current.length > 0) {
      map.setBounds(bounds);
    }
  }, [currentDayPlaces]);

  useEffect(() => {
    const h = window.innerHeight;
    const max = h * 0.95;
    const mid = h * 0.6;
    const min = 100;

    setMaxHeight(max);
    setSheetHeight(mid); // Start in Middle

    // Update SNAPS mapping
    SNAPS.LOW = min;
    SNAPS.MID = mid;
    SNAPS.HIGH = max;
  }, []);

  // Calculate sheet percentage (0-100%)
  const isCollapsed = sheetHeight <= SNAPS.LOW + 20;
  const isSheetPulledDown = isCollapsed;

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(sheetHeight);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    const newHeight = Math.max(
      minHeight,
      Math.min(maxHeight, currentY - deltaY),
    );
    setSheetHeight(newHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    const h = window.innerHeight;
    const snaps = [minHeight, h * 0.6, h * 0.95];

    // Find closest snap point
    const closest = snaps.reduce((prev, curr) => {
      return Math.abs(curr - sheetHeight) < Math.abs(prev - sheetHeight)
        ? curr
        : prev;
    });

    setSheetHeight(closest);
  };

  const handleSaveSchedule = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // 비로그인 상태일 땐 로그인 페이지로 이동 후 자동 저장되게끔 fallback 유지
        router.push("/login?from=result_save&showClose=true");
        return;
      }

      // API 연동하여 생성 및 상세 페이지 이동
      const newTrip = await saveTrip();
      if (newTrip && newTrip.id) {
        router.push(`/trips/${newTrip.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("일정 생성에 실패했습니다.");
    }
  };

  const renderTabContent = () => {
    return (
      <>
        {selectedTab === "일정" && (
          <div className="flex flex-col gap-6">
            {currentDayPlaces.length > 0 ? (
              currentDayPlaces.map((place, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="w-6 h-6 rounded-full bg-[#7a28fa] text-white text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    {idx < currentDayPlaces.length - 1 && (
                      <div className="w-[1px] h-5 bg-[rgba(229,235,241,0.7)]" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-5 mb-2">
                      <h3 className="text-base font-semibold text-[#111111] tracking-[-0.06px]">
                        {place.name}
                      </h3>
                      <Image
                        src="/icons/dots-menu.svg"
                        alt="menu"
                        width={18}
                        height={4}
                        className="flex-shrink-0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#7a28fa] tracking-[-0.06px]">
                        {place.time || "10:00"}
                      </span>
                      <span className="text-sm text-[#6e6e6e] tracking-[-0.06px]">
                        {place.duration || "1시간"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-[#8e8e93]">
                일정이 없습니다.
              </div>
            )}
          </div>
        )}

        {selectedTab === "기록" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#111111]">
                108개의 사진
              </span>
              <span className="text-sm font-semibold text-[#7a28fa] cursor-pointer">
                사진 등록
              </span>
            </div>

            {currentDayRecords.length > 0 ? (
              currentDayRecords.map((record, idx) => (
                <div key={idx} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-5">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#7a28fa] text-white text-sm font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <h3 className="text-base font-semibold text-[#111111] tracking-[-0.06px]">
                        {record.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Image
                        src="/icons/edit.svg"
                        alt="edit"
                        width={13}
                        height={13}
                      />
                      <span className="text-sm font-medium text-[#c7c8d8] tracking-[-0.35px]">
                        리뷰
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-[2px] overflow-x-auto scrollbar-hide">
                    {record.photos.map((photo, photoIdx) => (
                      <div
                        key={photoIdx}
                        className="relative w-[110px] h-[110px] flex-shrink-0"
                      >
                        <Image
                          src={photo.src}
                          alt={`photo-${photoIdx}`}
                          fill
                          className={clsx(
                            "object-cover",
                            photoIdx === 0 && "rounded-l-lg",
                            photoIdx === record.photos.length - 1 &&
                            "rounded-r-lg",
                          )}
                        />
                        {photoIdx === 0 && photo.likes && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1">
                            <Image
                              src="/icons/heart-fill.svg"
                              alt="likes"
                              width={17}
                              height={15}
                            />
                            <span className="text-[15px] font-medium text-white">
                              {photo.likes}
                            </span>
                          </div>
                        )}
                        {photoIdx === record.photos.length - 1 &&
                          photo.moreCount && (
                            <div className="absolute inset-0 bg-black/50 rounded-r-lg flex items-center justify-center">
                              <span className="text-base font-semibold text-white tracking-[-0.1px]">
                                +{photo.moreCount}
                              </span>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-[#8e8e93]">
                기록이 없습니다.
              </div>
            )}
          </div>
        )}

        {selectedTab === "예산" && trip.budget && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-[#111111]">
                  예산 {trip.budget.total.toLocaleString()}원
                </span>
                <Image
                  src="/icons/edit-purple.svg"
                  alt="edit"
                  width={15}
                  height={15}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm font-semibold text-[#7a28fa] bg-transparent border-none p-0 cursor-pointer"
                  onClick={() => router.push(`/trips/1/camera/receipt`)}
                >
                  영수증 등록
                </button>
                <span className="text-sm font-semibold text-[#8e8e93]">
                  내역
                </span>
              </div>
            </div>

            <div className="h-[1px] bg-[#f2f4f6]" />

            <div className="flex flex-col gap-4">
              <h3 className="text-base font-semibold text-[#111111] tracking-[-0.5px]">
                사용 금액
              </h3>
              <div className="flex gap-6 items-center">
                <div className="relative w-[159px] h-[159px] flex-shrink-0">
                  <Image
                    src="/icons/donut-chart.svg"
                    alt="chart"
                    width={159}
                    height={159}
                  />
                  <span className="absolute top-[66px] right-[10px] text-[13px] font-semibold text-white">
                    62%
                  </span>
                  <span className="absolute top-[93px] left-[11px] text-[13px] font-semibold text-white">
                    25%
                  </span>
                  <span className="absolute top-[34px] left-[12px] text-[13px] font-semibold text-white">
                    12%
                  </span>
                  <span className="absolute top-[13px] left-[47px] text-[13px] font-semibold text-white">
                    6%
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-xs text-[#abb1b9]">카테고리</span>
                    <span className="text-xs text-[#abb1b9]">사용 금액</span>
                  </div>
                  <div className="h-[1px] bg-[#f2f4f6]" />
                  {trip.budget.spent.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-[#556574]">
                          {item.category}
                        </span>
                      </div>
                      <span
                        className={clsx(
                          "text-sm font-semibold",
                          item.category === "식비"
                            ? "text-[#ff0909]"
                            : "text-[#111111]",
                        )}
                      >
                        {item.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 bg-[#fff1f1] rounded-lg py-3">
                <Image
                  src="/icons/danger.svg"
                  alt="warning"
                  width={15}
                  height={14}
                />
                <span className="text-[13px] font-medium text-[#ff0909]">
                  예산을 넘은 사용 금액이 있어요
                </span>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "준비물" && trip.checklist && (
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex items-center justify-between gap-5">
              <span className="text-sm font-semibold text-[#111111]">
                준비물 {trip.checklist.length}개
              </span>
              <span className="text-sm font-semibold text-[#7a28fa] cursor-pointer">
                준비물 추가
              </span>
            </div>

            <div className="flex flex-col gap-3 bg-[#f9fafb] rounded-xl p-4">
              {trip.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-[18px] h-[18px] rounded cursor-pointer">
                      <Image
                        src="/icons/checkbox-unchecked.svg"
                        alt="checkbox"
                        width={18}
                        height={18}
                      />
                    </div>
                    <span className="text-base text-[#111111] tracking-[-0.4px]">
                      {item.name}
                    </span>
                  </div>
                  <Image
                    src="/icons/dots-menu.svg"
                    alt="menu"
                    width={18}
                    height={4}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "동행자" && trip.companions && (
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex items-center justify-between gap-5">
              <span className="text-sm font-semibold text-[#111111]">
                등록된 동행자 {trip.companions.length}명
              </span>
              <span className="text-sm font-semibold text-[#7a28fa] cursor-pointer">
                동행자 초대
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {trip.companions.map((companion) => (
                <div
                  key={companion.id}
                  className="flex items-center gap-3 bg-white rounded-lg border border-[#f2f4f6] px-4 py-3"
                >
                  <div className="w-5 h-5 flex-shrink-0">
                    <Image
                      src="/icons/profile.svg"
                      alt="profile"
                      width={20}
                      height={20}
                    />
                  </div>
                  <span className="text-sm text-[#111111] font-medium truncate">
                    {companion.name}
                  </span>
                  {companion.isOwner && (
                    <Image
                      src="/icons/crown.svg"
                      alt="owner"
                      width={14}
                      height={10}
                      className="ml-auto flex-shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden lg:flex lg:flex-row">
      <Script
        src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=57dd33d25e0269c9c37a3ea70b3a3b4f&autoload=false&libraries=services"
        strategy="afterInteractive"
        onLoad={initMap}
      />

      {/* ----------------- Desktop Left Panel ----------------- */}
      <div
        className={clsx(
          "hidden lg:flex flex-col h-full bg-white shadow-[4px_0_24px_rgba(0,0,0,0.08)] z-20 relative transition-all duration-300 ease-in-out shrink-0",
          isSidePanelOpen ? "w-[390px]" : "w-0 shadow-none",
        )}
      >
        <div
          className={clsx(
            "flex flex-col h-full w-[390px] transition-opacity duration-200",
            isSidePanelOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f2f4f6] shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/login")}>
                <Image
                  src="/icons/close-icon.svg"
                  alt="back"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </button>
              <h1 className="text-lg font-semibold text-[#111111] tracking-[-0.5px]">
                {trip.title}
              </h1>
            </div>
            {/* 챗봇 버튼 제거 (온보딩 결과 화면에는 생략) */}
          </div>

          <div className="flex flex-col h-full overflow-hidden relative">
            {/* Desktop Tabs */}
            <div className="border-b border-[#e5ebf2] px-5 flex-shrink-0">
              <div className="flex items-center gap-4">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={clsx(
                      "text-[15px] font-semibold tracking-[-0.3px] py-4 transition-all relative",
                      selectedTab === tab ? "text-[#111111]" : "text-[#898989]",
                    )}
                  >
                    {tab}
                    {selectedTab === tab && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-[#111111]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Day Tabs */}
            <div className="px-5 pt-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide flex-shrink-0">
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index + 1)}
                  className={clsx(
                    "whitespace-nowrap px-4 py-1.5 rounded-full text-[14px] font-medium transition-all border",
                    selectedDay === index + 1
                      ? "bg-[#111111] text-white border-[#111111] font-semibold"
                      : "bg-white text-[#111111] border-[#DBDBDB] hover:bg-gray-50",
                  )}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24 scrollbar-hide">
              {renderTabContent()}
            </div>

            {/* Submit Button */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-white z-30">
              <button
                onClick={handleSaveSchedule}
                className="w-full py-[14px] bg-[#111111] rounded-xl text-base font-semibold text-white tracking-[-0.06px]"
              >
                일정 저장 및 편집
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Panel Button */}
        <button
          onClick={() => {
            setIsSidePanelOpen(!isSidePanelOpen);
            setTimeout(() => {
              if (mapInstance.current) {
                mapInstance.current.relayout();
                if (markersRef.current.length > 0) {
                  const bounds = new window.kakao.maps.LatLngBounds();
                  currentDayPlaces.forEach((place) => {
                    const lat = place.kakao?.y || place.kakao?.ptLatitude;
                    const lng = place.kakao?.x || place.kakao?.ptLongitude;
                    if (lat && lng) {
                      bounds.extend(new window.kakao.maps.LatLng(lat, lng));
                    }
                  });
                  mapInstance.current.setBounds(bounds);
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

      {/* ----------------- Right Map & Mobile Area ----------------- */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Actual Map Render Target */}
        <div className="absolute inset-0 w-full h-full bg-[#f5f5f5]">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden fixed top-0 left-0 right-0 px-6 pt-4 pb-4 flex items-center justify-between bg-white z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/login")}>
              <Image
                src="/icons/close-icon.svg"
                alt="close"
                width={20}
                height={20}
                className="w-5 h-5"
              />
            </button>
            <h1 className="text-lg font-semibold text-[#111111] tracking-[-0.5px]">
              {trip.title}
            </h1>
          </div>
        </div>

        {/* Mobile Floating schedule preview */}
        {isSheetPulledDown && currentDayPlaces.length > 0 && (
          <div
            className="lg:hidden absolute left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg px-4 py-3 transition-all duration-300 w-[90%] z-10"
            style={{ bottom: `${sheetHeight + 20}px` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#7a28fa] text-white text-sm font-bold flex items-center justify-center">
                1
              </div>
              <div>
                <p className="text-base font-semibold text-[#111111] tracking-[-0.06px]">
                  {currentDayPlaces[0].name}
                </p>
                <p className="text-sm text-[#7a28fa] tracking-[-0.06px]">
                  {currentDayPlaces[0].time}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- Mobile Bottom Sheet (Hidden on Desktop) ----------------- */}
      <div
        ref={sheetRef}
        className="lg:hidden fixed left-0 right-0 bg-white rounded-t-xl shadow-[0px_-4px_12px_rgba(0,0,0,0.04)] transition-all z-20"
        style={{
          height: `${sheetHeight}px`,
          bottom: 0,
        }}
      >
        {/* Drag Handle */}
        <div
          className="pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto" />
        </div>

        {/* Mobile Tabs */}
        {!isCollapsed && (
          <div className="border-b border-[#e5ebf2] px-5">
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={clsx(
                    "text-[15px] font-semibold tracking-[-0.3px] py-3 transition-all relative",
                    selectedTab === tab ? "text-[#111111]" : "text-[#898989]",
                  )}
                >
                  {tab}
                  {selectedTab === tab && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-[#111111]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Day Tabs */}
        <div className="px-5 pt-4 pb-3 flex gap-1 overflow-x-auto scrollbar-hide">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDay(index + 1)}
              className={clsx(
                "px-4 py-2 rounded-full text-[15px] font-semibold whitespace-nowrap transition-colors",
                selectedDay === index + 1
                  ? "bg-[#111111] text-white"
                  : "bg-transparent text-[#111111] font-normal border border-[#DBDBDB]",
              )}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Mobile Content Area */}
        {!isCollapsed && (
          <>
            <div
              className="px-5 pb-24 overflow-y-auto"
              style={{ maxHeight: `${sheetHeight - 160}px` }}
            >
              {renderTabContent()}
            </div>

            {/* Bottom Form Action */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-white z-30">
              <button
                onClick={handleSaveSchedule}
                className="w-full py-[14px] bg-[#111111] rounded-xl text-base font-semibold text-white tracking-[-0.06px]"
              >
                일정 저장 및 편집
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
