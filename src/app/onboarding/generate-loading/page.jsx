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
        const rawCompanion = travelData.companions?.[0];
        const companionLabel = COMPANION_MAP[rawCompanion?.name || rawCompanion] || "나홀로";

        const TRANSPORT_MAP = {
          car: "자동차",
          public: "대중교통",
          bike: "자전거",
          walk: "도보",
          other: "기타",
        };
        const transportLabel = TRANSPORT_MAP[travelData.transport] || travelData.transport || "대중교통";

        const tripStyleLabel = travelData.styles?.length > 0
          ? travelData.styles.map((s) => s.label || "").filter(Boolean).join(", ")
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

        // 2단계: AI가 뱉어낸 장소들만 추출하여 카카오 지도 검색 요청
        try {
          const rawPlaces = [];
          if (aiSchedule?.day_schedules) {
            aiSchedule.day_schedules.forEach((day) => {
              if (day.activities) {
                day.activities.forEach((act) => {
                  if (act.place_name) {
                    rawPlaces.push({
                      place_name: act.place_name,
                      category_group_code: act.category_group_code || null,
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

              aiSchedule.day_schedules.forEach((day, dIdx) => {
                if (day.activities) {
                  day.activities.forEach((act, aIdx) => {
                    const searchName = act.place_name?.trim() || "";
                    if (!searchName) return;

                    // 1순위: 완벽 일치
                    let matchIdx = availableLocations.findIndex(loc => loc.strName === searchName);

                    // 2순위: 단어 포함 매칭 (몽상드애월 본점 == 몽상드애월)
                    if (matchIdx === -1) {
                      matchIdx = availableLocations.findIndex(
                        loc => loc.strName.includes(searchName) || searchName.includes(loc.strName)
                      );
                    }

                    if (matchIdx !== -1) {
                      act.kakao_location = availableLocations[matchIdx];
                      availableLocations.splice(matchIdx, 1);
                    } else if (availableLocations.length > 0) {
                      // 3순위: 그래도 못 찾았다면 카용되지 않은 잉여 카카오 검색 결과 중 순서대로 강제 접착
                      act.kakao_location = availableLocations.shift();
                    }
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
