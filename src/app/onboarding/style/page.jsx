"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { SelectChipGroup } from "../../../components/common/SelectChip";
import { BottomCTAButton } from "../../../components/common/Button";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

const CATEGORIES = {
  ACTIVITY: [
    { label: "체험/액티비티", value: "activity" },
    { label: "핫플레이스", value: "hotplace" },
    { label: "문화/역사", value: "culture" },
    { label: "유명 관광지", value: "landmark" },
  ],
  HEALING: [
    { label: "자연경관", value: "nature" },
    { label: "휴양/힐링", value: "healing" },
    { label: "등산", value: "hiking" },
  ],
  FOOD: [
    { label: "맛집", value: "restaurant" },
    { label: "카페", value: "cafe" },
    { label: "시장", value: "market" },
    { label: "야시장/노점", value: "nightmarket" },
  ],
  OTHER: [
    { label: "쇼핑", value: "shopping" },
    { label: "효도 관광", value: "parents" },
    { label: "기타 입력", value: "other" },
  ],
};

export default function TravelStylePage() {
  const router = useRouter();
  const { travelData, setTravelData, saveTrip } = useOnboardingStore();
  const [styles, setStyles] = useState(travelData.styles || []);

  const handleNext = async () => {
    setTravelData({ styles });
    if (travelData.creationType === "manual") {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          // 비로그인 상태면 로그인 페이지로
          router.push("/login?from=result_save&showClose=true");
          return;
        }

        const newTrip = await saveTrip();
        if (newTrip && newTrip.id) {
          router.push(`/trips/${newTrip.id}`);
        } else {
          alert("일정 데이터가 없거나 저장에 실패했습니다.");
        }
      } catch (err) {
        console.error("[StylePage] saveTrip error:", err);
        const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || "알 수 없는 에러";
        alert(`일정 생성에 실패했습니다: ${JSON.stringify(errorMsg)}`);
      }
    } else {
      router.push("/onboarding/budget");
    }
  };

  const handleChange = (newStyles) => {
    setStyles(newStyles);
  };

  return (
    <StepLayout
      title="어떤 여행을 선호하시나요?"
      onBack={() => {
        if (travelData.creationType === "manual") {
          router.push("/onboarding/companion");
        } else {
          router.push("/onboarding/transport");
        }
      }}
      footer={
        <BottomCTAButton onClick={handleNext} disabled={styles.length === 0}>
          다음
        </BottomCTAButton>
      }
    >
      <div className="mb-6">
        <h3 className="text-base text-text-dim mb-3 font-medium">
          활동/관광
        </h3>
        <SelectChipGroup
          options={CATEGORIES.ACTIVITY}
          selected={styles}
          onChange={handleChange}
          multi={true}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-base text-text-dim mb-3 font-medium">
          힐링/자연
        </h3>
        <SelectChipGroup
          options={CATEGORIES.HEALING}
          selected={styles}
          onChange={handleChange}
          multi={true}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-base text-text-dim mb-3 font-medium">
          음식/음료
        </h3>
        <SelectChipGroup
          options={CATEGORIES.FOOD}
          selected={styles}
          onChange={handleChange}
          multi={true}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-base text-text-dim mb-3 font-medium">
          기타 테마
        </h3>
        <SelectChipGroup
          options={CATEGORIES.OTHER}
          selected={styles}
          onChange={handleChange}
          multi={true}
        />
      </div>
    </StepLayout>
  );
}
