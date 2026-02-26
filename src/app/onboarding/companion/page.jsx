"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { BottomCTAButton } from "../../../components/common/Button";
import { TextInput } from "../../../components/common/TextInput";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import { clsx } from "clsx";

const OPTIONS = [
  { label: "혼자", value: "alone" },
  { label: "연인과", value: "couple" },
  { label: "친구와", value: "friends" },
  { label: "가족과", value: "family" },
  { label: "부모님과", value: "parents" },
  { label: "기타", value: "etc" },
];

export default function CompanionSelectionPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [companions, setCompanions] = useState(travelData.companions || []);
  const [etcText, setEtcText] = useState("");

  const handleSelect = (value) => {
    if (value === "alone") {
      setCompanions(["alone"]);
    } else {
      let newCompanions = companions.includes("alone") ? [] : [...companions];
      if (newCompanions.includes(value)) {
        newCompanions = newCompanions.filter((c) => c !== value);
      } else {
        newCompanions.push(value);
      }
      setCompanions(newCompanions);
    }
  };

  const isNextDisabled = () => {
    if (companions.length === 0) return true;
    if (companions.includes("etc") && !etcText.trim()) return true;
    return false;
  };

  const handleNext = () => {
    // 기타 텍스트가 있으면 실제 데이터로 저장하는 전처리 (향후 수정 확장 가능)
    setTravelData({ companions });
    if (travelData.creationType === "manual") {
      router.push("/onboarding/style");
    } else {
      router.push("/onboarding/transport");
    }
  };

  return (
    <StepLayout
      title="누구와 함께하시나요?"
      onBack={() => router.push("/onboarding/date")}
      footer={
        <BottomCTAButton onClick={handleNext} disabled={isNextDisabled()}>
          다음
        </BottomCTAButton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {OPTIONS.map((opt) => {
            const isSelected = companions.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={clsx(
                  "h-[60px] rounded-2xl text-[16px] font-semibold transition-colors duration-200 border",
                  isSelected
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "bg-white text-[#999999] border-[#e5e5e5] hover:border-[#111111]",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {companions.includes("etc") && (
          <div className="mt-2">
            <TextInput
              placeholder="직접 입력해 주세요 (16자 이내)"
              value={etcText}
              onChange={(e) => {
                if (e.target.value.length <= 16) setEtcText(e.target.value);
              }}
              autoFocus
            />
            <div className="text-right mt-2 text-sm text-[#999999]">
              {etcText.length}/16
            </div>
          </div>
        )}
      </div>
    </StepLayout>
  );
}
