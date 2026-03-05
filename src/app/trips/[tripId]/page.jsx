"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { clsx } from "clsx";
import SearchModal from "./SearchModal";
import MobilePlaceSearchSheet from "./MobilePlaceSearchSheet"; // [ADD] 모바일 장소 검색 바텀시트
import PlaceDetailPanel from "./PlaceDetailPanel"; // [ADD] 장소 상세(리뷰) 패널 추가
import { MobileContainer } from "../../../components/layout/MobileContainer";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  Search,
  Plus,
  Trash2,
  X,
  Camera,
  Image as ImageIcon,
  CheckSquare
} from "lucide-react"; // [ADD] 휴지통 아이콘 추가
import {
  removeScheduleLocation, modifyScheduleLocation,
  removeScheduleExpense, modifyScheduleExpense, addScheduleExpense, // [ADD] addScheduleExpense 추가
  getSchedulePreparations, addSchedulePreparation, modifySchedulePreparation, removeSchedulePreparation,
  addScheduleUser, removeScheduleUser, getScheduleUsers // [ADD] 동행자 API 추가
} from "../../../services/schedule";
import { searchUserByName } from "../../../services/auth"; // [ADD] 사용자 검색 API

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
      total: 0,
      spent: [],
      planned: [],
    },
    checklist: [], // [MOD] 기본 MOCK 비우기 (API 연동)
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
  const [editingPlace, setEditingPlace] = useState(null); // [ADD] 장소 수정 모달 상태
  // [ADD] 비용 내역/수정 관련 상태
  const [showExpenseDetail, setShowExpenseDetail] = useState(false); // 내역 뷰 토글
  const [editingBudget, setEditingBudget] = useState(null); // 예산 수정 모달
  const [expenseRawList, setExpenseRawList] = useState([]); // 개별 지출 원본 데이터
  const [editingExpense, setEditingExpense] = useState(null); // [ADD] 개별 지출 수정 모달
  const [isAddingExpense, setIsAddingExpense] = useState(false); // [ADD] 지출 직접 입력 모달
  const [newExpense, setNewExpense] = useState({ chCategory: "F", nMoney: "", dtExpense: "", strMemo: "" });
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState(null); // [ADD] 지출 내역 필터링용 카테고리 선택 상태
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false); // [ADD] 영수증 파싱 로딩 상태

  const fileInputRef = useRef(null); // [ADD] 불러오기 파일 선택기 참조

  // [ADD] 카카오맵 로드 상태 관리 (새로고침 시 마커 누락 방지용)
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  // [ADD] 현재 선택(클릭)된 장소 인덱스 추적 (동일 좌표 마커 겹침 해결용)
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(null);
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState(null); // [ADD] 좌측 장소 상세(리뷰) 패널 상태

  // [ADD] 준비물 관련 상태
  const [isAddingPreparation, setIsAddingPreparation] = useState(false);
  const [newPreparationName, setNewPreparationName] = useState("");

  // [ADD] 동행자 초대 모달 관련 상태
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const [companionSearchQuery, setCompanionSearchQuery] = useState("");
  const [companionSearchResults, setCompanionSearchResults] = useState([]);
  const [isSearchingCompanion, setIsSearchingCompanion] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const { getScheduleList, getScheduleLocations, getScheduleExpenses, getScheduleUsers, getSchedulePreparations } = await import("../../../services/schedule");

        // 1) 기본 정보와 4가지 상세 정보를 병렬로 호출합니다.
        const [resA, resB, resC, locationRes, expenseRes, userRes, prepRes] = await Promise.all([
          getScheduleList("a"),
          getScheduleList("b"),
          getScheduleList("c"),
          getScheduleLocations(tripId).catch(() => null),
          getScheduleExpenses(tripId).catch(() => null),
          getScheduleUsers(tripId).catch(() => null),
          getSchedulePreparations(tripId).catch(() => null) // [ADD] 준비물 데이터 로드
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
                id: locItem.iPK || locItem.iScheduleLocationPK, // [ADD] 장소 삭제 시 필요한 PK값 매핑
                name: locItem.location.strName,
                time: timeStr,
                duration: locItem.strMemo || "", // [MOD] 빈 메모일 때 "1시간" 대신 빈 문자열 사용
                latitude: parseFloat(locItem.location.ptLatitude || 0),
                longitude: parseFloat(locItem.location.ptLongitude || 0),
                fullItem: locItem // [ADD] 수정을 위해 원본 데이터 추가
              });
            });
          }

          // [MOD] 비용 (expense_list -> budget.spent) - 카테고리 코드→한글 변환 및 카테고리별 그룹핑
          let newSpent = [];
          let rawExpenseItems = []; // [ADD] 개별 지출 원본 리스트
          if (expenseRes?.expense_list) {
            try {
              const eList = typeof expenseRes.expense_list === "string"
                ? JSON.parse(expenseRes.expense_list.replace(/'/g, '"'))
                : (Array.isArray(expenseRes.expense_list) ? expenseRes.expense_list : []);

              // [ADD] 카테고리 코드 → 한글 라벨 매핑
              const categoryLabelMap = { "F": "식비", "T": "교통비", "L": "숙박비", "E": "기타" };
              // [ADD] 카테고리 라벨 → 색상 매핑
              const categoryColors = { "식비": "#3b82f6", "교통비": "#ffa918", "숙박비": "#14b8a6", "기타": "#b115fa" };

              // [ADD] 개별 항목에 한글 라벨/색상 매핑
              rawExpenseItems = eList.map(exp => ({
                ...exp,
                categoryLabel: categoryLabelMap[exp.chCategory] || "기타",
                color: categoryColors[categoryLabelMap[exp.chCategory] || "기타"] || "#b115fa",
              }));

              // [ADD] 카테고리별 금액 그룹핑
              const grouped = {};
              eList.forEach(exp => {
                const label = categoryLabelMap[exp.chCategory] || "기타";
                if (!grouped[label]) grouped[label] = 0;
                grouped[label] += (exp.nMoney || 0);
              });

              const totalSpent = Object.values(grouped).reduce((sum, v) => sum + v, 0);

              newSpent = Object.entries(grouped).map(([label, amount]) => ({
                category: label,
                amount,
                color: categoryColors[label] || "#b115fa",
                percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
              }));

              // [ADD] 금액 내림차순 정렬
              newSpent.sort((a, b) => b.amount - a.amount);
            } catch (e) { console.error("Expense parse error", e); }
          }
          // [ADD] 개별 지출 원본 리스트 저장
          setExpenseRawList(rawExpenseItems);

          // [MOD] 동행자 (user_list -> companions), 스케줄 생성자를 기준으로 왕관 표시
          const ownerUserFK = found.iUserFK; // 스케줄 생성자의 userPK
          let newCompanions = [];
          if (userRes?.user_list) {
            try {
              const uList = typeof userRes.user_list === "string"
                ? JSON.parse(userRes.user_list.replace(/'/g, '"'))
                : (Array.isArray(userRes.user_list) ? userRes.user_list : []);

              // [ADD] 디버그: user_list 응답 구조 확인 (삭제 PK 매핑 검증용)
              console.log("👥 동행자 API 응답 (user_list):", JSON.stringify(uList));

              newCompanions = uList.map((usr) => ({
                id: `user-${usr.iPK}`,
                // [MOD] usr.iPK는 user 테이블 PK이므로 scheduleUserPK로 사용 불가
                // schedule_user iPK는 /schedule/user/list에서 제공하지 않음
                scheduleUserPK: undefined,
                userFK: usr.iUserFK || usr.iPK,
                userId: usr.strUserID || "",
                name: usr.strName || `유저 ${usr.iUserFK || usr.iPK}`,
                isOwner: (usr.iUserFK || usr.iPK) === ownerUserFK
              }));
            } catch (e) { console.error("User parse error", e); }
          }

          // [ADD] 스케줄 생성자가 동행자 목록에 없다면 항상 맨 앞에 추가 (왕관 표시)
          if (!newCompanions.some(c => c.userFK === ownerUserFK)) {
            let ownerName = `유저 ${ownerUserFK}`;
            let ownerUserId = "";
            try {
              const token = localStorage.getItem("token");
              if (token) {
                const payload = JSON.parse(atob(token.split(".")[1]));
                ownerName = payload.strName || payload.name || payload.sub || ownerName;
                ownerUserId = payload.strUserID || payload.sub || "";
              }
            } catch (e) { /* token decode 실패 시 기본값 사용 */ }

            newCompanions.unshift({
              id: `owner-${ownerUserFK}`,
              userFK: ownerUserFK,
              userId: ownerUserId,
              name: ownerName,
              isOwner: true
            });
          }

          // [ADD] 준비물 (preparation_list -> checklist)
          let newChecklist = [];
          if (prepRes?.preparation_list) {
            try {
              const pList = typeof prepRes.preparation_list === "string"
                ? JSON.parse(prepRes.preparation_list.replace(/'/g, '"'))
                : (Array.isArray(prepRes.preparation_list) ? prepRes.preparation_list : []);

              newChecklist = pList.map(prep => ({
                id: prep.iPK,
                scheduleFK: prep.iScheduleFK, // [ADD] modify API 필수 필드
                name: prep.strName,
                checked: prep.bCheck || false
              }));
            } catch (e) { console.error("Preparation parse error", e); }
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
              total: found.nTotalBudget || 0, // [MOD] 기본값 0 (백엔드에서 설정 안 한 경우)
              spent: newSpent, // [MOD] 실제 지출 내역만 표시 (없으면 빈 배열)
              planned: [], // [MOD] MOCK 제거
              // [ADD] 카테고리별 예산 비율 매핑
              foodRatio: found.nFoodRatio || 25,
              transportRatio: found.nTransportRatio || 25,
              lodgingRatio: found.nLodgingRatio || 25,
              // [MOD] nAlarmRatio를 별도 alarmRatio로 분리 (0이면 알림 끔)
              alarmRatio: found.nAlarmRatio ?? 0,
            },
            ownerUserFK, // [ADD] 스케줄 생성자 userPK 보관
            companions: newCompanions.length > 0 ? newCompanions : [],
            checklist: newChecklist, // [MOD] 준비물 데이터 매핑
            raw: found, // [ADD] 서버 통신용 원본 데이터 보관
          });

        }
      } catch (err) {
        console.error("일정 상세 조회 실패:", err);
      }
    };
    fetchTrip();
  }, [tripId]);

  // ==========================================
  // [ADD] 준비물 탭 핸들러 (추가, 토글, 삭제)
  // ==========================================

  const onAddPreparation = async () => {
    if (!newPreparationName.trim()) {
      setIsAddingPreparation(false);
      return;
    }
    try {
      const payload = {
        iPK: 0,
        iScheduleFK: parseInt(tripId, 10),
        strName: newPreparationName.trim(),
        bCheck: false
      };

      // API call
      await addSchedulePreparation(payload);

      // 로컬 상태 즉시 업데이트
      const fetchCall = await getSchedulePreparations(tripId).catch(() => null);

      let newChecklist = [];
      if (fetchCall?.preparation_list) {
        try {
          const pList = typeof fetchCall.preparation_list === "string"
            ? JSON.parse(fetchCall.preparation_list.replace(/'/g, '"'))
            : (Array.isArray(fetchCall.preparation_list) ? fetchCall.preparation_list : []);

          newChecklist = pList.map(prep => ({
            id: prep.iPK,
            name: prep.strName,
            checked: prep.bCheck || false
          }));
        } catch (e) { console.error("Preparation parse error", e); }
      }

      setApiTrip(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          checklist: newChecklist.length > 0 ? newChecklist : [...prev.checklist, { id: Date.now(), name: payload.strName, checked: false }]
        };
      });
      setNewPreparationName("");
      setIsAddingPreparation(false);
    } catch (err) {
      console.error("준비물 추가 중 오류 세부정보:", err.response?.data || err);
      alert("준비물 추가에 실패했습니다. (500 Error)");
    }
  };

  const onTogglePreparation = async (prep) => {
    try {
      // [MOD] 422 에러 수정: iScheduleFK, strName 등 필수 필드 포함
      const payload = {
        iPK: prep.id,
        iScheduleFK: prep.scheduleFK || parseInt(tripId, 10),
        strName: prep.name,
        bCheck: !prep.checked
      };
      await modifySchedulePreparation(payload);

      // 클라이언트 상태 즉시 반영
      setApiTrip(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          checklist: prev.checklist.map(item =>
            item.id === prep.id ? { ...item, checked: !item.checked } : item
          )
        };
      });
    } catch (err) {
      console.error("준비물 상태 변경 오류:", err);
      alert("상태 변경에 실패했습니다.");
    }
  };

  const onRemovePreparation = async (prepId) => {
    if (!window.confirm("이 준비물을 삭제하시겠습니까?")) return;
    try {
      await removeSchedulePreparation(prepId);

      // 클라이언트 상태 즉시 반영
      setApiTrip(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          checklist: prev.checklist.filter(item => item.id !== prepId)
        };
      });
    } catch (err) {
      console.error("준비물 삭제 오류:", err);
      alert("삭제에 실패했습니다.");
    }
  };

  // [MOD] 동행자 자동 검색 (입력 시 1000ms 디바운스)
  useEffect(() => {
    if (!companionSearchQuery.trim()) {
      setCompanionSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCompanion(true);
      try {
        const res = await searchUserByName(companionSearchQuery.trim());
        console.log("🔍 사용자 검색 응답:", JSON.stringify(res));
        setCompanionSearchResults(res?.user_list || []);
      } catch (err) {
        console.error("사용자 검색 실패:", err.response?.status, err.response?.data);
      } finally {
        setIsSearchingCompanion(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [companionSearchQuery]);

  // [MOD] 동행자 추가 핸들러 - addScheduleUser 응답의 iPK(=schedule_user PK)를 직접 사용
  const onAddCompanion = async (user) => {
    try {
      // [MOD] addScheduleUser 응답에서 schedule_user 테이블의 iPK를 받아옴
      const addRes = await addScheduleUser({
        iPK: 0,
        iScheduleFK: parseInt(tripId, 10),
        iUserFK: user.iPK
      });
      console.log("✅ 동행자 추가 응답:", JSON.stringify(addRes));

      // [MOD] refetch 대신 기존 목록에 직접 추가 (addRes.iPK = schedule_user PK)
      const newCompanion = {
        id: addRes.iPK || Date.now(), // schedule_user 테이블의 iPK
        scheduleUserPK: addRes.iPK,   // 삭제 시 이 값을 사용
        userFK: user.iPK,
        userId: user.strUserID || "",
        name: user.strName || `유저 ${user.iPK}`,
        isOwner: false
      };

      setApiTrip(prev => {
        if (!prev) return prev;
        // 이미 추가된 동행자인지 확인
        const exists = prev.companions?.some(c => c.userFK === user.iPK);
        if (exists) return prev;
        return { ...prev, companions: [...(prev.companions || []), newCompanion] };
      });
      setIsCompanionModalOpen(false);
      setCompanionSearchQuery("");
      setCompanionSearchResults([]);
    } catch (err) {
      console.error("동행자 추가 실패:", err.response?.data || err);
      alert("동행자 추가에 실패했습니다.");
    }
  };

  // [MOD] 동행자 삭제 핸들러 - scheduleUserPK(iPK)로 삭제 + 디버그 로그
  const onRemoveCompanion = async (companion) => {
    if (!window.confirm(`${companion.name}님을 동행자에서 삭제하시겠습니까?`)) return;
    const pkToDelete = companion.scheduleUserPK;
    console.log("🗑️ 동행자 삭제 요청:", { companion, pkToDelete });
    if (!pkToDelete) {
      alert("이 동행자는 현재 세션에서 추가되지 않아 삭제할 수 없습니다.\n페이지 새로고침 후 다시 추가하면 삭제가 가능합니다.");
      return;
    }
    try {
      await removeScheduleUser(pkToDelete);
      setApiTrip(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          companions: prev.companions.filter(c => c.scheduleUserPK !== pkToDelete)
        };
      });
    } catch (err) {
      console.error("동행자 삭제 실패:", err.response?.status, err.response?.data);
      alert("동행자 삭제에 실패했습니다.");
    }
  };

  const trip = useMemo(
    () =>
      apiTrip ||
      myTrips.find((t) => String(t.id) === String(tripId)) ||
      (tripId === "1" ? MOCK_TRIP : null),
    [apiTrip, myTrips, tripId],
  );

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

  // [MOD] URL 쿼리 파라미터(?tab=비용)에서 탭 상태를 복원하여 페이지 이동 후에도 탭 유지
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "일정";
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); // [ADD] 모바일 바텀시트 상태
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
  // [ADD] 가로 스크롤 및 드래그 관련 Ref와 상태
  const dayTabsRef = useRef(null);
  const [isMouseDragging, setIsMouseDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // [ADD] 스크롤 위치 감지하여 화살표 노출 여부 결정
  const checkScroll = () => {
    if (dayTabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = dayTabsRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // [ADD] SSR 에러 방지를 위한 isMobile 상태 선언
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      checkScroll();
    };

    // 초기 로드 시 한 번 실행
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [days, selectedTab]);

  // [ADD] 바텀시트 높이 변경 시 지도 리사이징(relayout) 및 중심 재보정
  // [ADD] 바텀시트 높이 변경 시 지도 리사이징(relayout) 동기화
  useEffect(() => {
    if (mapInstance.current && window.kakao) {
      // 바텀시트 transition 300ms 재생 동안 여러 번 리사이징 갱신 (회색 화면, 깨짐 방지)
      let iterations = 0;
      const interval = setInterval(() => {
        if (mapInstance.current) {
          mapInstance.current.relayout();

          // 이미 bounds가 맞춰져 있다면 단순히 리사이징만 하고,
          // 마커 상태 유지를 위해 setBounds 재호출은 드래그 단위 끝에서만 실행하거나 생략
        }
        iterations++;
        if (iterations >= 20) {
          clearInterval(interval);

          // 애니메이션이 완전히 끝난 후 한 번만 중심점을 잡아주어 마커가 온전히 보이게 위치 조정
          const places = trip?.days?.[selectedDay - 1]?.places || [];
          if (mapInstance.current && places.length > 0) {
            const bounds = new window.kakao.maps.LatLngBounds();
            let hasValidCoords = false;
            places.forEach(p => {
              if (p.latitude && p.longitude) {
                bounds.extend(new window.kakao.maps.LatLng(p.latitude, p.longitude));
                hasValidCoords = true;
              }
            });
            if (hasValidCoords) {
              if (places.filter(p => p.latitude && p.longitude).length === 1) {
                mapInstance.current.setCenter(bounds.getSouthWest());
                if (window.innerWidth < 1024) mapInstance.current.panBy(0, 150);
              } else {
                // 하단 패딩은 CSS단에서 이미 sheetHeight로 잡혀 있으므로 API의 bottom 패딩은 여유분만 줌
                mapInstance.current.setBounds(bounds, 50, 50, 50, 50);
              }
            }
          }
        }
      }, 16);

      return () => clearInterval(interval);
    }
  }, [sheetHeight, selectedDay, trip]);

  // [ADD] 마우스 드래그 핸들러
  const handleMouseDown = (e) => {
    if (window.innerWidth < 1024) return; // 데스크톱에서만 작동
    setIsMouseDragging(true);
    setStartX(e.pageX - dayTabsRef.current.offsetLeft);
    setScrollLeft(dayTabsRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDragging) return;
    e.preventDefault();
    const x = e.pageX - dayTabsRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // 스크롤 속도 조절
    dayTabsRef.current.scrollLeft = scrollLeft - walk;
    checkScroll();
  };

  const handleMouseUp = () => {
    setIsMouseDragging(false);
  };

  // [ADD] 화살표 클릭 스크롤
  const scrollDays = (direction) => {
    if (dayTabsRef.current) {
      const scrollAmount = 200;
      dayTabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      setTimeout(checkScroll, 300);
    }
  };

  const currentDayPlaces = useMemo(
    () => trip?.days?.[selectedDay - 1]?.places || [],
    [trip, selectedDay],
  );

  const currentDayRecords = useMemo(
    () => trip?.days?.[selectedDay - 1]?.records || [],
    [trip, selectedDay],
  );

  // [ADD] 장소 이름 클릭 시 지도를 해당 위치로 이동하는 핸들러
  const handlePlaceClick = (place, idx) => { // [MOD] 인덱스도 함께 받음
    setSelectedMarkerIndex(idx); // 상태는 UI(리스트) 갱신용으로만 저장
    setSelectedPlaceDetail(place); // [ADD] 장소 상세 패널 표시를 위해 상태 설정

    // [ADD] 지도를 다시 그리지(useEffect 재실행) 않고, 생성되어 있는 마커들의 zIndex만 즉시 직접 조작하여 퍼포먼스(속도) 극대화
    if (markersRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach((overlay, overlayIdx) => {
        if (overlayIdx === idx) {
          overlay.setZIndex(99);
          // 생성 시 주입된 HTML 문자열의 z-index 스타일도 강제 변경 시도
          const contentStr = overlay.getContent();
          if (typeof contentStr === 'string') {
            const updatedContent = contentStr.replace(/z-index:\s*\d+;/, 'z-index: 99;');
            overlay.setContent(updatedContent);
          }
        } else {
          overlay.setZIndex(10);
          const contentStr = overlay.getContent();
          if (typeof contentStr === 'string') {
            const updatedContent = contentStr.replace(/z-index:\s*\d+;/, 'z-index: 10;');
            overlay.setContent(updatedContent);
          }
        }
      });
    }

    if (!mapInstance.current || !place.latitude || !place.longitude) return;
    const moveLatLng = new window.kakao.maps.LatLng(place.latitude, place.longitude);
    mapInstance.current.setLevel(3); // 확대 레벨 조정
    mapInstance.current.panTo(moveLatLng); // 부드러운 이동
  };

  // [MOD] SPA 네비게이션 대응: kakao.maps.Map이 이미 로드됐으면 직접 생성, 아니면 load() 콜백 사용
  const initMap = () => {
    console.log("🗺️ initMap 호출:", {
      kakaoExists: !!window.kakao,
      kakaoMapsExists: !!window.kakao?.maps,
      kakaoMapConstructor: !!window.kakao?.maps?.Map,
      mapRefExists: !!mapRef.current
    });

    if (!window.kakao) {
      console.log("🗺️ kakao SDK 아직 로드 안됨");
      return;
    }

    if (!mapRef.current) {
      console.log("🗺️ mapRef DOM 아직 준비 안됨, 100ms 후 재시도");
      setTimeout(initMap, 100);
      return;
    }

    // [MOD] 기존 맵이 있으면 마커 정리
    if (mapInstance.current) {
      try {
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
      } catch (e) { /* ignore */ }
      mapInstance.current = null;
    }

    // [MOD] SDK가 완전히 로드된 경우 (Map 생성자가 존재) → 직접 생성
    const createMap = () => {
      if (!mapRef.current) return;
      console.log("🗺️ 카카오맵 생성 중...");
      const center = new window.kakao.maps.LatLng(37.5665, 126.978);
      mapInstance.current = new window.kakao.maps.Map(mapRef.current, {
        center,
        level: 4,
      });
      console.log("🗺️ 카카오맵 생성 완료!");
      setIsMapLoaded(true); // [ADD] 로드 완료 시점 상태 갱신
    };

    if (window.kakao.maps?.Map) {
      // SDK 이미 완전 로드됨 → 바로 생성
      createMap();
    } else {
      // SDK 스크립트는 있지만 아직 maps API 로드 안됨 → load() 콜백 사용
      window.kakao.maps.load(createMap);
    }
  };

  // [MOD] 컴포넌트 마운트 시 맵 초기화 + 언마운트 시 정리
  useEffect(() => {
    mapInstance.current = null;

    // SDK가 이미 있으면 바로 초기화, 없으면 Script onLoad가 처리
    if (window.kakao) {
      // DOM 렌더링 완료 후 실행하기 위해 약간의 딜레이
      const timer = setTimeout(initMap, 50);
      return () => {
        clearTimeout(timer);
        markersRef.current.forEach((m) => { try { m.setMap(null); } catch (e) { } });
        markersRef.current = [];
        mapInstance.current = null;
      };
    }

    return () => {
      markersRef.current.forEach((m) => { try { m.setMap(null); } catch (e) { } });
      markersRef.current = [];
      mapInstance.current = null;
    };
  }, [tripId]);

  useEffect(() => {
    // [MOD] mapInstance뿐 아니라 isMapLoaded 상태도 의존성으로 추가하여 로드 즉시 재실행 보장
    if (!isMapLoaded || !mapInstance.current || !window.kakao) return;

    const map = mapInstance.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (currentDayPlaces.length === 0) return;

    const bounds = new window.kakao.maps.LatLngBounds();

    currentDayPlaces.forEach((place, idx) => {
      if (!place.latitude || !place.longitude) return;

      const position = new window.kakao.maps.LatLng(place.latitude, place.longitude);

      bounds.extend(position);

      // [MOD] Vercel 배포 시 CSS Minification이나 DOM 깨짐을 우회하기 위해 
      // 인라인 style을 최소화하고 보장된 Tailwind 유틸리티 클래스 문자열로 복원
      // [MOD] 사용자가 리스트에서 클릭한 순번(idx)이라면 z-index를 최상위(99)로, 기본은 10
      const zIndex = selectedMarkerIndex === idx ? 99 : 10;

      const content = `
        <div class="flex items-center justify-center bg-[#7a28fa] text-white font-bold border-2 border-white shadow-md rounded-full" 
             style="width: 28px; height: 28px; font-size: 13px; z-index: ${zIndex};">
          ${idx + 1}
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
        zIndex: zIndex // 카카오맵 자체 zIndex 속성도 부여하여 확실하게 위로 올림
      });

      overlay.setMap(map);
      markersRef.current.push(overlay);
    });

    // [MOD] 모든 마커가 보이도록 지도 범위 조정
    const isMobile = window.innerWidth < 1024;

    // 모바일에서는 바텀시트가 하단 절반을 가리므로, 마커가 화면 "상단"에 몰리도록 하단 패딩을 매우 크게 줍니다.
    // 지도 컨테이너 자체가 바텀시트 위치에 따라 transform-y 로 통째로 이동하므로,
    // 초기 렌더링 시 이렇게 위로 몰아주면 바텀시트가 오르내릴 때 자연스럽게 같이 상하로 움직입니다.
    const paddingBottom = isMobile ? 550 : 50;

    if (currentDayPlaces.filter(p => p.latitude && p.longitude).length === 1) {
      map.setCenter(bounds.getSouthWest());
      map.setLevel(isMobile ? 3 : 4);
      if (isMobile) {
        // 단일 마커일 때 화면 최상단으로 조금 올려줌 (지도 컨테이너 전체 이동과 시너지)
        setTimeout(() => map.panBy(0, 150), 50);
      }
    } else {
      map.setBounds(bounds, 50, 50, paddingBottom, 50);
      if (map.getLevel() > 7) {
        map.setLevel(7);
      }
    }
  }, [currentDayPlaces, isMapLoaded]); // [MOD] 선택 인덱스는 의존성에서 제외하여 재렌더링 방지, 클릭 핸들러에서 직접 DOM 조작

  // Define 3-tier snap heights
  const SNAPS = {
    LOW: 100,
    MID: 550,
    HIGH: 800,
  };

  const tabs = ["일정", "기록", "비용", "준비물", "동행자"];

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
      // [MOD] 현재 시간 대신 10:00:00 고정값 사용하여 예측 가능한 기본값 제공
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} 10:00:00`;
    } catch (e) {
      return "";
    }
  };

  const getMinMaxDateTime = () => {
    if (!trip || (!trip.dtDate1 && !trip.startDate)) return { min: undefined, max: undefined };
    try {
      const start = new Date(trip.dtDate1 || trip.startDate);
      const end = new Date(trip.dtDate2 || trip.endDate);

      const formatLocal = (date, isEnd) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = isEnd ? "23" : "00";
        const min = isEnd ? "59" : "00";
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      };

      return {
        min: formatLocal(start, false),
        max: formatLocal(end, true)
      };
    } catch {
      return { min: undefined, max: undefined };
    }
  };
  const { min: minDateTime, max: maxDateTime } = getMinMaxDateTime();

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
      // [MOD] 모바일: 페이지 이동 대신 바텀시트 오픈 (지도 유지)
      setIsMobileSearchOpen(true);
    }
  };

  // [MOD] 장소 추가 후 리로드 없이 state 직접 업데이트
  const handleAddSuccess = (addedData) => {
    if (!tripId || !addedData) return;

    setApiTrip(prev => {
      if (!prev) return prev;

      const { place, dtSchedule, strMemo } = addedData;
      const timeParts = dtSchedule.split(" ");
      const timeStr = timeParts.length > 1 ? timeParts[1].substring(0, 5) : "10:00";

      // 여행 시작일 기준 dayIdx 계산
      const start = prev.dtDate1 || prev.startDate;
      const startDate = new Date(start);
      const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const locDate = new Date(dtSchedule.split(" ")[0].replace(/-/g, "/"));
      const locUtc = Date.UTC(locDate.getFullYear(), locDate.getMonth(), locDate.getDate());
      const dayCount = prev.days.length;
      let dayIdx = Math.floor((locUtc - startUtc) / (1000 * 3600 * 24));
      if (dayIdx < 0) dayIdx = 0;
      if (dayIdx >= dayCount) dayIdx = dayCount - 1;
      if (isNaN(dayIdx)) dayIdx = 0;

      const newPlace = {
        id: Date.now(), // 임시 ID (서버 반환값 없으므로)
        name: place.name,
        time: timeStr,
        duration: strMemo || "",
        latitude: place.latitude,
        longitude: place.longitude,
        fullItem: {
          dtSchedule,
          strMemo,
          iScheduleFK: parseInt(tripId),
          iLocationFK: place.id,
          location: {
            strName: place.name,
            ptLatitude: String(place.latitude),
            ptLongitude: String(place.longitude),
          }
        }
      };

      const newDays = prev.days.map((day, idx) => {
        if (idx === dayIdx) {
          const updatedPlaces = [...day.places, newPlace].sort((a, b) =>
            (a.time || "00:00").localeCompare(b.time || "00:00")
          );
          return { ...day, places: updatedPlaces };
        }
        return day;
      });

      return { ...prev, days: newDays };
    });

    // [ADD] 백그라운드에서 서버 데이터 refetch하여 실제 PK로 갱신
    setTimeout(async () => {
      try {
        const { getScheduleLocations } = await import("../../../services/schedule");
        const locationRes = await getScheduleLocations(tripId);
        if (locationRes?.location_list) {
          setApiTrip(prev => {
            if (!prev) return prev;
            const start = prev.dtDate1 || prev.startDate;
            const startDate = new Date(start);
            const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const dayCount = prev.days.length;
            const newDays = Array.from({ length: dayCount }, (_, idx) => ({
              places: [],
              records: prev.days[idx]?.records || []
            }));
            const list = Array.isArray(locationRes.location_list) ? locationRes.location_list :
              (typeof locationRes.location_list === "string" ? JSON.parse(locationRes.location_list.replace(/'/g, '"')) : []);
            list.forEach(locItem => {
              if (!locItem.dtSchedule || !locItem.location) return;
              const locDate = new Date(locItem.dtSchedule.split(" ")[0].replace(/-/g, "/"));
              const locUtc = Date.UTC(locDate.getFullYear(), locDate.getMonth(), locDate.getDate());
              let dayIdx = Math.floor((locUtc - startUtc) / (1000 * 3600 * 24));
              if (dayIdx < 0) dayIdx = 0;
              if (dayIdx >= dayCount) dayIdx = dayCount - 1;
              if (isNaN(dayIdx)) dayIdx = 0;
              const timeParts = locItem.dtSchedule.split(" ");
              const timeStr = timeParts.length > 1 ? timeParts[1].substring(0, 5) : "10:00";
              newDays[dayIdx].places.push({
                id: locItem.iPK || locItem.iScheduleLocationPK,
                name: locItem.location.strName,
                time: timeStr,
                duration: locItem.strMemo || "",
                latitude: parseFloat(locItem.location.ptLatitude || 0),
                longitude: parseFloat(locItem.location.ptLongitude || 0),
                fullItem: locItem
              });
            });
            return { ...prev, days: newDays };
          });
        }
      } catch (e) {
        console.error("백그라운드 refetch 실패:", e);
      }
    }, 1000);
  };

  // [ADD] 장소 수정 모달 오픈 핸들러
  const handleEditPlace = (place) => {
    let dtFormatted = "";
    if (place.fullItem?.dtSchedule) {
      dtFormatted = place.fullItem.dtSchedule.replace(" ", "T").substring(0, 16);
    } else {
      dtFormatted = formatApiDate(selectedDay).replace(" ", "T").substring(0, 16);
    }

    setEditingPlace({
      ...place,
      editDtSchedule: dtFormatted,
      // [MOD] 메모 기본값을 fullItem.strMemo에서 직접 가져오기 (빈 문자열 허용)
      editMemo: place.fullItem?.strMemo ?? place.duration ?? ""
    });
  };

  // [ADD] 장소 수정 제출 핸들러
  const handleSubmitEdit = async () => {
    try {
      // [MOD] fullItem의 실제 서버 PK를 우선 사용
      const payload = {
        iPK: editingPlace.fullItem?.iPK || editingPlace.id,
        iScheduleFK: editingPlace.fullItem?.iScheduleFK || parseInt(tripId),
        iLocationFK: editingPlace.fullItem?.iLocationFK,
        dtSchedule: editingPlace.editDtSchedule.replace("T", " ") + ":00",
        strMemo: editingPlace.editMemo
      };

      console.log("🔍 [DEBUG] modifyScheduleLocation payload:", JSON.stringify(payload));
      await modifyScheduleLocation(payload);
      alert("수정되었습니다.");
      setEditingPlace(null);

      // 상태 갱신
      setApiTrip(prev => {
        if (!prev) return prev;

        // 1. 모든 장소 평탄화 및 내용 업데이트
        let allPlaces = prev.days.flatMap(day => day.places);
        allPlaces = allPlaces.map(p => {
          if (p.id === editingPlace.id) {
            const updated = { ...p };
            const timeParts = payload.dtSchedule.split(" ");
            updated.time = timeParts.length > 1 ? timeParts[1].substring(0, 5) : "10:00";
            updated.duration = payload.strMemo || ""; // [MOD] "1시간" fallback 제거
            if (updated.fullItem) {
              updated.fullItem.dtSchedule = payload.dtSchedule;
              updated.fullItem.strMemo = payload.strMemo;
            }
            return updated;
          }
          return p;
        });

        // 2. 여행 시작/종료일에 맞춰 dayIdx 재계산 준비
        const start = prev.dtDate1 || prev.startDate;
        const end = prev.dtDate2 || prev.endDate;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endUtc = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const diffDays = Math.floor((endUtc - startUtc) / (1000 * 3600 * 24)) + 1;
        const dayCount = (diffDays > 0 && !isNaN(diffDays)) ? diffDays : 1;

        // 3. 기존 records 보존하면서 newDays 배열 초기화
        const newDays = Array.from({ length: dayCount }, (_, idx) => ({
          places: [],
          records: prev.days[idx]?.records || []
        }));

        // 4. 장소들을 알맞은 일차(dayIdx)에 분배
        allPlaces.forEach(loc => {
          if (!loc.fullItem?.dtSchedule) return;
          const locDate = new Date(loc.fullItem.dtSchedule.split(" ")[0].replace(/-/g, "/"));
          const locUtc = Date.UTC(locDate.getFullYear(), locDate.getMonth(), locDate.getDate());
          let dayIdx = Math.floor((locUtc - startUtc) / (1000 * 3600 * 24));

          if (dayIdx < 0) dayIdx = 0;
          if (dayIdx >= dayCount) dayIdx = dayCount - 1;
          if (isNaN(dayIdx)) dayIdx = 0;

          newDays[dayIdx].places.push(loc);
        });

        // 5. 시간 순 정렬
        newDays.forEach(day => {
          day.places.sort((a, b) => {
            const timeA = a.time || "00:00";
            const timeB = b.time || "00:00";
            return timeA.localeCompare(timeB);
          });
        });

        return { ...prev, days: newDays };
      });

    } catch (err) {
      console.error("장소 수정 실패:", err);
      alert("장소 수정 중 오류가 발생했습니다.");
    }
  };

  // [ADD] 장소 삭제 이벤트 핸들러 추가
  const handleDeletePlace = async (placeId) => {
    console.log("=== handleDeletePlace 호출됨 ===");
    console.log("대상 placeId:", placeId, typeof placeId);

    if (!placeId) {
      alert("삭제할 장소 정보가 없습니다.");
      return;
    }
    if (window.confirm("정말 이 장소를 삭제하시겠습니까?")) {
      try {
        await removeScheduleLocation(placeId);
        alert("장소가 삭제되었습니다.");

        // [MOD] 페이지 스크롤 및 선택된 날짜 유지 (새로고침 없이 State 갱신)
        setApiTrip(prev => {
          if (!prev) return prev;
          const newDays = prev.days.map(day => ({
            ...day,
            places: day.places.filter(p => p.id !== placeId)
          }));
          return { ...prev, days: newDays };
        });

      } catch (err) {
        console.error("장소 삭제 실패:", err);
        alert("장소 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const renderTabContent = () => {
    return (
      <>
        {selectedTab === "일정" && (
          <div className="flex flex-col gap-6">
            {currentDayPlaces.length > 0 ? (
              <div className="flex flex-col">
                {currentDayPlaces.map((place, idx) => (
                  <div key={`place-${idx}-${place.id}`} className="relative">
                    <div
                      className="ml-6 flex items-start gap-4 cursor-pointer"
                      onClick={() => handlePlaceClick(place, idx)}
                    >
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <div className="w-6 h-6 rounded-full bg-[#7a28fa] text-white text-sm font-bold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        {idx < currentDayPlaces.length - 1 && (
                          <div className="w-[1px] h-5 bg-[rgba(229,235,241,0.7)]" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-5 mb-0.25">
                          {/* [MOD] 장소 이름 클릭 시 지도 해당 위치로 이동 */}
                          <h3
                            className="text-base font-semibold text-[#111111] tracking-[-0.06px] hover:text-[#7a28fa] transition-colors"
                          >
                            {place.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditPlace(place); }}
                              className="text-[#969696] hover:text-[#ff4d4f] transition-colors p-1"
                              title="일정/메모 수정"
                            >
                              <div className="w-[18px] h-[18px] bg-current" style={{ WebkitMaskImage: "url('/icons/edit.svg')", maskImage: "url('/icons/edit.svg')", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
                            </button>
                            {/* [ADD] 메뉴 대신 장소 삭제 휴지통 아이콘 교체 */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePlace(place.id); }}
                              className="text-[#969696] hover:text-[#ff4d4f] transition-colors p-1"
                              title="장소 삭제"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#7a28fa] tracking-[-0.06px]">
                            {place.time || "10:00"}
                          </span>
                          <span className="text-sm text-[#6e6e6e] tracking-[-0.06px]">
                            {place.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-center mt-2 mb-4">
                  <button
                    onClick={handleAddPlaceClick}
                    className="px-4 py-2 bg-white border border-[#d1d5db] text-[#555] text-[13px] font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm tracking-[-0.06px]"
                  >
                    장소 추가
                  </button>
                </div>
              </div>
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

        {/* --- 기록 탭 --- */}
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
        )
        }

        {
          selectedTab === "비용" && (
            trip.budget && Object.keys(trip.budget).length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* [MOD] 비용 헤더 - 실제 예산 표시 + 수정 아이콘 클릭 시 수정 모달 */}
                <div className="flex items-center justify-between gap-5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-[#111111]">
                      비용 {trip.budget.total.toLocaleString()}원
                    </span>
                    <button
                      className="bg-transparent border-none p-0 cursor-pointer"
                      onClick={() => setEditingBudget({ total: trip.budget.total })}
                    >
                      <div
                        className="w-[15px] h-[15px] bg-[#7a28fa]"
                        style={{
                          WebkitMaskImage: "url('/icons/edit.svg')",
                          maskImage: "url('/icons/edit.svg')",
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                        }}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* [MOD] 영수증 촬영/불러오기/직접 입력 각각의 개별 버튼으로 분리 (아이콘으로 변경) */}
                    <button
                      className="text-[#969696] hover:text-[#7a28fa] transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center justify-center title='영수증 촬영'"
                      onClick={() => router.push(`/trips/${tripId}/camera/receipt`)}
                    >
                      <Camera size={23} />
                    </button>
                    <button
                      className="text-[#969696] hover:text-[#7a28fa] transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center justify-center title='불러오기'"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={23} />
                    </button>
                    {/* [ADD] 숨겨진 파일 선택기 */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // [MOD] 사용자가 확인 모달을 누르지 않더라도 딥러닝 파싱 즉시 시작
                        setIsProcessingReceipt(true);

                        try {
                          const formData = new FormData();
                          formData.append("file", file, "receipt-upload.jpg");

                          const response = await fetch('/api/vision/parse', {
                            method: 'POST',
                            body: formData,
                          });

                          if (!response.ok) {
                            throw new Error(`API 오류: ${response.status}`);
                          }

                          const expenseData = await response.json();
                          const parsedUserId = parseInt(localStorage.getItem("userId") || "1", 10);
                          const safeUserId = isNaN(parsedUserId) ? 1 : parsedUserId;

                          await addScheduleExpense({
                            iScheduleFK: parseInt(tripId, 10),
                            iUserFK: safeUserId,
                            dtExpense: expenseData.date || new Date().toISOString().replace("T", " ").substring(0, 19),
                            chCategory: expenseData.category ? expenseData.category.charAt(0).toUpperCase() : "F",
                            nMoney: parseInt(expenseData.total || 0, 10),
                            iLocation: 0,
                            strMemo: expenseData.strMemo || "불러온 영수증 지출",
                          });

                          // 성공 시 현재 탭(비용)으로 유지되도록 새로고침
                          window.location.href = `/trips/${tripId}?tab=비용`;
                        } catch (err) {
                          console.error("불러오기 실패:", err);
                          alert("불러운 이미지 분석에 실패했습니다.");
                        } finally {
                          setIsProcessingReceipt(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      className="text-[#969696] hover:text-[#7a28fa] transition-colors bg-transparent border-none p-0 cursor-pointer flex items-center justify-center title='직접 입력'"
                      onClick={() => {
                        const now = new Date();
                        const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                        setNewExpense({ chCategory: "F", nMoney: "", dtExpense: defaultDateTime, strMemo: "" });
                        setIsAddingExpense(true);
                      }}
                    >
                      <CheckSquare size={23} />
                    </button>
                  </div>
                </div>

                <div className="h-[1px] bg-[#f2f4f6]" />

                {/* [MOD] 차트 뷰 항상 렌더링 */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-base font-semibold text-[#111111] tracking-[-0.5px]">
                    사용 금액
                  </h3>
                  <div className="flex gap-6 items-center">
                    <div className="relative w-[150px] h-[150px] min-h-[150px] min-w-[150px] flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: "rotate(-90deg)" }}>
                        {(() => {
                          const spentData = trip.budget.spent || [];
                          const total = spentData.reduce((s, i) => s + i.amount, 0);
                          if (total === 0) return <circle cx="18" cy="18" r="14" fill="none" stroke="#e5ebf1" strokeWidth="6" />;
                          let cumulative = 0;
                          return spentData.map((item, idx) => {
                            const pct = item.amount / total;
                            const dashArray = `${pct * 87.96} ${87.96 - pct * 87.96}`;
                            const dashOffset = -cumulative * 87.96;
                            cumulative += pct;
                            return (
                              <circle
                                key={idx}
                                cx="18" cy="18" r="14"
                                fill="none"
                                stroke={item.color}
                                strokeWidth="6"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[11px] text-[#8e8e93]">사용 금액</span>
                        <span className="text-[14px] font-bold text-[#111]">
                          {(trip.budget.spent || []).reduce((s, i) => s + i.amount, 0).toLocaleString()}원
                        </span>
                      </div>
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
                          className={clsx(
                            "flex items-center justify-between gap-4 cursor-pointer p-1 rounded-md transition-colors",
                            selectedExpenseCategory === item.category ? "bg-gray-100" : "hover:bg-gray-50"
                          )}
                          onClick={() => {
                            // 이미 선택된 카테고리를 다시 누르면 전체보기로 해제
                            setSelectedExpenseCategory(prev => prev === item.category ? null : item.category);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className={clsx("text-sm transition-colors", selectedExpenseCategory === item.category ? "text-[#111] font-semibold" : "text-[#556574]")}>
                              {item.category}
                            </span>
                          </div>
                          <span
                            className={clsx(
                              "text-sm font-semibold transition-colors",
                              (() => {
                                if (selectedExpenseCategory === item.category) {
                                  return "text-[#7a28fa]";
                                }
                                const ratioMap = { "식비": trip.budget.foodRatio, "교통비": trip.budget.transportRatio, "숙박비": trip.budget.lodgingRatio, "기타": trip.budget.etcRatio };
                                const ratio = ratioMap[item.category];
                                const budgetForCategory = ratio ? (trip.budget.total * ratio / 100) : null;
                                return budgetForCategory !== null && item.amount > budgetForCategory
                                  ? "text-[#ff0909]"
                                  : "text-[#111111]";
                              })(),
                            )}
                          >
                            {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* [MOD] 예산 초과 경고 표시를 상세 경고 메시지 배너로 대체 */}
                  {trip.budget.alarmRatio > 0 && trip.budget.total > 0 && trip.budget.spent?.length > 0 && (() => {
                    const total = trip.budget.total;
                    const alarmPct = trip.budget.alarmRatio;
                    const ratioMap = {
                      "숙박비": trip.budget.lodgingRatio || 25,
                      "식비": trip.budget.foodRatio || 25,
                      "교통비": trip.budget.transportRatio || 25,
                    };
                    const warnings = [];
                    trip.budget.spent.forEach(cat => {
                      const ratio = ratioMap[cat.category];
                      if (!ratio) return;
                      const allocated = Math.round(total * ratio / 100);
                      const remaining = allocated - cat.amount;
                      const threshold = Math.round(allocated * alarmPct / 100);
                      if (remaining <= threshold && remaining >= 0) {
                        warnings.push(`${cat.category}: 잔여 ${remaining.toLocaleString()}원 (경고 기준 ${threshold.toLocaleString()}원 이하)`);
                      } else if (remaining < 0) {
                        warnings.push(`${cat.category}: ${Math.abs(remaining).toLocaleString()}원 초과!`);
                      }
                    });
                    if (warnings.length === 0) return null;
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mt-2">
                        <p className="text-[13px] font-bold text-red-600 mb-1">⚠️ 예산 경고</p>
                        {warnings.map((w, i) => (
                          <p key={i} className="text-[12px] text-red-500">{w}</p>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* [MOD] 지출 내역 리스트 뷰 항상 같이 렌더링 (차트 하단) */}
                <div className="h-[1px] bg-[#f2f4f6] my-2" />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-[#111111] tracking-[-0.5px]">
                      지출 내역 ({expenseRawList.length}건)
                    </h3>
                    {selectedExpenseCategory && (
                      <span className="text-[12px] text-[#7a28fa] bg-[#f5f0ff] px-2 py-1 rounded-md font-medium">
                        {selectedExpenseCategory}만 보기 중
                      </span>
                    )}
                  </div>
                  {expenseRawList.length > 0 ? (
                    (() => {
                      const categoryOrder = ["식비", "교통비", "숙박비", "기타"];
                      const groupedByCategory = {};

                      // [MOD] 선택된 카테고리가 있으면 해당 내역만 필터링
                      const filteredList = selectedExpenseCategory
                        ? expenseRawList.filter(exp => (exp.categoryLabel || "기타") === selectedExpenseCategory)
                        : expenseRawList;

                      if (filteredList.length === 0) {
                        return <p className="text-[14px] text-[#8e8e93] text-center py-4">선택된 카테고리의 지출 내역이 없습니다.</p>;
                      }

                      filteredList.forEach(exp => {
                        const label = exp.categoryLabel || "기타";
                        if (!groupedByCategory[label]) groupedByCategory[label] = [];
                        groupedByCategory[label].push(exp);
                      });

                      Object.values(groupedByCategory).forEach(arr => {
                        arr.sort((a, b) => (a.dtExpense || "").localeCompare(b.dtExpense || ""));
                      });

                      const orderedKeys = categoryOrder.filter(k => groupedByCategory[k]);
                      return orderedKeys.map(catLabel => (
                        <div key={catLabel} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: groupedByCategory[catLabel][0]?.color }} />
                            <span className="text-[13px] font-bold text-[#111]">{catLabel}</span>
                            <span className="text-[12px] text-[#abb1b9]">({groupedByCategory[catLabel].length}건)</span>
                          </div>
                          {groupedByCategory[catLabel].map((exp, idx) => (
                            <div key={exp.iPK || idx} className="flex items-center justify-between gap-3 py-2 px-3 bg-[#f9fafb] rounded-xl ml-4">
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[12px] text-[#8e8e93] w-full truncate">{exp.strMemo || "-"}</span>
                                <span className="text-[11px] text-[#abb1b9]">{exp.dtExpense ? exp.dtExpense.replace("T", " ").substring(0, 16) : "-"}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[14px] font-bold text-[#111]">{(exp.nMoney || 0).toLocaleString()}원</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    className="text-[#969696] hover:text-[#7a28fa] transition-colors p-1"
                                    title="지출 수정"
                                    onClick={() => {
                                      setEditingExpense({
                                        iPK: exp.iPK,
                                        iScheduleFK: exp.iScheduleFK || tripId,
                                        iUserFK: exp.iUserFK || 1,
                                        nMoney: exp.nMoney || 0,
                                        dtExpense: exp.dtExpense ? exp.dtExpense.substring(0, 16) : "",
                                        chCategory: exp.chCategory || "E",
                                        strMemo: exp.strMemo || ""
                                      });
                                    }}
                                  >
                                    <div
                                      className="w-[16px] h-[16px] bg-[#7a28fa] grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
                                      style={{
                                        WebkitMaskImage: "url('/icons/edit.svg')",
                                        maskImage: "url('/icons/edit.svg')",
                                        WebkitMaskSize: "contain",
                                        maskSize: "contain",
                                        WebkitMaskRepeat: "no-repeat",
                                        maskRepeat: "no-repeat",
                                        WebkitMaskPosition: "center",
                                        maskPosition: "center",
                                      }}
                                    />
                                  </button>
                                  <button
                                    className="text-[#969696] hover:text-[#ff4d4f] transition-colors p-1"
                                    title="지출 삭제"
                                    onClick={async () => {
                                      if (!window.confirm("이 지출 내역을 삭제하시겠습니까?")) return;
                                      try {
                                        await removeScheduleExpense(exp.iPK);
                                        setExpenseRawList(prev => prev.filter(e => e.iPK !== exp.iPK));
                                        setApiTrip(prev => {
                                          if (!prev) return prev;
                                          const categoryLabelMap = { "F": "식비", "T": "교통비", "L": "숙박비", "E": "기타" };
                                          const categoryColors = { "식비": "#3b82f6", "교통비": "#ffa918", "숙박비": "#14b8a6", "기타": "#b115fa" };
                                          const remaining = expenseRawList.filter(e => e.iPK !== exp.iPK);
                                          const grouped = {};
                                          remaining.forEach(e => {
                                            const label = categoryLabelMap[e.chCategory] || "기타";
                                            if (!grouped[label]) grouped[label] = 0;
                                            grouped[label] += (e.nMoney || 0);
                                          });
                                          const totalSpent = Object.values(grouped).reduce((s, v) => s + v, 0);
                                          const newSpent = Object.entries(grouped).map(([label, amount]) => ({
                                            category: label, amount,
                                            color: categoryColors[label] || "#b115fa",
                                            percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
                                          })).sort((a, b) => b.amount - a.amount);
                                          return { ...prev, budget: { ...prev.budget, spent: newSpent } };
                                        });
                                        alert("삭제되었습니다.");
                                      } catch (err) {
                                        console.error("지출 삭제 실패:", err);
                                        alert("지출 삭제 중 오류가 발생했습니다.");
                                      }
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()
                  ) : (
                    <p className="text-[14px] text-[#8e8e93] text-center py-4">등록된 지출 내역이 없습니다.</p>
                  )}

                  {/* [MOD] 지출 추가 버튼 (내역 맨 아래 버튼) - 곧바로 직접 입력 모달 노출 */}
                  <div className="pt-2">
                    <button
                      className="w-full py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[13px] font-semibold rounded-md hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        const now = new Date();
                        const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                        setNewExpense({ chCategory: "F", nMoney: "", dtExpense: defaultDateTime, strMemo: "" });
                        setIsAddingExpense(true);
                      }}
                    >
                      + 지출 추가
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 px-6 bg-white mt-4">
                <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                  {"비용을 설정하고\n사용 내역을 기록해 보세요"}
                </p>
                <button
                  className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    const now = new Date();
                    const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                    setNewExpense({ chCategory: "F", nMoney: "", dtExpense: defaultDateTime, strMemo: "" });
                    setIsAddingExpense(true);
                  }}
                >지출 추가</button>
              </div>
            )
          )
        }

        {
          selectedTab === "준비물" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-5">
                <span className="text-sm font-semibold text-[#111111]">
                  준비물 {trip.checklist ? trip.checklist.length : 0}개
                </span>
                <button
                  className="text-sm font-semibold text-[#7a28fa] bg-transparent border-none p-0 cursor-pointer"
                  onClick={() => setIsAddingPreparation(true)}
                >
                  준비물 추가
                </button>
              </div>

              <div className="flex flex-col gap-3 bg-[#f9fafb] rounded-xl p-4">
                {trip.checklist && trip.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-[18px] h-[18px] rounded cursor-pointer"
                        onClick={() => onTogglePreparation(item)}
                      >
                        <Image
                          src={item.checked ? "/icons/checkbox-checked.svg" : "/icons/checkbox-unchecked.svg"}
                          alt="checkbox"
                          width={18}
                          height={18}
                        />
                      </div>
                      <span className={clsx(
                        "text-base tracking-[-0.4px]",
                        item.checked ? "line-through text-[#c7c8d8]" : "text-[#111111]"
                      )}>
                        {item.name}
                      </span>
                    </div>
                    {/* [MOD] dots-menu.svg 대신 Trash2(휴지통) 아이콘 사용 */}
                    <button
                      className="text-[#969696] hover:text-[#ff4d4f] transition-colors p-1"
                      onClick={() => onRemovePreparation(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {/* [ADD] 준비물 추가 인풋 폼 */}
                {isAddingPreparation && (
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="text"
                      value={newPreparationName}
                      onChange={(e) => setNewPreparationName(e.target.value)}
                      placeholder="준비물을 입력하세요"
                      className="flex-1 bg-white border border-[#e5ebf2] rounded-lg px-3 py-2 text-[14px] text-[#111] focus:outline-none focus:border-[#7a28fa]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onAddPreparation();
                        if (e.key === 'Escape') setIsAddingPreparation(false);
                      }}
                    />
                    <button
                      className="px-3 py-2 bg-[#111] text-white text-[13px] font-semibold rounded-lg"
                      onClick={onAddPreparation}
                    >
                      저장
                    </button>
                    <button
                      className="px-3 py-2 bg-white border border-[#d1d5db] text-[#111] text-[13px] font-semibold rounded-lg"
                      onClick={() => {
                        setIsAddingPreparation(false);
                        setNewPreparationName("");
                      }}
                    >
                      취소
                    </button>
                  </div>
                )}

                {/* 준비물이 없을 때 보여줄 디자인 (추가 중이 아닐 때만) */}
                {(!trip.checklist || trip.checklist.length === 0) && !isAddingPreparation && (
                  <div className="flex flex-col items-center justify-center py-6 px-6 mt-4">
                    <p className="text-[14px] text-[#8e8e93] text-center mb-6 whitespace-pre-wrap">
                      {"아직 준비물이 없어요\n여행 전에 필요한 물품을 추가해 보세요"}
                    </p>
                    <button
                      className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors"
                      onClick={() => setIsAddingPreparation(true)}
                    >
                      준비물 추가
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {
          selectedTab === "동행자" && (
            trip.companions && trip.companions.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-5">
                  <span className="text-sm font-semibold text-[#111111]">
                    등록된 동행자 {trip.companions.length}명
                  </span>
                  <span onClick={() => setIsCompanionModalOpen(true)} className="text-sm font-semibold text-[#7a28fa] cursor-pointer">
                    동행자 초대
                  </span>
                </div>

                {/* [MOD] 1줄에 1명씩 표시, 이름(ID) 형식 */}
                <div className="flex flex-col gap-2">
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
                      <span className="text-sm text-[#111111] font-medium truncate flex-1">
                        {companion.name}{companion.userId ? ` (${companion.userId})` : ""}
                      </span>
                      {companion.isOwner ? (
                        <Image
                          src="/icons/crown.svg"
                          alt="owner"
                          width={14}
                          height={10}
                          className="flex-shrink-0"
                        />
                      ) : (
                        <button
                          onClick={() => onRemoveCompanion(companion)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#abb1b9] hover:text-[#ff3b3b] transition-colors rounded-full hover:bg-red-50"
                          aria-label="동행자 삭제"
                        >
                          ✕
                        </button>
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
                <button onClick={() => setIsCompanionModalOpen(true)} className="px-5 py-2.5 bg-white border border-[#d1d5db] text-[#111111] text-[14px] font-semibold rounded-md hover:bg-gray-50 transition-colors">동행자 초대</button>
              </div>
            )
          )
        }
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
      {/* [ADD] Kakao Maps SDK - SPA 네비게이션 시에도 독립적으로 로드 보장 */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_API_KEY}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onLoad={initMap}
      />
      <div className="relative w-full h-screen bg-white overflow-hidden lg:flex lg:flex-row">
        {/* Left Side Panel - Desktop Only */}
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
                <div className="px-5 pt-4 pb-2 relative flex-shrink-0 group">
                  {/* [ADD] 좌측 화살표 */}
                  {showLeftArrow && (
                    <button
                      onClick={() => scrollDays("left")}
                      className="absolute left-4 top-[55%] -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-[#f2f4f6] rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all"
                    >
                      <Image src="/icons/arrow-left.svg" alt="prev" width={14} height={14} />
                    </button>
                  )}

                  <div
                    ref={dayTabsRef}
                    onScroll={checkScroll}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className={clsx(
                      "flex gap-1 overflow-x-auto scrollbar-hide select-none",
                      isMouseDragging ? "cursor-grabbing" : "cursor-pointer"
                    )}
                  >
                    {days.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDay(index + 1)}
                        className={clsx(
                          "whitespace-nowrap px-4 py-1.5 rounded-full text-[14px] font-medium transition-all border shrink-0",
                          selectedDay === index + 1
                            ? "bg-[#111111] text-white border-[#111111] font-semibold"
                            : "bg-white text-[#111111] border-[#DBDBDB] hover:bg-gray-50",
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* [ADD] 우측 화살표 */}
                  {showRightArrow && (
                    <button
                      onClick={() => scrollDays("right")}
                      className="absolute right-4 top-[55%] -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-[#f2f4f6] rounded-full shadow-md flex items-center justify-center hover:bg-white transition-all"
                    >
                      <Image
                        src="/icons/arrow-left.svg"
                        alt="next"
                        width={14}
                        height={14}
                        className="rotate-180"
                      />
                    </button>
                  )}

                  {/* [ADD] 그라데이션 인디케이터 */}
                  {showRightArrow && (
                    <div className="absolute right-5 top-4 bottom-2 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  )}
                  {showLeftArrow && (
                    <div className="absolute left-5 top-4 bottom-2 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                  )}
                </div>
              )}

              {/* Desktop Content Scroll Area */}
              <div
                className={clsx(
                  "flex-1 overflow-y-auto px-5 pb-10 scrollbar-hide",
                  !["일정", "기록"].includes(selectedTab) && "pt-5"
                )}
              >
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

        {/* [MOD] 장소 상세(리뷰) 패널 - PC: 사이드 패널 / 모바일: 전체 오버레이 */}
        {selectedPlaceDetail && (
          <>
            {/* [MOD] 모바일: 지도는 유지하고 바텀시트 영역 위에만 PlaceDetailPanel 표시 */}
            <div
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.15)] overflow-hidden"
              style={{ height: `${sheetHeight}px` }}
            >
              <PlaceDetailPanel
                place={selectedPlaceDetail}
                onClose={() => setSelectedPlaceDetail(null)}
              />
            </div>

            {/* 기존 PC: 지도 왼쪽 사이드 패널 */}
            <div className="hidden lg:block z-[5] w-[390px] shrink-0 border-l border-[#f2f4f6] bg-white h-full">
              <PlaceDetailPanel
                place={selectedPlaceDetail}
                onClose={() => setSelectedPlaceDetail(null)}
              />
            </div>
          </>
        )}


        {/* Map Section */}
        <div className="relative flex-1 h-full overflow-hidden transition-all duration-300 ease-in-out">
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_API_KEY}&autoload=false&libraries=services`}
            strategy="afterInteractive"
            onLoad={initMap}
          />
          {/* Map Background */}
          {/* [MOD] 모바일에서 바텀시트 높이(sheetHeight)만큼 동적으로 하단 패딩을 주어 지도 렌더링 영역을 확보 */}
          {/* 바텀시트를 드래그해서 높이가 변하면 지도 뷰포트도 동기화되어 리사이징됨 */}
          <div
            className="absolute inset-0 w-full h-full lg:pb-0 transition-all duration-300"
            style={{ paddingBottom: isMobile ? `${sheetHeight}px` : '0px' }}
          >
            <div ref={mapRef} className="w-full h-full" />
          </div>

          {/* Header - Mobile Only (Hidden on Desktop since it's moved to Left Panel) */}
          <div className="lg:hidden fixed top-0 left-0 right-0 px-6 pt-4 pb-4 flex items-center justify-between bg-white z-20 shadow-sm">
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
          className="lg:hidden fixed left-0 right-0 bg-white rounded-t-xl shadow-[0px_-4px_12px_rgba(0,0,0,0.04)] transition-all z-20 flex flex-col"
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
              className={clsx(
                "flex-1 px-5 pb-24 overflow-y-auto w-full",
                !["일정", "기록"].includes(selectedTab) && "pt-5"
              )}
            >
              {renderTabContent()}
            </div>
          )}
        </div>
      </div>

      {/* [ADD] PC/Mobile 공통 장소 수정 모달 */}
      {editingPlace && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg">
            <h3 className="text-[17px] font-bold text-[#111] mb-4">장소 일정/메모 수정</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">장소명</label>
                <input type="text" value={editingPlace.name} disabled className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2.5 text-[15px] text-[#888]" />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">일시</label>
                <input
                  type="datetime-local"
                  value={editingPlace.editDtSchedule}
                  min={minDateTime}
                  max={maxDateTime}
                  onChange={(e) => setEditingPlace({ ...editingPlace, editDtSchedule: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">메모</label>
                <input
                  type="text"
                  value={editingPlace.editMemo}
                  onChange={(e) => setEditingPlace({ ...editingPlace, editMemo: e.target.value })}
                  placeholder="예: 1시간, 점심 식사 등"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditingPlace(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">취소</button>
              <button onClick={handleSubmitEdit} className="flex-1 py-3 bg-[#7a28fa] text-white font-semibold rounded-lg hover:bg-[#6b22de]">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* [ADD] 예산 수정 모달 */}
      {editingBudget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg">
            <h3 className="text-[17px] font-bold text-[#111] mb-4">예산 수정</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">총 예산 (원)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editingBudget.total}
                  onChange={(e) => setEditingBudget({ ...editingBudget, total: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditingBudget(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">취소</button>
              <button
                onClick={async () => {
                  try {
                    const { modifySchedule } = await import("../../../services/schedule");
                    // [FIX] 서버 500 에러 방지를 위해 필수 필드 위주로 정밀하게 전송 (Ver 3.1)
                    const normalizeDate = (d) => {
                      if (!d) return "2024-01-01"; // 최소 기본값
                      const s = String(d).split(" ")[0].split("T")[0].replace(/\./g, "-");
                      return s;
                    };

                    const raw = apiTrip?.raw || {};
                    const payload = {
                      iPK: parseInt(tripId, 10),
                      iUserFK: parseInt(raw.iUserFK || localStorage.getItem("userId") || "1", 10),
                      dtDate1: normalizeDate(raw.dtDate1 || apiTrip?.dtDate1 || apiTrip?.startDate),
                      dtDate2: normalizeDate(raw.dtDate2 || apiTrip?.dtDate2 || apiTrip?.endDate),
                      strWhere: raw.strWhere || apiTrip?.title?.replace(" 여행", "") || "여행지",
                      strWithWho: raw.strWithWho || apiTrip?.companion || "나홀로",
                      strTripStyle: raw.strTripStyle || apiTrip?.travelStyle || "무계획",
                      strTransport: raw.strTransport || apiTrip?.transport || "대중교통",
                      nTotalPeople: parseInt(raw.nTotalPeople || apiTrip?.totalPeople || 1, 10),
                      nTotalBudget: parseInt(editingBudget.total, 10),
                      nAlarmRatio: parseInt(raw.nAlarmRatio || 25, 10),
                      nTransportRatio: parseInt(raw.nTransportRatio || 25, 10),
                      nLodgingRatio: parseInt(raw.nLodgingRatio || 25, 10),
                      nFoodRatio: parseInt(raw.nFoodRatio || 25, 10),
                      chStatus: raw.chStatus || "A"
                    };

                    if (raw.dtCreate) {
                      const dt = new Date(raw.dtCreate);
                      if (!isNaN(dt.getTime())) {
                        payload.dtCreate = dt.toISOString().replace("T", " ").substring(0, 19);
                      }
                    }

                    console.log("🚨 [예산 수정 페이로드]", payload);
                    await modifySchedule(payload);

                    // [MOD] 로컬 상태 즉시 업데이트
                    setApiTrip(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        budget: { ...prev.budget, total: payload.nTotalBudget },
                        raw: { ...prev.raw, ...payload }
                      };
                    });
                    setEditingBudget(null);
                    alert("✅ 예산이 수정되었습니다.");
                  } catch (err) {
                    console.error("🚨 예산 수정 실패:", err);
                    const errorDetail = err.response?.data;
                    const errorMsg = errorDetail ? (typeof errorDetail === 'object' ? JSON.stringify(errorDetail, null, 2) : String(errorDetail)) : err.message;
                    alert(`🚨 예산 수정 중 오류가 발생했습니다.\n\n[서버 응답 상세]\n${errorMsg}`);
                  }
                }}
                className="flex-1 py-3 bg-[#7a28fa] text-white font-semibold rounded-lg hover:bg-[#6b22de]"
              >저장</button>
            </div>
          </div>
        </div>
      )}

      {/* [ADD] 지출 항목 개별 수정 모달 */}
      {editingExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg">
            <h3 className="text-[17px] font-bold text-[#111] mb-4">지출 내역 수정</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">카테고리</label>
                <select
                  value={editingExpense.chCategory}
                  onChange={(e) => setEditingExpense({ ...editingExpense, chCategory: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px] bg-white"
                >
                  <option value="F">식비</option>
                  <option value="T">교통비</option>
                  <option value="L">숙박비</option>
                  <option value="E">기타</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">지출 금액 (원)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editingExpense.nMoney}
                  onChange={(e) => setEditingExpense({ ...editingExpense, nMoney: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">지출 일시</label>
                <input
                  type="datetime-local"
                  value={editingExpense.dtExpense}
                  onChange={(e) => setEditingExpense({ ...editingExpense, dtExpense: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">내용 (메모)</label>
                <input
                  type="text"
                  value={editingExpense.strMemo}
                  onChange={(e) => setEditingExpense({ ...editingExpense, strMemo: e.target.value })}
                  placeholder="지출 내용을 입력하세요"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setEditingExpense(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">취소</button>
              <button
                onClick={async () => {
                  try {
                    const dtFormatted = editingExpense.dtExpense
                      ? editingExpense.dtExpense.replace("T", " ") + (editingExpense.dtExpense.length === 16 ? ":00" : "")
                      : "";

                    const payload = {
                      iPK: editingExpense.iPK,
                      iScheduleFK: parseInt(editingExpense.iScheduleFK), // [ADD] 필수 필드
                      iUserFK: parseInt(editingExpense.iUserFK), // [ADD] 필수 필드
                      nMoney: editingExpense.nMoney,
                      dtExpense: dtFormatted,
                      chCategory: editingExpense.chCategory,
                      strMemo: editingExpense.strMemo
                    };

                    console.log("🚨 [지출 개별 수정 페이로드]", payload);
                    const { modifyScheduleExpense } = await import("../../../services/schedule");
                    await modifyScheduleExpense(payload);

                    // 화면(로컬 상태) 즉시 업데이트
                    setExpenseRawList(prev => prev.map(exp => {
                      if (exp.iPK === editingExpense.iPK) {
                        return { ...exp, ...payload, dtExpense: dtFormatted, categoryLabel: { "F": "식비", "T": "교통비", "L": "숙박비", "E": "기타" }[payload.chCategory] };
                      }
                      return exp;
                    }));

                    setApiTrip(prev => {
                      if (!prev) return prev;
                      const categoryLabelMap = { "F": "식비", "T": "교통비", "L": "숙박비", "E": "기타" };
                      const categoryColors = { "식비": "#3b82f6", "교통비": "#ffa918", "숙박비": "#14b8a6", "기타": "#b115fa" };

                      const updatedRawList = expenseRawList.map(exp =>
                        exp.iPK === editingExpense.iPK ? { ...exp, ...payload, dtExpense: dtFormatted, categoryLabel: categoryLabelMap[payload.chCategory] } : exp
                      );

                      const grouped = {};
                      updatedRawList.forEach(e => {
                        const label = categoryLabelMap[e.chCategory] || "기타";
                        if (!grouped[label]) grouped[label] = 0;
                        grouped[label] += (e.nMoney || 0);
                      });

                      const totalSpent = Object.values(grouped).reduce((s, v) => s + v, 0);
                      const newSpent = Object.entries(grouped).map(([label, amount]) => ({
                        category: label, amount,
                        color: categoryColors[label] || "#b115fa",
                        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
                      })).sort((a, b) => b.amount - a.amount);

                      return { ...prev, budget: { ...prev.budget, spent: newSpent } };
                    });

                    setEditingExpense(null);
                    alert("✅ 지출 내역이 수정되었습니다.");
                  } catch (err) {
                    console.error("🚨 지출 수정 실패:", err);
                    const errorDetail = err.response?.data;
                    const errorMsg = errorDetail ? (typeof errorDetail === 'object' ? JSON.stringify(errorDetail, null, 2) : String(errorDetail)) : err.message;
                    alert(`🚨 지출 수정 중 오류가 발생했습니다.\n\n[서버 응답 상세]\n${errorMsg}`);
                  }
                }}
                className="flex-1 py-3 bg-[#7a28fa] text-white font-semibold rounded-lg hover:bg-[#6b22de]"
              >저장</button>
            </div>
          </div>
        </div>
      )}

      {/* [ADD] 지출 항목 개별 추가 모달 */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 pt-10 pb-10 overflow-y-auto">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg my-auto">
            <h3 className="text-[17px] font-bold text-[#111] mb-4">지출 추가</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-[#555] mb-2 block">카테고리</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { code: "F", label: "식비", emoji: "🍽️" },
                    { code: "T", label: "교통비", emoji: "🚗" },
                    { code: "L", label: "숙박비", emoji: "🏨" },
                    { code: "E", label: "기타", emoji: "📦" },
                  ].map((cat) => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => setNewExpense({ ...newExpense, chCategory: cat.code })}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all ${newExpense.chCategory === cat.code
                        ? "border-[#7a28fa] bg-[#f5eeff]"
                        : "border-[#e5ebf1] bg-white"
                        }`}
                    >
                      <span className="text-[20px]">{cat.emoji}</span>
                      <span
                        className={`text-[12px] font-semibold ${newExpense.chCategory === cat.code ? "text-[#7a28fa]" : "text-[#556574]"
                          }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">지출 금액 (원)</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={newExpense.nMoney}
                    onChange={(e) => setNewExpense({ ...newExpense, nMoney: parseInt(e.target.value) || "" })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 pr-8 text-[15px]"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-[#8e8e93]">원</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">지출 일시</label>
                <input
                  type="datetime-local"
                  value={newExpense.dtExpense}
                  onChange={(e) => setNewExpense({ ...newExpense, dtExpense: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#555] mb-1 block">내용 (메모)</label>
                <input
                  type="text"
                  value={newExpense.strMemo}
                  onChange={(e) => setNewExpense({ ...newExpense, strMemo: e.target.value })}
                  placeholder="지출 내용을 입력하세요"
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-[15px]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setIsAddingExpense(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">취소</button>
              <button
                onClick={async () => {
                  if (!newExpense.nMoney || newExpense.nMoney <= 0) {
                    alert("금액을 올바르게 입력해주세요.");
                    return;
                  }
                  try {
                    const parsedUserId = parseInt(localStorage.getItem("userId") || "1", 10);
                    const safeUserId = isNaN(parsedUserId) ? 1 : parsedUserId;

                    const dtFormatted = newExpense.dtExpense
                      ? newExpense.dtExpense.replace("T", " ") + (newExpense.dtExpense.length === 16 ? ":00" : "")
                      : "";

                    const payload = {
                      iScheduleFK: parseInt(tripId, 10),
                      iUserFK: safeUserId,
                      nMoney: parseInt(newExpense.nMoney),
                      dtExpense: dtFormatted,
                      chCategory: newExpense.chCategory,
                      strMemo: newExpense.strMemo || "직접 입력 지출"
                    };

                    const { addScheduleExpense } = await import("../../../services/schedule");
                    const res = await addScheduleExpense(payload);

                    alert("✅ 지출 내역이 등록되었습니다.");
                    setIsAddingExpense(false);

                    const tempId = res?.data?.iPK || Date.now();
                    const categoryLabelMap = { "F": "식비", "T": "교통비", "L": "숙박비", "E": "기타" };
                    const categoryColors = { "식비": "#3b82f6", "교통비": "#ffa918", "숙박비": "#14b8a6", "기타": "#b115fa" };

                    const newExpObj = { ...payload, iPK: tempId, categoryLabel: categoryLabelMap[payload.chCategory] };

                    setExpenseRawList(prev => [...prev, newExpObj]);

                    setApiTrip(prev => {
                      if (!prev) return prev;
                      const updatedRawList = [...expenseRawList, newExpObj];
                      const grouped = {};
                      updatedRawList.forEach(e => {
                        const label = categoryLabelMap[e.chCategory] || "기타";
                        if (!grouped[label]) grouped[label] = 0;
                        grouped[label] += (e.nMoney || 0);
                      });

                      const totalSpent = Object.values(grouped).reduce((s, v) => s + v, 0);
                      const newSpent = Object.entries(grouped).map(([label, amount]) => ({
                        category: label, amount,
                        color: categoryColors[label] || "#b115fa",
                        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
                      })).sort((a, b) => b.amount - a.amount);

                      return { ...prev, budget: { ...prev.budget, spent: newSpent } };
                    });
                  } catch (err) {
                    console.error("지출 등록 실패:", err);
                    alert("지출 등록 중 오류가 발생했습니다.");
                  }
                }}
                className="flex-1 py-3 bg-[#7a28fa] text-white font-semibold rounded-lg hover:bg-[#6b22de]"
              >등록</button>
            </div>
          </div>
        </div>
      )}

      {/* PC Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        tripId={tripId}
        day={selectedDay}
        formattedDate={formatApiDate(selectedDay)}
        onAddSuccess={handleAddSuccess}
      />

      {/* [ADD] 모바일 장소 검색 시트 (기존 바텀시트와 동일한 지도 노출 면적) */}
      <MobilePlaceSearchSheet
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        tripId={tripId}
        day={selectedDay}
        formattedDate={formatApiDate(selectedDay)}
        sheetHeight={sheetHeight} // [ADD] 기존 바텀시트 높이 전달 → 지도 노출 면적 일치
        onAddSuccess={(data) => {
          handleAddSuccess(data);
          setIsMobileSearchOpen(false);
        }}
      />

      {/* [ADD] 동행자 초대 모달 */}
      {isCompanionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsCompanionModalOpen(false)}>
          <div className="bg-white w-full max-w-[400px] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#f2f4f6]">
              <h3 className="text-[18px] font-bold text-[#111]">동행자 초대</h3>
              <p className="text-[13px] text-[#8e8e93] mt-1">함께 여행할 사용자를 검색하세요</p>
            </div>
            <div className="p-5">
              <div className="relative">
                <input
                  type="text"
                  value={companionSearchQuery}
                  onChange={e => setCompanionSearchQuery(e.target.value)}
                  placeholder="사용자 이름 입력"
                  className="w-full px-3 py-2.5 border border-[#d1d5db] rounded-lg text-[14px] focus:outline-none focus:border-[#7a28fa]"
                  autoFocus
                />
                {isSearchingCompanion && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#8e8e93] animate-pulse">검색중...</span>
                )}
              </div>

              {/* 검색 결과 */}
              <div className="mt-3 max-h-[240px] overflow-y-auto">
                {companionSearchResults.length > 0 ? (
                  companionSearchResults.map(user => (
                    <div key={user.iPK} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#f2f4f6] rounded-full flex items-center justify-center">
                          <Image src="/icons/profile.svg" alt="profile" width={16} height={16} />
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#111]">{user.strName}</p>
                          <p className="text-[12px] text-[#8e8e93]">{user.strEmail || user.strUserID}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onAddCompanion(user)}
                        className="px-3 py-1.5 bg-[#7a28fa] text-white text-[13px] font-semibold rounded-lg hover:bg-[#6922d5] transition-colors"
                      >
                        추가
                      </button>
                    </div>
                  ))
                ) : companionSearchQuery && !isSearchingCompanion ? (
                  <p className="text-[14px] text-[#8e8e93] text-center py-6">검색 결과가 없습니다</p>
                ) : null}
              </div>
            </div>
            <div className="p-4 border-t border-[#f2f4f6]">
              <button
                onClick={() => { setIsCompanionModalOpen(false); setCompanionSearchQuery(""); setCompanionSearchResults([]); }}
                className="w-full py-2.5 text-[14px] font-semibold text-[#8e8e93] hover:text-[#111] transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* [ADD] 영수증 파싱 풀 스크린 로딩 오버레이 */}
      {isProcessingReceipt && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[16px] font-semibold tracking-[-0.5px]">영수증 처리 중입니다</p>
        </div>
      )}

    </MobileContainer>
  );
}
