"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import Image from "next/image";
import { clsx } from "clsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function BudgetInputPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();

  // Get accommodations from store
  const accommodations = travelData.accommodations || [];

  const [accommodationBudget, setAccommodationBudget] = useState("");
  const [accommodationRatio, setAccommodationRatio] = useState("");
  const [foodBudget, setFoodBudget] = useState("");
  const [foodRatio, setFoodRatio] = useState("");
  const [transportBudget, setTransportBudget] = useState("");
  const [transportRatio, setTransportRatio] = useState("");
  const [etcBudget, setEtcBudget] = useState("");
  const [etcRatio, setEtcRatio] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(80);

  const handleEditAccommodation = () => {
    // Navigate back to accommodation page for editing
    router.push("/onboarding/accommodation");
  };

  const handleNext = () => {
    const budgetData = {
      accommodation: {
        amount: parseInt(accommodationBudget) || 0,
        ratio: parseInt(accommodationRatio) || 0,
      },
      food: {
        amount: parseInt(foodBudget) || 0,
        ratio: parseInt(foodRatio) || 0,
      },
      transport: {
        amount: parseInt(transportBudget) || 0,
        ratio: parseInt(transportRatio) || 0,
      },
      etc: { amount: parseInt(etcBudget) || 0, ratio: parseInt(etcRatio) || 0 },
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
      title="마지막으로 예산을 입력해 주세요"
      onBack={() => router.push("/onboarding/date")}
      rightAction={
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-[#111111] underline tracking-[-0.35px]"
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
      {/* Main Content */}
      <div className="flex flex-col gap-6">
        {/* Accommodations Section */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-normal text-[#8b95a1] tracking-[-0.32px]">
            장소
          </p>

          {accommodations.length > 0 ? (
            // Show accommodation list when there are accommodations
            <div className="flex flex-col gap-4">
              {accommodations.map((accommodation, index) => (
                <React.Fragment key={index}>
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-base font-semibold text-[#111111] tracking-[-0.06px]">
                        {accommodation.name}
                      </p>
                      <p className="text-[15px] font-medium text-[#6e6e6e] tracking-[-0.06px]">
                        {accommodation.dates}
                      </p>
                    </div>
                    <button
                      onClick={handleEditAccommodation}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <Image
                        src="/icons/edit.svg"
                        alt="edit"
                        width={13}
                        height={13}
                        className="w-[13px] h-[13px]"
                      />
                      <span className="text-sm font-medium text-[#a7a7a7] tracking-[-0.35px]">
                        편집
                      </span>
                    </button>
                  </div>
                  {index < accommodations.length - 1 && (
                    <div className="h-[1px] bg-[rgba(229,235,241,0.7)]" />
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            // Show budget input fields when there are no accommodations
            <div className="flex gap-[3px]">
              <input
                type="text"
                placeholder="숫자 입력 ex)5000"
                value={accommodationBudget}
                onChange={(e) =>
                  setAccommodationBudget(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="flex-1 px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999]"
              />
              <input
                type="text"
                placeholder="비중 입력"
                value={accommodationRatio}
                onChange={(e) =>
                  setAccommodationRatio(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-[104px] px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999] text-center"
              />
            </div>
          )}
        </div>

        {/* Food Budget */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-normal text-[#8b95a1] tracking-[-0.32px]">
            식비
          </p>
          <div className="flex gap-[3px]">
            <input
              type="text"
              placeholder="숫자 입력 ex)5000"
              value={foodBudget}
              onChange={(e) =>
                setFoodBudget(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="flex-1 px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999]"
            />
            <input
              type="text"
              placeholder="비중 입력"
              value={foodRatio}
              onChange={(e) =>
                setFoodRatio(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-[104px] px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999] text-center"
            />
          </div>
        </div>

        {/* Transport Budget */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-normal text-[#8b95a1] tracking-[-0.32px]">
            교통비
          </p>
          <div className="flex gap-[3px]">
            <input
              type="text"
              placeholder="숫자 입력 ex)5000"
              value={transportBudget}
              onChange={(e) =>
                setTransportBudget(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="flex-1 px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999]"
            />
            <input
              type="text"
              placeholder="비중 입력"
              value={transportRatio}
              onChange={(e) =>
                setTransportRatio(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-[104px] px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999] text-center"
            />
          </div>
        </div>

        {/* Etc Budget */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-normal text-[#8b95a1] tracking-[-0.32px]">
            기타
          </p>
          <div className="flex gap-[3px]">
            <input
              type="text"
              placeholder="숫자 입력 ex)5000"
              value={etcBudget}
              onChange={(e) =>
                setEtcBudget(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="flex-1 px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999]"
            />
            <input
              type="text"
              placeholder="비중 입력"
              value={etcRatio}
              onChange={(e) =>
                setEtcRatio(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-[104px] px-4 py-3 bg-[#f5f5f5] rounded-lg text-base font-medium text-[#111111] placeholder:text-[#999999] text-center"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[rgba(229,235,241,0.7)]" />

        {/* Alert Settings */}
        <div className="flex flex-col gap-7">
          <div className="flex items-center justify-between gap-5">
            <p className="text-base font-medium text-[#111111] tracking-[-0.32px]">
              경고 알림 설정
            </p>
            <button
              onClick={() => setAlertEnabled(!alertEnabled)}
              className="relative"
            >
              <Image
                src={
                  alertEnabled
                    ? "/icons/toggle-on.svg"
                    : "/icons/toggle-off.svg"
                }
                alt="toggle"
                width={48}
                height={24}
                className="w-12 h-6"
              />
            </button>
          </div>

          {/* Alert Threshold */}
          {alertEnabled && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-normal text-[#111111] tracking-[-0.32px]">
                  예산 금액이
                </span>
                <span className="text-[15px] font-bold text-[#7a28fa] tracking-[-0.32px]">
                  {alertThreshold}%
                </span>
                <span className="text-[15px] font-normal text-[#111111] tracking-[-0.32px]">
                  남으면 경고 알림
                </span>
              </div>

              {/* Slider */}
              <div className="relative pt-4 pb-1">
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                    .budget-slider {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 100%;
                      height: 4px;
                      border-radius: 100px;
                      outline: none;
                      cursor: pointer;
                    }
                    
                    .budget-slider::-webkit-slider-thumb {
                      -webkit-appearance: none;
                      appearance: none;
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background: white;
                      border: 2px solid #111111;
                      cursor: pointer;
                    }
                    
                    .budget-slider::-moz-range-thumb {
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background: white;
                      border: 2px solid #111111;
                      cursor: pointer;
                    }
                  `,
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                  className="budget-slider"
                  style={{
                    background: `linear-gradient(to right, #111111 0%, #111111 ${alertThreshold}%, #d9d9d9 ${alertThreshold}%, #d9d9d9 100%)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </StepLayout>
  );
}
