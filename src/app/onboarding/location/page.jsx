"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { TextInput } from "../../../components/common/TextInput";
import { BottomCTAButton } from "../../../components/common/Button";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import { useCurrentUser } from "../../../hooks/useCurrentUser"; // [ADD]

export default function LocationInputPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [location, setLocation] = useState(travelData.location || "");

  const handleNext = () => {
    if (location.trim()) {
      setTravelData({ location });
      // [MOD] 숙소 입력 화면만 건너뛰고 바로 날짜 선택으로 이동
      router.push("/onboarding/date");
    }
  };

  return (
    <StepLayout
      title="어디로 여행 가시나요?"
      isFirstStep={true}
      onBack={() => {
        const token = localStorage.getItem("token");
        router.push(token ? "/home" : "/login");
      }}
      footer={
        <BottomCTAButton onClick={handleNext} disabled={!location.trim()}>
          다음
        </BottomCTAButton>
      }
    >
      <TextInput
        placeholder="예) 제주, 경주, 부산"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onEnter={handleNext}
        autoFocus
      />
    </StepLayout>
  );
}
