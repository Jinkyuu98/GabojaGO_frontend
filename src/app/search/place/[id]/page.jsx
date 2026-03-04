"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Script from "next/script";
import { MobileContainer } from "../../../../components/layout/MobileContainer";
import PlaceDetailPanel from "../../../trips/[tripId]/PlaceDetailPanel"; // [MOD] PlaceDetailPanel 재사용

/**
 * [MOD] SearchPlaceDetailPage
 * 장소 검색 결과 클릭 시 표시되는 모바일 상세 페이지.
 * 상단에 카카오 지도, 하단 바텀시트에 PlaceDetailPanel을 표시.
 * PlaceDetailPanel이 전화번호/링크 표시, 찜 등록, 리뷰 CRUD를 담당.
 */
export default function SearchPlaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const day = searchParams.get("day");
  const dateParam = searchParams.get("date");
  const { id } = params;
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const [placeData, setPlaceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // [ADD] 바텀시트 드래그 상태
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const sheetRef = useRef(null);

  // [ADD] 로컬 스토리지에서 장소 데이터 로드
  useEffect(() => {
    const savedData = localStorage.getItem(`place_${id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPlaceData(parsed);
      } catch (e) {
        console.error("Failed to parse saved place data", e);
      }
    }
    setIsLoading(false);
  }, [id]);

  // [ADD] 지도 초기화 및 마커 표시
  const initMap = () => {
    if (!window.kakao || !mapRef.current || !placeData) return;
    window.kakao.maps.load(() => {
      const position = new window.kakao.maps.LatLng(placeData.latitude, placeData.longitude);
      if (!mapInstance.current) {
        mapInstance.current = new window.kakao.maps.Map(mapRef.current, { center: position, level: 3 });
      } else {
        mapInstance.current.setCenter(position);
      }
      mapInstance.current.panBy(0, 150);
      // 마커
      new window.kakao.maps.Marker({ position }).setMap(mapInstance.current);
      // 커스텀 오버레이
      const content = `<div style="margin-top:10px;background:rgba(0,0,0,0.8);padding:2px 8px;border-radius:6px;"><span style="color:white;font-size:13px;white-space:nowrap;">${placeData.name}</span></div>`;
      new window.kakao.maps.CustomOverlay({ position, content, yAnchor: 0.5 }).setMap(mapInstance.current);
    });
  };

  useEffect(() => {
    if (window.kakao && placeData) initMap();
  }, [placeData]);

  // [ADD] 바텀시트 드래그 핸들러
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - startY.current;
    setDragY(Math.max(delta, 0));
  };
  const handleTouchEnd = () => {
    setIsDragging(false);
    // 많이 내리면 뒤로가기
    if (dragY > 100) router.back();
    else setDragY(0);
  };

  if (isLoading || !placeData) {
    return (
      <MobileContainer>
        <div className="w-full h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          {isLoading ? (
            <p className="text-[#abb1b9] animate-pulse">정보를 불러오는 중...</p>
          ) : (
            <>
              <p className="text-[#abb1b9] mb-4">장소 정보를 찾을 수 없습니다.</p>
              <button onClick={() => router.back()} className="px-6 py-2 bg-[#111111] text-white rounded-xl font-bold">뒤로가기</button>
            </>
          )}
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_API_KEY}&autoload=false&libraries=services`}
        strategy="afterInteractive"
        onLoad={initMap}
      />
      <div className="relative w-full h-screen bg-white overflow-hidden">

        {/* [ADD] 지도 영역 (전체 화면) */}
        <div className="absolute inset-0 w-full h-full z-10">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* [MOD] 바텀시트 - flex flex-col 구조로 PlaceDetailPanel 높이 확보 */}
        <div
          ref={sheetRef}
          className={`absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] flex flex-col transition-transform ${isDragging ? "" : "duration-300 ease-out"}`}
          style={{ transform: `translateY(${dragY}px)`, height: "78vh" }}
        >
          {/* [ADD] 드래그 핸들 */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-shrink-0 flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
          >
            <div className="w-12 h-1.5 bg-[#d1d5db] rounded-full" />
          </div>

          {/* [MOD] flex-1 min-h-0 → PlaceDetailPanel의 h-full이 올바른 높이를 계산하도록 */}
          <div className="flex-1 min-h-0">
            <PlaceDetailPanel
              place={placeData}
              onClose={() => router.back()}
            />
          </div>
        </div>


      </div>
    </MobileContainer>
  );
}
