"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { ActionSheet } from "../../components/common/ActionSheet";
import { useOnboardingStore } from "../../store/useOnboardingStore";
// [MOD] Trash2 아이콘 추가
import { Search, Trash2 } from "lucide-react";
import { clsx } from "clsx";
// [MOD] removeSchedule, modifySchedule 함수 import 추가
import { getScheduleList, removeSchedule, modifySchedule } from "../../services/schedule";

// [MOD] onDelete, onEdit props 추가
const TripCard = ({ trip, onClick, onDelete, onEdit, isLast }) => {
  // [MOD] strWithWho 값을 그대로 표시 (불필요한 '함께' 접미사 제거)
  const companionText = trip.strWithWho || "나홀로";

  const dateText = (() => {
    if (!trip.dtDate1) return "날짜 없음";
    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      // [MOD] YYYY-MM-DD 형태에서 YY.MM.DD 형태로 변환
      const [year, month, day] = dateStr.split("T")[0].split("-");
      return `${year.slice(2)}.${month}.${day}`;
    };
    const start = formatDate(trip.dtDate1);
    if (!trip.dtDate2) return start;
    const end = formatDate(trip.dtDate2);
    // [MOD] 시작일과 종료일이 같든 다르든 전체 포맷 유지 (ex: 26.03.16 ~ 26.03.19)
    return `${start} ~ ${end}`;
  })();

  // [MOD] 하이픈("-") 기준으로 split 하여 태그 배열 생성, 없으면 빈 배열
  const tags = trip.strTripStyle
    ? trip.strTripStyle.split("-").map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <>
      <div
        className="px-4 py-4 lg:px-6 lg:py-5 cursor-pointer transition-colors h-full flex flex-col justify-center"
        onClick={onClick}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4 w-full">
          <div className="flex justify-between items-center gap-5 lg:w-auto shrink-0">
            <span className="text-[13px] font-medium text-[#7a28fa] bg-[#f8f6ff] px-2 py-1 rounded-[6px] tracking-[-0.5px] whitespace-nowrap transition-colors">
              {companionText}
            </span>
            {/* [MOD] 모바일용 삭제 버튼 추가를 위해 flex 컨테이너로 묶음 */}
            <div className="flex items-center gap-3 lg:hidden">
              <span className="text-[14px] font-normal text-[#969696] tracking-[-0.5px] whitespace-nowrap">
                {dateText}
              </span>
              <div className="flex items-center gap-1">
                {/* [ADD] 모바일용 수정 버튼 */}
                <button
                  className="flex items-center justify-center p-1 text-[#969696] hover:text-[#7a28fa] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(trip);
                  }}
                  title="일정 수정"
                >
                  <div className="w-[14px] h-[14px] bg-current" style={{ WebkitMaskImage: "url('/icons/edit.svg')", maskImage: "url('/icons/edit.svg')", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
                </button>
                {/* [ADD] 모바일용 삭제 버튼 */}
                <button
                  className="flex items-center justify-center p-1 text-[#969696] hover:text-[#ff4d4f] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(trip.iPK);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          <h2 className="text-[18px] lg:text-[16px] font-bold text-[#111111] tracking-[-0.5px] leading-tight mb-auto lg:mb-0 lg:flex-1 truncate">
            {trip.strWhere}
          </h2>

          <div className="flex flex-wrap gap-1.5 mt-1 lg:mt-0 lg:ml-2 shrink-0">
            {tags.map((tag, i) => {
              // 정규식을 이용하여 태그 안의 이모지 제거 (ex: "🚗 쇼핑" -> "쇼핑")
              const cleanTag = tag
                .replace(
                  /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g,
                  "",
                )
                .trim();
              return (
                <span
                  key={i}
                  className="text-[12px] font-medium text-[#6e6e6e] bg-[#f2f4f6] px-2.5 py-1 rounded-md tracking-[-0.3px]"
                >
                  {cleanTag}
                </span>
              );
            })}
          </div>

          {/* [MOD] 데스크톱용 삭제 버튼 추가를 위해 flex 컨테이너로 묶음 */}
          <div className="hidden lg:flex items-center gap-4 shrink-0 lg:ml-auto">
            <span className="text-[14px] font-normal text-[#969696] tracking-[-0.5px] whitespace-nowrap">
              {dateText}
            </span>
            <div className="flex items-center gap-1">
              {/* [ADD] 데스크톱용 수정 버튼 */}
              <button
                className="flex items-center justify-center p-1 text-[#969696] hover:text-[#7a28fa] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(trip);
                }}
                title="일정 수정"
              >
                <div className="w-[18px] h-[18px] bg-current" style={{ WebkitMaskImage: "url('/icons/edit.svg')", maskImage: "url('/icons/edit.svg')", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
              </button>
              {/* [ADD] 데스크톱용 삭제 버튼 */}
              <button
                className="flex items-center justify-center p-1 text-[#969696] hover:text-[#ff4d4f] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(trip.iPK);
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="h-[1px] mx-5 bg-[rgba(229,235,241,0.7)] md:hidden" />
      )}
    </>
  );
};

export default function TripsListPage() {
  const router = useRouter();
  const { setTravelData, resetTravelData } = useOnboardingStore();
  const [activeTab, setActiveTab] = useState("itinerary"); // 'itinerary' | 'records'
  const [scheduleList, setScheduleList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null); // [ADD] 수정 모달 상태

  // [ADD] 일정 삭제 이벤트 핸들러 추가
  const handleDeleteSchedule = async (iPK) => {
    if (window.confirm("정말 이 일정을 삭제하시겠습니까?")) {
      try {
        await removeSchedule(iPK);
        alert("일정이 삭제되었습니다.");
        // [MOD] 삭제 성공 시 새로고침 대신 상태에서 즉시 제거
        setScheduleList((prev) => prev.filter((trip) => trip.iPK !== iPK));
      } catch (err) {
        console.error("일정 삭제 실패:", err);
        alert("일정 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // [ADD] 일정 수정 모달 열기 핸들러
  const handleEditSchedule = (trip) => {
    setEditingTrip({
      iPK: trip.iPK,
      iUserFK: trip.iUserFK,
      dtDate1: trip.dtDate1?.split("T")[0] || "",
      dtDate2: trip.dtDate2?.split("T")[0] || "",
      strWhere: trip.strWhere || "",
      strWithWho: trip.strWithWho || "",
      strTripStyle: trip.strTripStyle || "",
      strTransport: trip.strTransport || "",
      nTotalPeople: trip.nTotalPeople || 1,
      // [MOD] 예산 0이면 백엔드 에러 방지를 위해 원본값 유지
      nTotalBudget: trip.nTotalBudget ?? 0,
      nAlarmRatio: trip.nAlarmRatio || 25,
      nTransportRatio: trip.nTransportRatio || 25,
      nLodgingRatio: trip.nLodgingRatio || 25,
      nFoodRatio: trip.nFoodRatio || 25,
      chStatus: trip.chStatus || "A",
      dtCreate: trip.dtCreate || null,
    });
  };

  // [ADD] 일정 수정 제출 핸들러
  const handleSubmitEdit = async () => {
    if (!editingTrip) return;
    try {
      await modifySchedule(editingTrip);
      alert("일정이 수정되었습니다.");
      // [MOD] 수정 성공 시 목록 상태 즉시 갱신
      setScheduleList((prev) =>
        prev.map((trip) =>
          trip.iPK === editingTrip.iPK ? { ...trip, ...editingTrip } : trip
        )
      );
      setEditingTrip(null);
    } catch (err) {
      console.error("일정 수정 실패:", err);
      alert("일정 수정 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        // [DEL] 백엔드가 이미 전체 목록을 반환하므로 1번만 호출하여 트래픽 최적화 (기본값이 'A'이므로 누락발생)
        // const res = await getScheduleList();

        // [MOD] A(예정), B(진행 중), C(과거 기록) 상태의 일정을 모두 불러오도록 병렬 호출
        const [resA, resB, resC] = await Promise.all([
          getScheduleList("a"),
          getScheduleList("b"),
          getScheduleList("c"),
        ]);

        // 방어 로직: 혹시 모를 중복 방관을 위해 iPK 기준 유니크 처리
        const allTrips = [
          ...(resA?.schedule_list || []),
          ...(resB?.schedule_list || []),
          ...(resC?.schedule_list || []),
        ];
        const uniqueTrips = Array.from(new Map(allTrips.map(trip => [trip.iPK, trip])).values());

        setScheduleList(uniqueTrips);
      } catch (err) {
        console.error("일정 목록 전체 조회 실패:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const handleCreateNew = () => {
    setIsActionSheetOpen(true);
  };

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // [MOD] 현재 접속 날짜 기준으로 과거 일정인 경우 일정 탭에서 제외
  const itineraryTrips = scheduleList
    .filter((trip) => {
      // [FIX] A, B 문자열 누락된 따옴표 추가
      const isStatusAB = trip.chStatus?.toUpperCase() === 'A' || trip.chStatus?.toUpperCase() === 'B';

      if (trip.dtDate2) {
        // [FIX] T, - 문자열 누락된 따옴표 추가
        const endDateStr = trip.dtDate2.split('T')[0];
        const endDate = new Date(endDateStr.replace(/\./g, '-'));
        endDate.setHours(0, 0, 0, 0);
        if (endDate < todayDate) return false; // 종료일 지남
      }
      return true;
    })
    .reverse();

  // [MOD] 현재 접속 날짜 기준으로 과거 일정을 기록 탭에 추가 포함
  const recordTrips = scheduleList
    .filter((trip) => {
      // [FIX] C 문자열 누락된 따옴표 추가
      const isStatusC = trip.chStatus?.toUpperCase() === 'C';
      if (isStatusC) return true;

      // [FIX] A, B 문자열 누락된 따옴표 추가
      const isStatusAB = trip.chStatus?.toUpperCase() === 'A' || trip.chStatus?.toUpperCase() === 'B';
      if (isStatusAB && trip.dtDate2) {
        // [FIX] T, - 문자열 누락된 따옴표 추가
        const endDateStr = trip.dtDate2.split('T')[0];
        const endDate = new Date(endDateStr.replace(/\./g, '-'));
        endDate.setHours(0, 0, 0, 0);
        if (endDate < todayDate) return true; // 종료일 지남
      }
      return false;
    })
    .reverse();

  const displayTrips = activeTab === "itinerary" ? itineraryTrips : recordTrips;

  return (
    <MobileContainer showNav={true}>
      <div className="w-full h-screen bg-white flex flex-col lg:bg-[#f8f9fa]">
        <header className="flex items-center justify-between py-4 bg-white sticky top-0 z-10 lg:bg-transparent lg:border-none lg:py-6">
          <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between px-5 lg:px-10">
            <h1 className="text-[20px] lg:text-[24px] font-semibold text-[#111] tracking-tighter">
              여행 일정
            </h1>
            <button
              className="bg-transparent border-none text-[#111] flex items-center justify-center p-2 cursor-pointer rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => console.log("Search clicked")}
            >
              <Search size={24} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full pb-32">
          <div className="max-w-[1280px] w-full mx-auto lg:px-10">
            <div className="flex border-b border-[#f2f4f6] bg-white lg:mt-2 lg:rounded-t-2xl lg:px-8 lg:border-x lg:border-t lg:border-[#eceff4]">
              <button
                className={clsx(
                  "flex-1 py-4 text-[16px] tracking-[-0.3px] transition-all relative lg:text-[18px] lg:py-6",
                  activeTab === "itinerary"
                    ? "font-semibold text-[#111111]"
                    : "font-medium text-[#abb1b9]",
                )}
                onClick={() => setActiveTab("itinerary")}
              >
                일정
                {activeTab === "itinerary" && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#111111]" />
                )}
              </button>
              <button
                className={clsx(
                  "flex-1 py-4 text-[16px] tracking-[-0.3px] transition-all relative lg:text-[18px] lg:py-6",
                  activeTab === "records"
                    ? "font-semibold text-[#111111]"
                    : "font-medium text-[#abb1b9]",
                )}
                onClick={() => setActiveTab("records")}
              >
                기록
                {activeTab === "records" && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#111111]" />
                )}
              </button>
            </div>

            <div className="bg-[#fafafa] lg:bg-white px-5 py-5 lg:py-8 lg:rounded-b-2xl lg:px-8 min-h-[700px] lg:border lg:border-[#eceff4]">
              {isLoading ? (
                <div className="flex items-center justify-center p-20 text-[#898989] text-[15px]">
                  여행 일정을 불러오는 중입니다...
                </div>
              ) : displayTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-3 lg:gap-4">
                  {displayTrips.map((trip, index) => (
                    <div
                      key={trip.iPK}
                      className="bg-white rounded-2xl border border-[#eceff4] hover:border-[#7a28fa] transition-all cursor-pointer"
                    >
                      <TripCard
                        trip={trip}
                        isLast={index === displayTrips.length - 1 || true}
                        onClick={() => router.push(`/trips/${trip.iPK}`)}
                        onDelete={handleDeleteSchedule} // [MOD] 삭제 핸들러 전달 추가
                        onEdit={handleEditSchedule} // [ADD] 수정 핸들러 전달 추가
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl py-16 px-5 text-center mt-5 mx-5">
                  <p className="text-[15px] text-[#8e8e93] leading-relaxed mb-6 whitespace-pre-wrap">
                    {activeTab === "itinerary"
                      ? "아직 여행 일정이 없어요\n첫 여행 일정을 만들어볼까요?"
                      : "완료된 여행 기록이 없습니다."}
                  </p>
                  {activeTab === "itinerary" && (
                    <button
                      className="bg-[#111] text-white border-none py-3 px-6 rounded-full font-semibold text-[16px] cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
                      onClick={handleCreateNew}
                    >
                      일정 생성하기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* [ADD] 일정 수정 모달 */}
        {editingTrip && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-[480px] lg:max-w-[600px] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
              {/* 모달 헤더 */}
              <div className="px-6 py-5 border-b border-[#f2f4f6] flex items-center justify-between">
                <h2 className="text-[20px] font-bold text-[#111111] tracking-tight">일정 수정</h2>
                <button
                  onClick={() => setEditingTrip(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#969696] hover:text-[#111]"
                >
                  ✕
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="px-6 py-5 flex flex-col gap-4 max-h-[60vh] lg:max-h-none overflow-y-auto">
                {/* 여행지 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#6e6e6e]">🗺️ 여행지</label>
                  <input
                    type="text"
                    value={editingTrip.strWhere}
                    onChange={(e) => setEditingTrip({ ...editingTrip, strWhere: e.target.value })}
                    className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                  />
                </div>

                {/* 시작일 / 종료일 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[13px] font-semibold text-[#6e6e6e]">📅 시작일</label>
                    <input
                      type="date"
                      value={editingTrip.dtDate1}
                      onChange={(e) => setEditingTrip({ ...editingTrip, dtDate1: e.target.value })}
                      className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[13px] font-semibold text-[#6e6e6e]">📅 종료일</label>
                    <input
                      type="date"
                      value={editingTrip.dtDate2}
                      onChange={(e) => setEditingTrip({ ...editingTrip, dtDate2: e.target.value })}
                      className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                    />
                  </div>
                </div>

                {/* 동행자 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#6e6e6e]">👥 누구와</label>
                  <input
                    type="text"
                    value={editingTrip.strWithWho}
                    onChange={(e) => setEditingTrip({ ...editingTrip, strWithWho: e.target.value })}
                    className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                  />
                </div>

                {/* 여행 스타일 / 교통수단 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[13px] font-semibold text-[#6e6e6e]">✈️ 여행 스타일</label>
                    <input
                      type="text"
                      value={editingTrip.strTripStyle}
                      onChange={(e) => setEditingTrip({ ...editingTrip, strTripStyle: e.target.value })}
                      className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[13px] font-semibold text-[#6e6e6e]">🚗 교통수단</label>
                    <input
                      type="text"
                      value={editingTrip.strTransport}
                      onChange={(e) => setEditingTrip({ ...editingTrip, strTransport: e.target.value })}
                      className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                    />
                  </div>
                </div>

                {/* 인원 / 예산 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[13px] font-semibold text-[#6e6e6e]">👤 인원</label>
                    <input
                      type="number"
                      min="1"
                      value={editingTrip.nTotalPeople}
                      onChange={(e) => setEditingTrip({ ...editingTrip, nTotalPeople: parseInt(e.target.value) || 1 })}
                      className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[13px] font-semibold text-[#6e6e6e]">💰 예산</label>
                    <input
                      type="number"
                      min="0"
                      value={editingTrip.nTotalBudget}
                      onChange={(e) => setEditingTrip({ ...editingTrip, nTotalBudget: parseInt(e.target.value) || 0 })}
                      className="h-12 px-4 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[15px] text-[#111111] font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 모달 하단 버튼 */}
              <div className="px-6 py-5 border-t border-[#f2f4f6] flex gap-3">
                <button
                  onClick={() => setEditingTrip(null)}
                  className="flex-1 h-[52px] border border-[#eceff4] bg-white text-[#6d818f] rounded-2xl text-[16px] font-bold hover:bg-gray-50 active:scale-[0.98] transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitEdit}
                  className="flex-1 h-[52px] bg-[#7a28fa] text-white rounded-2xl text-[16px] font-bold hover:bg-[#6922d5] active:scale-[0.98] transition-all shadow-lg shadow-[#7a28fa]/20"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

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
      </div>
    </MobileContainer>
  );
}
