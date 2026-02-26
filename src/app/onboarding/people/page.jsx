"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { StepperInput } from "../../../components/common/StepperInput";
import { BottomCTAButton } from "../../../components/common/Button";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

export default function PeopleCountPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [peopleCount, setPeopleCount] = useState(travelData.peopleCount || 1);

  const handleNext = () => {
    setTravelData({ peopleCount });
    router.push("/onboarding/transport");
  };

  return (
    <StepLayout
      title={`몇 명이서\n가시나요?`}
      onBack={() => router.push("/onboarding/companion")}
    >
      <div className="mt-6">
        <StepperInput
          value={peopleCount}
          onChange={setPeopleCount}
          min={1}
          max={99}
        />
      </div>
      <BottomCTAButton onClick={handleNext}>다음</BottomCTAButton>
    </StepLayout>
  );
}
