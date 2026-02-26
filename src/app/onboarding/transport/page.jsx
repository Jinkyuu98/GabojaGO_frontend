"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { RadioCard } from "../../../components/common/RadioCard";
import { BottomCTAButton } from "../../../components/common/Button";
import { useOnboardingStore } from "../../../store/useOnboardingStore";

const OPTIONS = [
  { label: "자동차", value: "car", icon: "🚗" },
  { label: "대중교통", value: "public", icon: "🚌" },
  { label: "자전거", value: "bike", icon: "🚲" },
  { label: "도보", value: "walk", icon: "🚶" },
  { label: "기타", value: "other", icon: "🚎" },
];

export default function TransportSelectionPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [transport, setTransport] = useState(travelData.transport || "");

  const handleNext = () => {
    setTravelData({ transport });
    router.push("/onboarding/style");
  };

  return (
    <StepLayout
      title="이동 수단은 무엇인가요?"
      onBack={() => router.push("/onboarding/companion")}
      footer={
        <BottomCTAButton onClick={handleNext} disabled={!transport}>
          다음
        </BottomCTAButton>
      }
    >
      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => (
          <RadioCard
            key={option.value}
            label={option.label}
            icon={option.icon}
            value={option.value}
            selectedValue={transport}
            onChange={setTransport}
          />
        ))}
      </div>
    </StepLayout>
  );
}
