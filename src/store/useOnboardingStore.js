import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSchedule, addScheduleLocation } from "../services/schedule";

export const useOnboardingStore = create(
  persist(
    (set, get) => ({
      travelData: {
        creationType: "ai", // "ai" | "manual"
        location: "",
        accommodation: "", // Optional
        accommodations: [], // Array of {name, startDate, endDate}
        startDate: null,
        endDate: null,
        companions: [], // mixed type
        peopleCount: 1,
        transport: "",
        styles: [],
        budget: 0,
      },
      generatedTripData: null,
      myTrips: [],
      user: null,
      setTravelData: (data) =>
        set((state) => ({
          travelData: { ...state.travelData, ...data },
        })),
      setGeneratedTripData: (data) => set({ generatedTripData: data }),
      setUser: (user) => set({ user }),
      saveTrip: async () => {
        const state = get();
        if (state.travelData?.creationType === "ai" && !state.generatedTripData) {
          return {};
        }

        // Helper map for companion labels (Should match CompanionSelection options)
        const COMPANION_MAP = {
          alone: "나홀로",
          couple: "연인과 함께",
          friends: "친구와 함께",
          family: "가족과 함께",
          parents: "부모님과 함께",
          etc: "기타",
        };

        let rawCompanion = state.travelData?.companions?.[0];
        if (typeof rawCompanion === "object" && rawCompanion !== null) {
          rawCompanion = rawCompanion.name || "나홀로";
        }
        const companionLabel =
          COMPANION_MAP[rawCompanion] || (typeof rawCompanion === "string" ? rawCompanion : "나홀로");

        // 백엔드 명세에 맞춘 데이터 매핑
        const { travelData, user } = state;
        const budget = travelData.budget || {};

        // 예산 총합 계산
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

        // 날짜 포맷 (YYYY-MM-DD 변환 등 방어 로직)
        const formatDate = (dateStr) => {
          if (!dateStr) return new Date().toISOString().split("T")[0];
          if (typeof dateStr === "string") return dateStr.split("T")[0];
          if (typeof dateStr.toISOString === "function") return dateStr.toISOString().split("T")[0];
          // 알 수 없는 타입 방어
          return new Date().toISOString().split("T")[0];
        };

        // 여행 스타일(배열) 파싱 후 문자열로 결합 (예: "맛집, 자연경관")
        // 사용자가 선택한 travelData.styles 는 [{ label: "맛집", value: "restaurant" }, ...] 형태임
        const tripStyleLabel = travelData.styles?.length > 0
          ? travelData.styles.map(s => s.label || "").filter(Boolean).join(", ")
          : "일반";

        // 아이디가 문자열(String)인 경우 파싱 시도, 실패 시 임시값 1 부여
        const parsedUserId = parseInt(user?.id, 10);
        const safeUserId = isNaN(parsedUserId) ? 1 : parsedUserId;

        // 교통 수단 맵핑
        const TRANSPORT_MAP = {
          car: "자동차",
          public: "대중교통",
          bike: "자전거",
          walk: "도보",
          other: "기타",
        };
        const transportLabel = TRANSPORT_MAP[travelData.transport] || travelData.transport || "대중교통";

        const payload = {
          // iPK: 0 (제외하거나 0으로 세팅)
          iUserFK: safeUserId, // Store의 유저 정보 (항상 정수형)
          dtDate1: formatDate(travelData.startDate),
          dtDate2: formatDate(travelData.endDate),
          strWhere: travelData.location || "제주도",
          strWithWho: companionLabel,
          strTripStyle: tripStyleLabel,
          strTransport: transportLabel,
          nTotalPeople: travelData.peopleCount || 1,
          nTotalBudget: calculateTotalBudget(budget),
          nAlarmRatio: budget.alertThreshold || 25, // 경고 알림 설정치 혹은 임의
          nTransportRatio: budget.transport?.ratio || 25,
          nLodgingRatio: budget.accommodation?.ratio || 25,
          nFoodRatio: budget.food?.ratio || 25,
          chStatus: "A", // 새로 생성되는 일정이므로 '예정(A)' 상태 부여
          dtCreate: new Date().toISOString().replace("T", " ").substring(0, 19),
        };

        try {
          // 1) 백엔드 /schedule/create 통신
          const createdRes = await createSchedule(payload);
          const iScheduleFK = createdRes?.iPK;

          // 2) 로딩 화면에서 미리 병합해 둔 카카오 API(kakao_location) 데이터를 그대로 읽어 자식 테이블(Location)에 적재
          if (iScheduleFK && state.generatedTripData?.day_schedules) {
            try {
              for (const dayObj of state.generatedTripData.day_schedules) {
                if (!Array.isArray(dayObj.activities)) continue;
                for (const act of dayObj.activities) {
                  const loc = act.kakao_location; // 파이프라인(generate-loading)에서 미리 합쳐진 객체
                  if (loc && loc.iPK) {
                    await addScheduleLocation({
                      iScheduleFK: iScheduleFK,
                      iLocationFK: loc.iPK,
                      dtSchedule: act.dtSchedule || new Date().toISOString().replace("T", " ").substring(0, 19),
                      strMemo: act.strMemo || "방문",
                    });
                  }
                }
              }
              console.log("[saveTrip] 장소 DB(자식 테이블) 트리 일괄 저장 처리 완료");
            } catch (locErr) {
              console.error("[saveTrip Error] 장소 DB 저장 실패 (스케줄은 생성됨)", locErr);
            }
          }

          // 4) 성공 시 로컬 Store에 저장 (Trips 페이지에서 렌더링 할 데이터)
          // (백엔드에서 오는 값과 프론트엔드 목업이 섞이므로 UI에서 문제 없도록 조정)
          const newTrip = {
            ...state.generatedTripData,
            id: createdRes?.iPK || Date.now(), // DB가 내려주는 PK, 혹은 fallback
            title: createdRes?.strWhere ? `${createdRes?.strWhere} 여행` : "여행 일정",
            createdAt: new Date(),
            tags: ["🌿 자연", "☕️ 카페"], // Mock tags
            totalBudget: payload.nTotalBudget,
            usedBudget: 0,
            imageUrl: "",
            companion: companionLabel,
            startDate: payload.dtDate1,
            endDate: payload.dtDate2,
          };

          set((s) => ({
            myTrips: [...s.myTrips, newTrip],
            generatedTripData: null,
          }));
          return newTrip;

        } catch (error) {
          console.error("[saveTrip Error] 일정 저장 실패", error);
          throw error; // UI 등에서 예외 처리 가능하게 넘김
        }
      },
      resetTravelData: () =>
        set({
          travelData: {
            creationType: "ai",
            location: "",
            accommodation: "",
            accommodations: [],
            startDate: null,
            endDate: null,
            companions: [],
            peopleCount: 1,
            transport: "",
            styles: [],
            budget: 0,
          },
          generatedTripData: null,
        }),
    }),
    {
      name: "gabojago-travel-storage-v2",
    },
  ),
);
