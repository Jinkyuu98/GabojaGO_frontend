"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import Image from "next/image";

const sliderStyles = `
  .budget-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 100px;
    outline: none;
    cursor: pointer;
  }
  .budget-range:disabled {
    cursor: default;
  }
  .budget-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #ffffff;
    border: 1px solid #7a28fa;
    cursor: pointer;
  }
  .budget-range:disabled::-webkit-slider-thumb {
    display: none;
  }
  .budget-range::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #111111;
    cursor: pointer;
    box-sizing: border-box;
  }
  .budget-range:disabled::-moz-range-thumb {
    display: none;
  }
`;

function formatAmount(value) {
  if (!value || isNaN(value) || value <= 0) return "0";
  return Math.round(value).toLocaleString("ko-KR");
}

function BudgetSlider({ value, onChange, disabled = false }) {
  const fillColor = disabled ? "#c4c4c4" : "#7a28fa";
  const emptyColor = "#d9d9d9";
  return (
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="budget-range"
      style={{
        background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${value}%, ${emptyColor} ${value}%, ${emptyColor} 100%)`,
      }}
    />
  );
}

function CategoryCard({ label, note, ratio, onRatioChange, amount, disabled = false }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-4 bg-[#FAFAFA]">
      {/* Label Row */}
      <div className="flex items-center justify-between gap-5 mb-1">
        <p className="text-base font-medium text-[#111111] tracking-[-0.32px]">{label}</p>
        {note && (
          <p className="text-[13px] font-normal text-[#8b95a1] tracking-[-0.32px]">{note}</p>
        )}
      </div>

      {/* Slider */}
      <BudgetSlider value={ratio} onChange={onRatioChange} disabled={disabled} />

      {/* Amount Row */}
      <div className="flex items-center justify-between gap-5 mt-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-normal text-[#8b95a1] tracking-[-0.32px]">설정 금액</span>
          <span className="text-base font-bold text-[#7a28fa] tracking-[-0.32px]">
            {formatAmount(amount)}원
          </span>
        </div>
        <span className="text-base font-normal text-[#7a28fa] tracking-[-0.32px]">{ratio}%</span>
      </div>
    </div>
  );
}

export default function BudgetInputPage() {
  const router = useRouter();
  const { setTravelData } = useOnboardingStore();

  const [totalBudget, setTotalBudget] = useState("");
  const [accommodationRatio, setAccommodationRatio] = useState(80);
  const [foodRatio, setFoodRatio] = useState(80);
  const [transportRatio, setTransportRatio] = useState(80);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(80);

  const total = parseInt(totalBudget) || 0;
  const accommodationAmount = Math.round((total * accommodationRatio) / 100);
  const foodAmount = Math.round((total * foodRatio) / 100);
  const transportAmount = Math.round((total * transportRatio) / 100);
  const etcAmount = Math.max(0, total - accommodationAmount - foodAmount - transportAmount);
  const etcRatio = total > 0 ? Math.min(100, Math.round((etcAmount / total) * 100)) : 0;

  const handleNext = () => {
    const budgetData = {
      accommodation: { amount: accommodationAmount, ratio: accommodationRatio },
      food: { amount: foodAmount, ratio: foodRatio },
      transport: { amount: transportAmount, ratio: transportRatio },
      etc: { amount: etcAmount, ratio: etcRatio },
      alertEnabled,
      alertThreshold,
    };
    setTravelData({ budget: budgetData });
    router.push("/onboarding/generate-loading");
  };

  const handleSkip = () => {
    router.push("/onboarding/generate-loading");
  };

  return (
    <StepLayout
      title="마지막으로 예상 비용을 입력해 주세요"
      onBack={() => router.push("/onboarding/date")}
      // [MOD] PC 환경에서 하단 버튼을 고정시키기 위해 fixedFooter 속성 추가
      fixedFooter
      rightAction={
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-[#999999] tracking-[-0.35px]"
        >
          건너뛰기
        </button>
      }
      footer={
        <button
          onClick={handleNext}
          className="w-full py-[14px] bg-[#d9d9d9] rounded-xl text-base font-semibold text-white tracking-[-0.06px]"
        >
          완료
        </button>
      }
    >
      {/* Slider global styles */}
      <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />

      <div className="flex flex-col gap-10">
        {/* Total Budget Input */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-normal text-[#8b95a1] tracking-[-0.32px]">예산 총액</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 px-4 py-[17px] bg-[#f1f1f5] rounded-lg">
              <input
                type="text"
                inputMode="numeric"
                placeholder="숫자 입력 ex)500000"
                value={totalBudget}
                onChange={(e) =>
                  setTotalBudget(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-full bg-transparent text-base font-medium text-[#111111] placeholder:text-[#999999] outline-none"
              />
            </div>
            <span className="text-lg font-medium text-[#8b95a1] tracking-[-0.32px] flex-shrink-0">
              원
            </span>
          </div>
        </div>

        {/* Category Budget Cards */}
        <div className="flex flex-col gap-5">
          <CategoryCard
            label="숙소"
            ratio={accommodationRatio}
            onRatioChange={(e) => setAccommodationRatio(parseInt(e.target.value))}
            amount={accommodationAmount}
          />
          <CategoryCard
            label="식비"
            ratio={foodRatio}
            onRatioChange={(e) => setFoodRatio(parseInt(e.target.value))}
            amount={foodAmount}
          />
          <CategoryCard
            label="교통비"
            ratio={transportRatio}
            onRatioChange={(e) => setTransportRatio(parseInt(e.target.value))}
            amount={transportAmount}
          />
          <CategoryCard
            label="기타"
            note="* 위 항목이 입력되면 자동 설정됨"
            ratio={etcRatio}
            onRatioChange={() => { }}
            amount={etcAmount}
            disabled={true}
          />
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[rgba(229,235,241,0.7)]" />

        {/* Alert Settings */}
        <div className="flex flex-col gap-6">
          {/* Toggle Row */}
          <div className="flex items-center justify-between gap-5">
            <p className="text-base font-semibold text-[#111111] tracking-[-0.32px]">경고 알림 설정</p>
            <button
              onClick={() => setAlertEnabled(!alertEnabled)}
              className="flex-shrink-0"
              aria-label="경고 알림 설정 토글"
            >
              <Image
                src={alertEnabled ? "/icons/toggle-on.svg" : "/icons/toggle-off.svg"}
                alt="toggle"
                width={48}
                height={24}
                className="w-12 h-6"
              />
            </button>
          </div>

          {/* Alert Threshold Slider — always visible */}
          <div className="flex flex-col gap-3">
            <BudgetSlider
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
            />
            <div className="flex items-center gap-1">
              <span className="text-base font-normal text-[#111111] tracking-[-0.32px]">
                예산 금액이
              </span>
              <span className="text-base font-bold text-[#7a28fa] tracking-[-0.32px]">
                {alertThreshold}%
              </span>
              <span className="text-base font-normal text-[#111111] tracking-[-0.32px]">
                남으면 경고 알림
              </span>
            </div>
          </div>
        </div>
      </div>
    </StepLayout>
  );
}
