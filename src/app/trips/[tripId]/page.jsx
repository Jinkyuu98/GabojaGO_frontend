"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { clsx } from "clsx";
import SearchModal from "./SearchModal";
import { MobileContainer } from "../../../components/layout/MobileContainer";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

const DetailTabs = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "schedule", label: "일정", icon: MapIcon },
    { id: "budget", label: "예산", icon: Wallet },
    { id: "checklist", label: "준비물", icon: CheckSquare },
    { id: "companion", label: "동행자", icon: Users },
  ];

  return (
    <div className="flex px-4 py-2 gap-4 border-b border-[#f2f2f7]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={clsx(
            "text-[15px] font-semibold py-2 border-none bg-none relative cursor-pointer",
            {
              "text-[#111] after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-[#111]":
                activeTab === tab.id,
              "text-[#8e8e93]": activeTab !== tab.id,
            },
          )}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default function TripDetailPage() {
  const params = useParams();
  const tripId = params.tripId;
  const router = useRouter();
  const { myTrips } = useOnboardingStore();

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
        { category: "식비", amount: 500000, color: "#3b82f6", percentage: 25 },
        {
          category: "교통비",
          amount: 500000,
          color: "#ffa918",
          percentage: 12,
        },
        { category: "기타", amount: 500000, color: "#b115fa", percentage: 6 },
      ],
      planned: [
        {
          category: "숙박비",
          amount: 500000,
          color: "#14b8a6",
          percentage: 62,
        },
        { category: "식비", amount: 500000, color: "#3b82f6", percentage: 25 },
        {
          category: "교통비",
          amount: 500000,
          color: "#ffa918",
          percentage: 12,
        },
        { category: "기타", amount: 500000, color: "#b115fa", percentage: 6 },
      ],
    },
    checklist: [
      { id: 1, name: "충전기", checked: false },
      { id: 2, name: "충전기", checked: false },
      { id: 3, name: "충전기", checked: false },
      { id: 4, name: "충전기", checked: false },
      { id: 5, name: "충전기", checked: false },
      { id: 6, name: "충전기", checked: false },
      { id: 7, name: "충전기", checked: false },
    ],
    companions: [
      { id: 1, name: "홍길동", isOwner: true },
      { id: 2, name: "홍길동", isOwner: false },
      { id: 3, name: "홍길동", isOwner: false },
      { id: 4, name: "홍길동", isOwner: false },
      { id: 5, name: "홍길동", isOwner: false },
      { id: 6, name: "홍길동", isOwner: false },
      { id: 7, name: "홍길동", isOwner: false },
      { id: 8, name: "홍길동", isOwner: false },
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

  const [apiTrip, setApiTrip] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const { getScheduleList, getScheduleLocations, getScheduleExpenses, getScheduleUsers } = await import("../../../services/schedule");

        // 1) 기본 정보와 3가지 상세 정보를 병렬로 호출합니다.
        const [resA, resB, resC, locationRes, expenseRes, userRes] = await Promise.all([
          getScheduleList("a"),
          getScheduleList("b"),
          getScheduleList("c"),
          getScheduleLocations(tripId).catch(() => null),
          getScheduleExpenses(tripId).catch(() => null),
          getScheduleUsers(tripId).catch(() => null)
        ]);

        const allTrips = [
          ...(resA?.schedule_list || []),
          ...(resB?.schedule_list || []),
          ...(resC?.schedule_list || [])
        ];
        const found = allTrips.find(t => String(t.iPK) === String(tripId));

        if (found) {
          // 일차 수 계산
          const startDate = new Date(found.dtDate1 || found.startDate);
          const endDate = new Date(found.dtDate2 || found.endDate);
          const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          const diffDays = Math.floor((endUtc - startUtc) / (1000 * 3600 * 24)) + 1;
          const dayCount = (diffDays > 0 && !isNaN(diffDays)) ? diffDays : 1;

          // 장소 (location_list -> days)
          const newDays = Array.from({ length: dayCount }, () => ({ places: [], records: [] }));
          if (locationRes?.location_list) {
            const list = Array.isArray(locationRes.location_list) ? locationRes.location_list :
              (typeof locationRes.location_list === "string" ? JSON.parse(locationRes.location_list.replace(/'/g, '"')) : []);

            list.forEach(locItem => {
              if (!locItem.dtSchedule || !locItem.location) return;
              const locDate = new Date(locItem.dtSchedule.split(" ")[0].replace(/-/g, "/")); // Safari 호환
              const locUtc = Date.UTC(locDate.getFullYear(), locDate.getMonth(), locDate.getDate());
              let dayIdx = Math.floor((locUtc - startUtc) / (1000 * 3600 * 24));
              if (dayIdx < 0) dayIdx = 0;
              if (dayIdx >= dayCount) dayIdx = dayCount - 1;
              if (isNaN(dayIdx)) dayIdx = 0;

              const timeParts = locItem.dtSchedule.split(" ");
              const timeStr = timeParts.length > 1 ? timeParts[1].substring(0, 5) : "10:00";

              newDays[dayIdx].places.push({
                name: locItem.location.strName,
                time: timeStr,
                duration: "1시간",
                latitude: parseFloat(locItem.location.ptLatitude || 0),
                longitude: parseFloat(locItem.location.ptLongitude || 0)
              });
            });
          }

          // 비용 (expense_list -> budget.spent)
          let newSpent = [];
          if (expenseRes?.expense_list) {
            try {
              const eList = typeof expenseRes.expense_list === "string"
                ? JSON.parse(expenseRes.expense_list.replace(/'/g, '"'))
                : (Array.isArray(expenseRes.expense_list) ? expenseRes.expense_list : []);

              const categoryColors = { "숙박비": "#14b8a6", "식비": "#3b82f6", "교통비": "#ffa918", "기타": "#b115fa", "쇼핑": "#f43f5e", "관광": "#8b5cf6" };
              const totalB = found.nTotalBudget || 500000;

              newSpent = eList.map(exp => ({
                category: exp.chCategory || "기타",
                amount: exp.nMoney || 0,
                color: categoryColors[exp.chCategory] || "#b115fa",
                percentage: Math.round(((exp.nMoney || 0) / totalB) * 100)
              }));
            } catch (e) { console.error("Expense parse error", e); }
          }

          // 동행자 (user_list -> companions)
          let newCompanions = [];
          if (userRes?.user_list) {
            try {
              const uList = typeof userRes.user_list === "string"
                ? JSON.parse(userRes.user_list.replace(/'/g, '"'))
                : (Array.isArray(userRes.user_list) ? userRes.user_list : []);

              newCompanions = uList.map((usr, i) => ({
                id: usr.iUserFK,
                name: `유저 ${usr.iUserFK}`,
                isOwner: i === 0
              }));
            } catch (e) { console.error("User parse error", e); }
          }

          setApiTrip({
            id: found.iPK,
            title: found.strWhere ? `${found.strWhere} 여행` : "여행 일정",
            startDate: found.dtDate1,
            endDate: found.dtDate2,
            dtDate1: found.dtDate1,
            dtDate2: found.dtDate2,
            companion: found.strWithWho,
            totalBudget: found.nTotalBudget,
            travelStyle: found.strTripStyle,
            // 매핑한 상세 정보 연동
            days: newDays.length > 0 ? newDays : MOCK_TRIP.days,
            budget: {
              total: found.nTotalBudget || 500000,
              spent: newSpent.length > 0 ? newSpent : MOCK_TRIP.budget.spent,
              planned: MOCK_TRIP.budget.planned,
            },
            companions: newCompanions.length > 0 ? newCompanions : MOCK_TRIP.companions,
            checklist: MOCK_TRIP.checklist,
          });
        }
      } catch (err) {
        console.error("일정 상세 조회 실패:", err);
      }
    };
    fetchTrip();
  }, [tripId]);

  const trip = useMemo(
    () =>
      apiTrip ||
      myTrips.find((t) => String(t.id) === String(tripId)) ||
      (tripId === "1" ? MOCK_TRIP : null),
    [apiTrip, myTrips, tripId],
  );

  const [selectedTab, setSelectedTab] = useState("일정");
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(478);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [maxHeight, setMaxHeight] = useState(800);
  const [minHeight] = useState(100);
  const sheetRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  const currentDayPlaces = useMemo(
    () => trip?.days?.[selectedDay - 1]?.places || [],
    [trip, selectedDay],
  );

  const currentDayRecords = useMemo(
    () => trip?.days?.[selectedDay - 1]?.records || [],
    [trip, selectedDay],
  );

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

  useEffect(() => {
    if (!mapInstance.current || !window.kakao) return;

    const map = mapInstance.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (currentDayPlaces.length === 0) return;

    const bounds = new window.kakao.maps.LatLngBounds();

    currentDayPlaces.forEach((place, idx) => {
      if (!place.latitude || !place.longitude) return;

      const position = new window.kakao.maps.LatLng(place.latitude, place.longitude);

      // 마커 생성
      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map
      });

      markersRef.current.push(marker);
      bounds.extend(position);

      // 숫자 라벨 표시 (CustomOverlay 활용)
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

    // 모든 마커가 보이도록 지도 범위 조정
    map.setBounds(bounds);
  }, [currentDayPlaces]);

  // Define 3-tier snap heights
  const SNAPS = {
    LOW: 100,
    MID: 550,
    HIGH: 800,
  };

  const tabs = ["일정", "기록", "비용", "준비물", "동행자"];



  const calculateDayCount = (tripData) => {
    const start = tripData?.dtDate1 || tripData?.startDate;
    const end = tripData?.dtDate2 || tripData?.endDate;

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Calculate difference in time (resetting hours to avoid timezone issues)
      const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      const differenceInDays = Math.floor((endUtc - startUtc) / (1000 * 3600 * 24)) + 1;

      if (differenceInDays > 0 && !isNaN(differenceInDays)) {
        return differenceInDays;
      }
    }

    return tripData?.days?.length || 1; // Fallback
  };

  const dayCount = calculateDayCount(trip);
  const days = Array.from({ length: dayCount }, (_, i) => `${i + 1}일차`);

  const getActualDateText = (dayIndex) => {
    const start = trip?.dtDate1 || trip?.startDate;
    if (!start) return `${dayIndex}일차`;
    try {
      const date = new Date(start);
      date.setDate(date.getDate() + (dayIndex - 1));
      if (isNaN(date.getTime())) return `${dayIndex}일차`;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}월 ${day}일`;
    } catch (e) {
      return `${dayIndex}일차`;
    }
  };

  const formatApiDate = (dayIndex) => {
    const start = trip?.dtDate1 || trip?.startDate;
    if (!start) return "";
    try {
      const date = new Date(start);
      date.setDate(date.getDate() + (dayIndex - 1));
      // Set to current time or a default time
      const now = new Date();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    const h = window.innerHeight;
    const max = h * 0.95;
    const mid = h * 0.6;
    const min = 100;

    setMaxHeight(max);
    setSheetHeight(mid); // Start in Middle

    SNAPS.LOW = min;
    SNAPS.MID = mid;
    SNAPS.HIGH = max;
  }, []);

  const isCollapsed = sheetHeight <= SNAPS.LOW + 20;

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
    const closest = snaps.reduce((prev, curr) => {
      return Math.abs(curr - sheetHeight) < Math.abs(prev - sheetHeight)
        ? curr
        : prev;
    });
    setSheetHeight(closest);
  };

  const handleAddPlaceClick = () => {
    // Check if it's desktop/laptop based on window width
    if (window.innerWidth >= 1024) {
      setIsSearchModalOpen(true);
    } else {
      const formattedDate = formatApiDate(selectedDay);
      router.push(`/search/input?tripId=${tripId}&day=${selectedDay}&date=${encodeURIComponent(formattedDate)}`);
    }
  };

  const handleAddSuccess = () => {
    // Refresh schedule data
    if (tripId) {
      // Small delay to ensure DB updated
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
              <div className="flex flex-col items-center justify-center py-6 px-6 bg-white mt-4">
                <p className="text-[16px] font-semibold text-[#111111] mb-2">{getActualDateText(selectedDay)}</p>
                <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                  {"방문할 장소를 추가해 일정을 채워보세요"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPlaceClick}
                    className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors"
                  >
                    장소 추가
                  </button>
                  <button className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors">찜한 장소로 추가</button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === "기록" && (
          <div className="flex flex-col gap-5">
            {currentDayRecords.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#111111]">
                  108개의 사진
                </span>
                <span className="text-sm font-semibold text-[#7a28fa] cursor-pointer">
                  사진 등록
                </span>
              </div>
            )}

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
              <div className="flex flex-col items-center justify-center py-6 px-6 bg-white mt-4">
                <p className="text-[16px] font-semibold text-[#111111] mb-2">{getActualDateText(selectedDay)}</p>
                <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                  {"사진으로 여행 이야기를 채워보세요"}
                </p>
                <button className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors">사진 추가</button>
              </div>
            )}
          </div>
        )}

        {selectedTab === "비용" && (
          trip.budget && Object.keys(trip.budget).length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-[#111111]">
                    비용 {trip.budget.total.toLocaleString()}원
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
                    onClick={() => router.push(`/trips/${tripId}/camera/receipt`)}
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
                    예상 비용을 초과한 사용 금액이 있어요
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-6 bg-white mt-4">
              <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                {"비용을 설정하고\n사용 내역을 기록해 보세요"}
              </p>
              <button className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors">비용 설정</button>
            </div>
          )
        )}

        {selectedTab === "준비물" && (
          trip.checklist && trip.checklist.length > 0 ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-6 bg-white mt-4">
              <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                {"아직 준비물이 없어요\n여행 전에 필요한 물품을 추가해 보세요"}
              </p>
              <button className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors">준비물 추가</button>
            </div>
          )
        )}

        {selectedTab === "동행자" && (
          trip.companions && trip.companions.length > 0 ? (
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
          ) : (
            <div className="flex flex-col items-center justify-center py-6 px-6 bg-white mt-4">
              <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                {"아직 등록된 동행자가 없어요\n함께 여행할 사람을 추가해 보세요"}
              </p>
              <button className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors">동행자 초대</button>
            </div>
          )
        )}
      </>
    );
  };

  if (!trip) {
    return (
      <MobileContainer>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-[#8e8e93]">
          <p>여행 정보를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push("/home")}
            className="text-[#111] font-bold"
          >
            홈으로 돌아가기
          </button>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer showNav={true} className="lg:max-w-none">
      <div className="relative w-full h-screen bg-white overflow-hidden lg:flex lg:flex-row">
        {/* Left Side Panel - Desktop Only (Moved from Right, Added Search Panel Style) */}
        <div
          className={clsx(
            "hidden lg:flex flex-col h-full bg-white shadow-[4px_0_24px_rgba(0,0,0,0.08)] z-10 relative transition-all duration-300 ease-in-out shrink-0",
            isSidePanelOpen ? "w-[390px]" : "w-0 shadow-none",
          )}
        >
          <div
            className={clsx(
              "flex flex-col h-full w-[390px] transition-opacity duration-200",
              isSidePanelOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
          >
            {/* Desktop Header for Left Panel */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f2f4f6] shrink-0 lg:border-none lg:pb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/trips")}>
                  <Image
                    src="/icons/arrow-left.svg"
                    alt="back"
                    width={20}
                    height={16}
                    className="w-5 h-4"
                  />
                </button>
                <h1 className="text-lg font-semibold text-[#111111] tracking-[-0.5px]">
                  {trip.title}
                </h1>
              </div>
              {/* Optional: if Chatbot button makes sense here */}
              {/* <button className="text-sm font-medium text-[#111111]">챗봇 대화</button> */}
            </div>

            <div className="flex flex-col h-full overflow-hidden">
              {/* Desktop Tabs */}
              <div className="border-b border-[#e5ebf2] px-5 flex-shrink-0">
                <div className="flex items-center gap-4 lg:gap-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setSelectedTab(tab)}
                      className={clsx(
                        "text-[15px] font-semibold tracking-[-0.3px] py-4 transition-all relative lg:text-[16px]",
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
              {["일정", "기록"].includes(selectedTab) && (
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
              )}

              {/* Desktop Content Scroll Area */}
              <div className="flex-1 overflow-y-auto px-5 pt-4 pb-10 scrollbar-hide">
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => {
              setIsSidePanelOpen(!isSidePanelOpen);
              setTimeout(() => {
                if (mapInstance.current) {
                  mapInstance.current.relayout();
                  // Re-center if needed or adjust bounds
                  if (currentDayPlaces.length > 0) {
                    const bounds = new window.kakao.maps.LatLngBounds();
                    currentDayPlaces.forEach((place) => {
                      if (place.latitude && place.longitude) {
                        bounds.extend(new window.kakao.maps.LatLng(place.latitude, place.longitude));
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

        {/* Map Section */}
        <div className="relative flex-1 h-full overflow-hidden">
          <Script
            src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=57dd33d25e0269c9c37a3ea70b3a3b4f&autoload=false&libraries=services"
            strategy="afterInteractive"
            onLoad={initMap}
          />
          {/* Map Background */}
          <div className="absolute inset-0 w-full h-full">
            <div ref={mapRef} className="w-full h-full" />
          </div>

          {/* Header - Mobile Only (Hidden on Desktop since it's moved to Left Panel) */}
          <div className="lg:hidden fixed top-0 left-0 right-0 px-6 pt-4 pb-4 flex items-center justify-between bg-white z-20 shadow-sm max-w-[430px] mx-auto">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/trips")}>
                <Image
                  src="/icons/arrow-left.svg"
                  alt="back"
                  width={20}
                  height={16}
                  className="w-5 h-4"
                />
              </button>
              <h1 className="text-lg font-semibold text-[#111111] tracking-[-0.5px]">
                {trip.title}
              </h1>
            </div>
            <button className="text-sm font-medium text-[#111111]">
              챗봇 대화
            </button>
          </div>
        </div>

        {/* Bottom Sheet - Mobile Only */}
        <div
          ref={sheetRef}
          className="lg:hidden fixed left-0 right-0 bg-white rounded-t-xl shadow-[0px_-4px_12px_rgba(0,0,0,0.04)] transition-all z-20 max-w-[430px] mx-auto"
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

          {/* Mobile Tabs - Hidden when collapsed */}
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

          {/* Mobile Day Tabs - Visible only on specific tabs */}
          {["일정", "기록"].includes(selectedTab) && (
            <div className="px-5 pt-4 pb-3 flex gap-1 overflow-x-auto scrollbar-hide">
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
          )}

          {/* Mobile Content visible only when not collapsed */}
          {!isCollapsed && (
            <div
              className="px-5 pb-24 overflow-y-auto"
              style={{ maxHeight: `${sheetHeight - 160}px` }}
            >
              {renderTabContent()}
            </div>
          )}
        </div>
      </div>

      {/* PC Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        tripId={tripId}
        day={selectedDay}
        formattedDate={formatApiDate(selectedDay)}
        onAddSuccess={handleAddSuccess}
      />
    </MobileContainer>
  );
}
