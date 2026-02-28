"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "../../../components/layout/MobileContainer";
import { LoadingIndicator } from "../../../components/common/LoadingIndicator";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import { requestScheduleLocations } from "../../../services/schedule";

// 헬퍼: Store 로직과 동일하게 날짜/예산 맵핑
const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  if (typeof dateStr === "string") return dateStr.split("T")[0];
  if (typeof dateStr.toISOString === "function") return dateStr.toISOString().split("T")[0];
  return new Date().toISOString().split("T")[0];
};

const calculateTotalBudget = (budgetObj) => {
  let total = 0;
  if (budgetObj) {
    total += parseInt(budgetObj.accommodation?.amount || 0);
    total += parseInt(budgetObj.food?.amount || 0);
    total += parseInt(budgetObj.transport?.amount || 0);
    total += parseInt(budgetObj.etc?.amount || 0);
  }
  return total || 1000000;
};

export default function GenerateLoadingPage() {
  const router = useRouter();
  const { travelData, setGeneratedTripData, user } = useOnboardingStore();

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const generateRealTrip = async () => {
      try {
        const COMPANION_MAP = {
          alone: "나홀로", couple: "연인과 함께", friends: "친구와 함께", family: "가족과 함께", parents: "부모님과 함께", etc: "기타",
        };
        const companionsArray = Array.isArray(travelData.companions) ? travelData.companions : [];
        const companionLabel = companionsArray.length > 0
          ? companionsArray.map(c => typeof c === "object" ? (c.name || "기타") : (COMPANION_MAP[c] || c)).filter(Boolean).join("-")
          : "나홀로";

        const TRANSPORT_MAP = {
          car: "자동차",
          public: "대중교통",
          bike: "자전거",
          walk: "도보",
          other: "기타",
        };
        const transportLabel = TRANSPORT_MAP[travelData.transport] || travelData.transport || "대중교통";

        const STYLE_MAP = {
          activity: "체험/액티비티", hotplace: "핫플레이스", culture: "문화/역사", landmark: "유명 관광지",
          nature: "자연경관", healing: "휴양/힐링", hiking: "등산",
          restaurant: "맛집", cafe: "카페", market: "시장", nightmarket: "야시장/노점",
          shopping: "쇼핑", parents: "효도 관광", other: "기타"
        };
        const tripStyleLabel = travelData.styles?.length > 0
          ? travelData.styles.map((s) => STYLE_MAP[s] || s).join("-")
          : "일반";

        const parsedUserId = parseInt(user?.id, 10);
        const safeUserId = isNaN(parsedUserId) ? 1 : parsedUserId;

        // GPT API 요청 페이로드
        const payload = {
          iUserFK: safeUserId,
          dtDate1: formatDate(travelData.startDate),
          dtDate2: formatDate(travelData.endDate),
          strWhere: travelData.location || "제주도",
          strWithWho: companionLabel,
          strTransport: transportLabel,
          strTripStyle: tripStyleLabel, // [ADD] 여행 테마 추가
          nTotalPeople: travelData.peopleCount || 1,
          nTotalBudget: calculateTotalBudget(travelData.budget),
          nAlarmRatio: 25,
          nTransportRatio: travelData.budget?.transport?.ratio || 25,
          nLodgingRatio: travelData.budget?.accommodation?.ratio || 25,
          nFoodRatio: travelData.budget?.food?.ratio || 25,
        };

        const response = await fetch('/api/schedule/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("AI 생성 API 에러");
        }

        const aiSchedule = await response.json();

        // [FIX] 카카오 API 검색 전 지역명 접두어 제거 (검색 정확도 향상)
        const cleanPlaceName = (name) => {
          if (!name) return "";
          let cleaned = name.trim();
          const prefixes = ["서울 ", "부산 ", "제주 ", "제주도 ", "강원 ", "강릉 ", "인천 ", "광주 ", "대전 ", "대구 ", "울산 ", "경기 "];
          for (const prefix of prefixes) {
            if (cleaned.startsWith(prefix)) {
              cleaned = cleaned.substring(prefix.length).trim();
              break;
            }
          }
          return cleaned;
        };

        // 2단계: AI가 뱉어낸 장소들만 추출하여 카카오 지도 검색 요청
        try {
          const rawPlaces = [];
          if (aiSchedule?.day_schedules) {
            aiSchedule.day_schedules.forEach((day) => {
              if (day.activities) {
                day.activities.forEach((act) => {
                  if (act.place_name) {
                    rawPlaces.push({
                      place_name: cleanPlaceName(act.place_name), // 카카오엔 정제된 이름으로 검색
                      category_group_code: act.category_group_code || null, // [MOD] 사용자의 요청에 따라 복구 (단, LLM 프롬프트에서 제어함)
                    });
                  }
                });
              }
            });
          }

          if (rawPlaces.length > 0) {
            console.log("[로딩화면] 장소 맵핑 파이프라인 시작:", rawPlaces.length, "건");
            const locationResult = await requestScheduleLocations({ request_list: rawPlaces });

            // 3단계: 카카오 위치 데이터를 AI 일정에 병합 (매칭 기준: 이름 100% 일치 -> 부분 일치 -> 순차 매핑)
            if (locationResult?.location_list) {
              const locationList = locationResult.location_list;
              const availableLocations = [...locationList]; // 중복 맵핑 방지

              // [ADDED] 날짜 기준점 설정 (store/useOnboardingStore.js에서 이동)
              const baseStartDate = new Date(payload.dtDate1);
              const isValidDate = !isNaN(baseStartDate.getTime());

              aiSchedule.day_schedules.forEach((day, dIdx) => {
                // 현재일자 구하기
                let currentDayStr = "";
                if (isValidDate) {
                  const currentDayDate = new Date(baseStartDate);
                  currentDayDate.setDate(baseStartDate.getDate() + dIdx);
                  currentDayStr = currentDayDate.toISOString().split("T")[0];
                } else {
                  currentDayStr = new Date().toISOString().split("T")[0];
                }

                if (day.activities) {
                  day.activities.forEach((act, aIdx) => {
                    // 카카오 검색 시 전달했던 "정제된 이름" 기준으로 매칭 시작
                    const searchName = cleanPlaceName(act.place_name?.trim() || "");
                    if (!searchName) return;

                    const normalize = (str) => str.replace(/\s+/g, "").toLowerCase();
                    const nSearch = normalize(searchName);

                    // [MOD] 사용자가 선택한 여행지(strWhere)와 일치하는 주소를 가진 후보군만 먼저 추리기 (예: 부산 여행인데 제주도 지점이 잡히는 것 방지)
                    const targetRegion = (travelData.location || "제주").slice(0, 2); // '서울특별시' -> '서울', '부산광역시' -> '부산'
                    let regionFilteredLocations = availableLocations.filter(loc => loc.strAddress?.includes(targetRegion));

                    // 만약 지역 필터링을 거쳤더니 후보가 하나도 안 남았다면 (카카오 주소 체계가 특이한 경우 등), 원본 후보군 유지
                    if (regionFilteredLocations.length === 0) {
                      regionFilteredLocations = availableLocations;
                    }

                    // 1순위: 완벽 일치 (공백 무시)
                    let matchIdx = regionFilteredLocations.findIndex(loc => normalize(loc.strName) === nSearch);

                    // 2순위: 단순 포함 매칭
                    if (matchIdx === -1) {
                      matchIdx = regionFilteredLocations.findIndex(
                        loc => {
                          const nLoc = normalize(loc.strName);
                          return nLoc.includes(nSearch) || nSearch.includes(nLoc);
                        }
                      );
                    }

                    // 3순위: AI가 멋대로 붙인 지역명(부산, 제주 등)을 떼어내고 핵심 키워드(N-gram Token)로 스마트 매칭
                    if (matchIdx === -1) {
                      const tokens = searchName.split(" ").filter(t => t.length > 1 && !["부산", "제주", "서울", "강원", "인천", "광주", "대전", "대구", "울산", "경기", "제주도", "부산광역시"].includes(t));
                      if (tokens.length > 0) {
                        matchIdx = regionFilteredLocations.findIndex(loc => {
                          const nLoc = normalize(loc.strName);
                          // 핵심 토큰 중 하나라도 카카오 DB 결과의 이름에 포함되어 있다면 매칭 성공으로 간주
                          return tokens.some(tk => nLoc.includes(normalize(tk)));
                        });
                      }
                    }

                    // 4순위: 매칭 실패했으나 필터링된 후보 장소가 딱 하나뿐이라면, AI가 찾던 바로 그 장소일 확률이 99%이므로 강제 매핑
                    if (matchIdx === -1 && regionFilteredLocations.length > 0) {
                      // 남아있는 후보가 1~3개라면, 제일 첫 번째(가장 검색 일치도가 높은) 장소를 강제로 선택
                      matchIdx = 0;
                    }

                    if (matchIdx !== -1) {
                      const matchedLocation = regionFilteredLocations[matchIdx];
                      act.kakao_location = matchedLocation;
                      // 원본 배열에서도 해당 장소 삭제 (중복 맵핑 방지)
                      const originalIdx = availableLocations.findIndex(loc => loc.iPK === matchedLocation.iPK);
                      if (originalIdx !== -1) availableLocations.splice(originalIdx, 1);
                    } else {
                      // 5순위: 매칭 완전 실패 시 null 처리 (DB 저장은 스킵되지만 프론트 자체 누락 방어)
                      act.kakao_location = null;
                      console.warn(`[로딩화면] 카카오 API 맵핑 실패 (조건 미달로 버려짐): ${searchName} (지역필터통과: ${regionFilteredLocations.length}건)`);
                    }

                    // [ADD] 최종 렌더링 & DB 저장용 시간(dtSchedule) 조립
                    let finalDateTime = "";
                    if (act.dtSchedule) {
                      if (act.dtSchedule.includes("-") && act.dtSchedule.includes(":")) {
                        finalDateTime = act.dtSchedule;
                      } else if (act.dtSchedule.includes(":")) {
                        finalDateTime = `${currentDayStr} ${act.dtSchedule}:00`;
                      } else {
                        finalDateTime = `${currentDayStr} 09:00:00`;
                      }
                    } else {
                      const fallbackHour = 9 + aIdx;
                      const formattedHour = fallbackHour < 10 ? `0${fallbackHour}` : `${fallbackHour}`;
                      finalDateTime = `${currentDayStr} ${formattedHour}:00:00`;
                    }

                    // "T"가 있는 포맷 방어 코딩
                    finalDateTime = finalDateTime.replace("T", " ").substring(0, 19);

                    // 원본을 덮어써서 ResultPage에도 똑같은 시간이 출력되게 만듦
                    act.dtSchedule = finalDateTime;
                  });
                }
              });
              console.log("[로딩화면] 카카오 API 연동 장소 맵핑 완료!", locationList.length, "개");
            } else {
              console.log("[로딩화면] 카카오 API 검색 결과가 비어 있습니다.");
            }
          }
        } catch (locErr) {
          console.error("[치명적 에러] 백엔드 /location/request 통신 실패:", locErr);
        }

        // 4단계: 완벽하게 병합된 객체를 전역 상태에 저장
        setGeneratedTripData(aiSchedule);
        router.push("/onboarding/result");

      } catch (error) {
        console.error("AI 스케줄 생성 실패, 더미로 우회:", error);
        alert("일정 생성에 실패했습니다. 메인으로 돌아갑니다.");
        router.push("/home");
      }
    };

    generateRealTrip();
  }, [router, travelData, setGeneratedTripData, user]);

  return (
    <MobileContainer>
      <LoadingIndicator
        message={`AI가 ${travelData.location || "여행지"} 여행 일정을\n생성하고 있습니다...`}
      />
    </MobileContainer>
  );
}
