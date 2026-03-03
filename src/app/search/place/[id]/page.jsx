"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import Script from "next/script";
import { MobileContainer } from "../../../../components/layout/MobileContainer";
import { registerPlace } from "../../../../services/place";
import { addScheduleLocation } from "../../../../services/schedule";
import { appendFavoriteLocation, getFavoriteList } from "../../../../services/favorite";

/**
 * [ADD] SearchPlaceDetailPage
 * 검색 결과에서 장소를 선택했을 때 나타나는 상세 페이지입니다.
 * 상단 헤더, 지도 배경 및 마커, 하단 바텀시트로 구성됩니다.
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
  const [isSaved, setIsSaved] = useState(false);
  const [showReviews, setShowReviews] = useState(false); // [ADD] 리뷰 영역 표시 여부 상태
  // [ADD] 일시/메모 입력 state - 사용자가 직접 일자와 메모를 입력하여 장소 등록 가능
  const [scheduleDate, setScheduleDate] = useState("");
  const [memo, setMemo] = useState("");

  // [ADD] 바텀시트 드래그 상태 관리
  const [dragY, setDragY] = useState(0); // [MOD] 초기 높이를 전체 확장 상태(0)로 복구
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false); // [MOD] 초기 상태를 '확장 뷰'로 복구
  const startY = useRef(0);
  const sheetRef = useRef(null);

  // [ADD] 로컬 스토리지에서 실제 데이터 불러오기 (place_ID 키 활용)
  useEffect(() => {
    const savedData = localStorage.getItem(`place_${id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setPlaceData(parsed);

        // [ADD] 이미 찜한 장소인지 확인
        const savedList = JSON.parse(
          localStorage.getItem("saved_places") || "[]",
        );
        const exists = savedList.some(
          (p) => String(p.id) === String(parsed.id),
        );
        setIsSaved(exists);
      } catch (e) {
        console.error("Failed to parse saved place data", e);
      }
    }
    setIsLoading(false);
  }, [id]);

  // [ADD] dateParam 기반 일시 기본값 설정
  useEffect(() => {
    if (dateParam) {
      setScheduleDate(dateParam.replace(" ", "T").substring(0, 16));
    }
  }, [dateParam]);

  // [ADD] 지도 초기화 및 마커 표시
  const initMap = () => {
    if (!window.kakao || !mapRef.current) return;

    window.kakao.maps.load(() => {
      const position = new window.kakao.maps.LatLng(
        placeData.latitude,
        placeData.longitude,
      );

      // 지도 생성
      if (!mapInstance.current) {
        mapInstance.current = new window.kakao.maps.Map(mapRef.current, {
          center: position,
          level: 3,
        });
      } else {
        mapInstance.current.setCenter(position);
      }

      const map = mapInstance.current;

      // [MOD] 바텀시트 높이를 고려하여 지도를 아래로 이동시켜 마커를 위로 올림
      map.panBy(0, 150);

      // 마커 표시
      const marker = new window.kakao.maps.Marker({
        position: position,
      });
      marker.setMap(map);

      // 커스텀 오버레이 (장소명)
      const content = `
        <div class="mt-10 bg-black/80 backdrop-blur-md px-2 py-0 rounded-[6px] border border-white/20 shadow-lg">
          <span class="text-white text-[13px] font-medium whitespace-nowrap">
            ${placeData.name}
          </span>
        </div>
      `;

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
      });
      customOverlay.setMap(map);
    });
  };

  useEffect(() => {
    if (window.kakao && placeData) {
      initMap();
    }
  }, [placeData]);

  if (!placeData) {
    return (
      <MobileContainer>
        <div className="w-full h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          {isLoading ? (
            <p className="text-[#abb1b9] animate-pulse">
              정보를 불러오는 중...
            </p>
          ) : (
            <>
              <p className="text-[#abb1b9] mb-4">
                장소 정보를 찾을 수 없습니다.
              </p>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-[#111111] text-white rounded-xl font-bold"
              >
                뒤로가기
              </button>
            </>
          )}
        </div>
      </MobileContainer>
    );
  }

  // [ADD] 터치 이벤트 핸들러
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    // [MOD] 드래그 범위 조정: 초기 위치(0)를 기준으로 아래로만 드래그 가능하게 단순화
    const newY = Math.max(deltaY, 0);
    setDragY(newY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 40) {
      setIsMinimized(true);
      setShowReviews(false);
    } else {
      setIsMinimized(false);
      setShowReviews(true); // [ADD] 위로 올릴 때 리뷰 자동 노출하여 높이 동기화
    }
    setDragY(0); // [MOD] 사용자가 설정한 초기 높이(0)로 완벽하게 되돌림
  };

  return (
    <MobileContainer>
      <Script
        src="//dapi.kakao.com/v2/maps/sdk.js?appkey=57dd33d25e0269c9c37a3ea70b3a3b4f&autoload=false&libraries=services"
        strategy="afterInteractive"
        onLoad={initMap}
      />
      <div className="relative w-full h-screen bg-white overflow-hidden">
        {/* [ADD] 상단 헤더 섹션: 뒤로가기 버튼 및 장소명 */}
        <div className="fixed top-0 left-0 right-0 px-6 pt-4 pb-4 flex items-center bg-white z-30 shadow-sm">
          <button
            onClick={() => router.back()}
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
          <h1 className="ml-4 text-[18px] font-semibold text-[#111111] tracking-[-0.5px]">
            {placeData.name}
          </h1>
        </div>

        {/* [MOD] 지도 영역 (실제 카카오맵 연결) */}
        <div className="absolute inset-0 w-full h-full z-10 pt-[60px]">
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* [ADD] 하단 바텀시트 섹션 */}
        <div
          ref={sheetRef}
          className={`absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] px-5 pt-8 pb-2 max-w-[430px] mx-auto transition-transform ${isDragging ? "" : "duration-300 ease-out"}`}
          style={{ transform: `translateY(${dragY}px)` }}
        >
          {/* [MOD] 드래그 핸들: 시인성 강화 (두께, 색상, 높이 조정) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="absolute top-0 left-0 right-0 h-10 flex items-start justify-center cursor-grab active:cursor-grabbing pt-3"
          >
            <div className="w-12 h-1.5 bg-[#d1d5db] rounded-full shadow-inner" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-bold text-[#111111] tracking-[-0.8px]">
                    {placeData.name}
                  </h2>
                  <span className="text-[12px] font-semibold text-[#7a28fa] bg-[#f9f5ff] px-2 py-0.5 rounded">
                    {placeData.category}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-[14px] text-[#6e6e6e] tracking-[-0.3px] leading-relaxed">
                    {placeData.address}
                  </p>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {placeData.phone && (
                      <p className="text-[13px] text-[#6e6e6e] flex items-center gap-1">
                        📞{" "}
                        <a
                          href={`tel:${placeData.phone}`}
                          className="hover:underline"
                        >
                          {placeData.phone}
                        </a>
                      </p>
                    )}
                    {placeData.link && (
                      <p className="text-[13px] text-[#6e6e6e] flex items-center gap-1 overflow-hidden">
                        🔗{" "}
                        <a
                          href={placeData.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-[#7a28fa] truncate"
                        >
                          {placeData.link}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[13px] font-bold text-[#7a28fa]">
                      ★ {placeData.rating}
                    </span>
                    <span className="text-[13px] text-[#abb1b9]">
                      ({placeData.reviewCount})
                    </span>
                    {!showReviews && (
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setShowReviews(true);
                            setIsMinimized(false);
                            setDragY(0);
                          }}
                          className="text-[13px] font-bold text-[#6e6e6e] bg-[#f2f4f6] px-3 py-1 rounded-md hover:bg-[#e5e7eb] transition-colors"
                        >
                          리뷰보기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* [ADD] 리뷰보기 및 찜하기 버튼 */}
            <div className="flex flex-col gap-2 mt-2">
              {tripId ? (
                <>
                  {/* [ADD] 일시/메모 입력 영역 - 사용자가 직접 일자와 메모를 입력 */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#6e6e6e]">📅 일시</label>
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full h-[44px] px-3 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[14px] text-[#111111] font-medium transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[13px] font-semibold text-[#6e6e6e]">📝 메모</label>
                      <input
                        type="text"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="메모를 입력하세요"
                        className="w-full h-[44px] px-3 bg-[#f5f7f9] rounded-xl border-2 border-transparent focus:border-[#7a28fa] focus:bg-white outline-none text-[14px] text-[#111111] font-medium placeholder:text-[#abb1b9] transition-all"
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        // [FIX] 앱에서는 로컬스토리지 데이터를 사용하므로 서버 DB에 장소가 없을 수 있음
                        // 일정 추가 전에 registerPlace로 장소를 먼저 등록 (이미 등록된 경우 무시)
                        // [FIX] 백엔드가 기대하는 필드명(iPK, strName 등)으로 변환하여 전송
                        // [FIX] OpenAPI LocationModel 스펙에 맞게 전체 필수 필드 전송
                        const registerPayload = {
                          iPK: placeData.id,
                          strName: placeData.name,
                          strAddress: placeData.address,
                          strGroupName: placeData.category || "",
                          strGroupCode: placeData.groupCode || "",
                          strGroupDetail: placeData.groupDetail || "",
                          strPhone: placeData.phone || "",
                          strLink: placeData.link || "",
                          chCategory: placeData.chCategory || "",
                          ptLatitude: String(placeData.latitude),
                          ptLongitude: String(placeData.longitude),
                        };
                        console.log("🔍 [DEBUG] registerPlace payload:", JSON.stringify(registerPayload));
                        try {
                          const registerResult = await registerPlace(registerPayload);
                          console.log("✅ [DEBUG] registerPlace 성공:", registerResult);
                        } catch (e) {
                          console.error("❌ [DEBUG] registerPlace 실패:", e.response?.status, e.response?.data, e);
                        }

                        // [MOD] 사용자가 입력한 일시/메모를 사용하여 장소 등록
                        const schedulePayload = {
                          iPK: 0,
                          iScheduleFK: parseInt(tripId),
                          iLocationFK: placeData.id,
                          dtSchedule: scheduleDate.replace("T", " ") + ":00",
                          strMemo: memo
                        };
                        console.log("🔍 [DEBUG] addScheduleLocation payload:", JSON.stringify(schedulePayload));
                        await addScheduleLocation(schedulePayload);
                        router.push(`/trips/${tripId}`);
                      } catch (error) {
                        console.error("Failed to add place to schedule:", error);
                        console.error("❌ [DEBUG] error.response:", error.response?.status, error.response?.data);
                        alert("일정에 장소를 추가하지 못했습니다.");
                      }
                    }}
                    className="w-full h-[56px] bg-[#7a28fa] text-white rounded-2xl text-[16px] font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    이 장소를 일정에 추가하기
                  </button>
                </>
              ) : (
                !isSaved && (
                  <button
                    onClick={async () => {
                      try {
                        // [ADD] 장소 등록 API 호출 (PC 버전과 동일하게 개별 예외 처리)
                        // [ADD] OpenAPI LocationModel 스펙에 맞게 전체 필수 필드 전송 및 Favorite_Location 연동
                        await registerPlace({
                          iPK: placeData.id,
                          strName: placeData.name,
                          strAddress: placeData.address,
                          strGroupName: placeData.category || "",
                          strGroupCode: placeData.groupCode || "",
                          strGroupDetail: placeData.groupDetail || "",
                          strPhone: placeData.phone || "",
                          strLink: placeData.link || "",
                          chCategory: placeData.chCategory || "E",
                          ptLatitude: String(placeData.latitude),
                          ptLongitude: String(placeData.longitude),
                        });

                        // [ADD] 1번(기본) 폴더에 장소 담기. 만약 1번 폴더가 없으면 리스트를 조회해서 맨 처음 폴더 사용.
                        try {
                          let favoriteId = 1;
                          try {
                            const favListRes = await getFavoriteList();
                            if (favListRes.data && favListRes.data.favorite_list && favListRes.data.favorite_list.length > 0) {
                              favoriteId = favListRes.data.favorite_list[0].iPK;
                            }
                          } catch (e) { /* ignore and fallback to 1 */ }

                          await appendFavoriteLocation({
                            iFavoriteFK: favoriteId,
                            iLocationFK: placeData.id
                          });
                        } catch (e) {
                          console.error("즐겨찾기에 장소 추가 실패:", e);
                        }
                        const savedList = JSON.parse(
                          localStorage.getItem("saved_places") || "[]",
                        );
                        if (!savedList.find((p) => String(p.id) === String(placeData.id))) {
                          savedList.push(placeData);
                          localStorage.setItem(
                            "saved_places",
                            JSON.stringify(savedList),
                          );
                        }
                        router.push("/search?saved=true");
                      } catch (e) {
                        console.error("API registration failed, using local storage fallback:", e);
                        // fallback local storage save
                        const savedList = JSON.parse(
                          localStorage.getItem("saved_places") || "[]",
                        );
                        if (!savedList.find((p) => String(p.id) === String(placeData.id))) {
                          savedList.push(placeData);
                          localStorage.setItem(
                            "saved_places",
                            JSON.stringify(savedList),
                          );
                        }
                        router.push("/search?saved=true");
                      }
                    }}
                    className="w-full h-[56px] bg-[#111111] text-white rounded-2xl text-[16px] font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    찜한 장소로 등록하기
                  </button>
                )
              )}
            </div>

            {/* [ADD] 리뷰 섹션 - 애니메이션 컨테이너 적용 (버튼 클릭 시 올라오는 효과) */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${showReviews
                ? "max-h-[1000px] opacity-100 mt-4"
                : "max-h-0 opacity-0 mt-0"
                }`}
            >
              <div className="h-[1px] bg-[#f2f4f6] mb-4" />
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-bold text-[#111111]">
                    리뷰{" "}
                    <span className="text-[#abb1b9] font-medium ml-1">
                      {placeData?.reviewCount}
                    </span>
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[#7a28fa] text-[14px]">★</span>
                    <span className="text-[16px] font-bold text-[#7a28fa]">
                      {placeData?.rating}
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
        </div>
      </div>
    </MobileContainer >
  );
}
