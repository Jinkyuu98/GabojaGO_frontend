"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { StepLayout } from "../../../components/common/StepLayout";
import { TravelCalendarPicker } from "../../../components/common/TravelCalendarPicker";
import { useOnboardingStore } from "../../../store/useOnboardingStore";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Image from "next/image";
import { clsx } from "clsx";

export default function DateSelectionPage() {
  const router = useRouter();
  const { travelData, setTravelData } = useOnboardingStore();
  const [startDate, setStartDate] = useState(
    travelData.startDate ? new Date(travelData.startDate) : null,
  );
  const [endDate, setEndDate] = useState(
    travelData.endDate ? new Date(travelData.endDate) : null,
  );

  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleNext = () => {
    if (startDate && endDate) {
      setTravelData({ startDate, endDate });
      router.push("/onboarding/companion");
    }
  };

  return (
    <StepLayout
      title="여행 기간을 선택해 주세요"
      onBack={() => {
        if (travelData.creationType === "manual") {
          router.push("/onboarding/location");
        } else {
          router.push("/onboarding/accommodation");
        }
      }}
      contentBgColor="bg-[#fafafa]"
      showDivider={true}
      fixedFooter={true}
      footer={
        <>
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-[#111111] tracking-[-0.5px]">
              선택한 날짜
            </span>
            {startDate && endDate && (
              <span className="text-[15px] font-semibold text-[#7a28fa] tracking-[-0.5px]">
                {format(startDate, "M월 d일", { locale: ko })} ~{" "}
                {format(endDate, "d일", { locale: ko })}
              </span>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={!startDate || !endDate}
            className={clsx(
              "w-full py-[14px] rounded-xl text-base font-semibold tracking-[-0.06px] transition-opacity",
              {
                "bg-[#111111] text-white": startDate && endDate,
                "bg-gray-300 text-gray-500 cursor-not-allowed":
                  !startDate || !endDate,
              },
            )}
          >
            다음
          </button>
        </>
      }
    >
      <TravelCalendarPicker
        startDate={startDate}
        endDate={endDate}
        onChange={handleDateChange}
      />
    </StepLayout>
  );
}
