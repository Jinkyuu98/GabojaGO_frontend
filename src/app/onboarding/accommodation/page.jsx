"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { TextInput } from "../../../components/common/TextInput";
import { BottomCTAButton } from "../../../components/common/Button";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

export default function AccommodationSearchPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [accommodation, setAccommodation] = useState(
    travelData.accommodation || "",
  );

  const handleNext = () => {
    setTravelData({ accommodation });
    router.push("/onboarding/date");
  };

  return (
    <StepLayout
      title="숙소는 어디로 할까요?"
      onBack={() => router.push("/onboarding/location")}
      rightAction={
        <button
          onClick={handleNext}
          className="text-[14px] font-medium text-[#7e7e7e] bg-transparent border-none cursor-pointer p-2"
        >
          건너뛰기
        </button>
      }
      footer={
        <BottomCTAButton onClick={handleNext} disabled={!accommodation.trim()}>
          다음
        </BottomCTAButton>
      }
    >
      <TextInput
        placeholder="호텔, 에어비앤비 등 (선택)"
        value={accommodation}
        onChange={(e) => setAccommodation(e.target.value)}
      />
    </StepLayout>
  );
}
