"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { TextInput } from "../../../components/common/TextInput";
import { BottomCTAButton } from "../../../components/common/Button";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

export default function LocationInputPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [location, setLocation] = useState(travelData.location || "");

  const handleNext = () => {
    if (location.trim()) {
      setTravelData({ location });
      if (travelData.creationType === "manual") {
        router.push("/onboarding/date");
      } else {
        router.push("/onboarding/accommodation");
      }
    }
  };

  return (
    <StepLayout
      title="어디로 여행 가시나요?"
      isFirstStep={true}
      onBack={() => router.push("/login")}
      footer={
        <BottomCTAButton onClick={handleNext} disabled={!location.trim()}>
          다음
        </BottomCTAButton>
      }
    >
      <TextInput
        placeholder="예) 제주도, 오사카, 다낭"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onEnter={handleNext}
        autoFocus
      />
    </StepLayout>
  );
}
