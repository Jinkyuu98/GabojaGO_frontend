"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "../layout/MobileContainer";
import { HeaderBackButton } from "../common/HeaderBackButton";
import { CancelConfirmModal } from "./CancelConfirmModal";
import { useOnboardingStore } from "../../store/useOnboardingStore";

export const StepLayout = ({
  children,
  title,
  onBack,
  rightAction,
  footer,
  showHeader = true,
  contentBgColor = "bg-white",
  showDivider = false,
  fixedFooter = false, // PC에서 하단 고정 여부
  isFirstStep = false, // 온보딩 첫 단계일 경우 뒤로 가기 시 이탈 팝업 띄우기
}) => {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { user, resetTravelData } = useOnboardingStore();

  const handleBackIntercept = () => {
    if (isFirstStep) {
      setShowCancelModal(true);
    } else if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleConfirmCancel = () => {
    resetTravelData();
    setShowCancelModal(false);
    // user가 있으면 /home으로, 없으면 /login으로 이동
    router.push(user ? "/home" : "/login");
  };

  return (
    <>
      <MobileContainer className="lg:bg-[#f2f4f6]">
        <div className="flex flex-col h-screen lg:h-[840px] w-full lg:max-w-[640px] lg:mx-auto lg:my-auto bg-white relative lg:rounded-[28px] overflow-hidden lg:border lg:border-[#e5eaf1]">
          {/* Header */}
          {showHeader && (
            <div className="px-6 pt-8 pb-6 shrink-0 bg-white">
              <div className="flex justify-between items-center mb-12">
                <HeaderBackButton onBack={handleBackIntercept} />
                {rightAction && rightAction}
              </div>
              {title && (
                <h1 className="text-[22px] font-semibold text-[#111111] tracking-[-0.5px] leading-[1.5] whitespace-pre-wrap">
                  {title}
                </h1>
              )}
            </div>
          )}

          {/* Divider */}
          {showHeader && showDivider && (
            <div className="h-[1px] bg-[rgba(229,235,241,0.7)] shrink-0" />
          )}

          {/* Content Section */}
          <div
            className={`flex-1 flex flex-col ${contentBgColor} px-5 pt-8 pb-32 lg:pb-8 overflow-y-auto`}
          >
            <div className="flex-none">{children}</div>

            {/* PC (Desktop) 전용 하단 버튼: 콘텐츠 아래 자연스럽게 위치 (fixedFooter가 아닐 때만 렌더링) */}
            {footer && !fixedFooter && (
              <div className="hidden lg:flex flex-col gap-4 mt-8">
                {footer}
              </div>
            )}
          </div>

          {/* Bottom Fixed Section (Mobile OR fixedFooter=true PC) */}
          {footer && (
            <div
              className={`fixed bottom-0 left-0 right-0 bg-white border-t border-[#f2f4f6] z-20 ${fixedFooter
                ? "lg:absolute lg:w-full lg:rounded-b-[28px] overflow-hidden"
                : "lg:hidden"
                }`}
            >
              <div className="px-5 py-4 flex flex-col gap-4">{footer}</div>
            </div>
          )}
        </div>
      </MobileContainer>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />
    </>
  );
};
