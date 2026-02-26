"use client";

import React, { useEffect } from "react";
import { clsx } from "clsx";

/**
 * [NEW] Toast Component
 * @param {string} message - 표시할 텍스트
 * @param {string} actionText - 우측 버튼 텍스트
 * @param {function} onAction - 우측 버튼 클릭 시 실행할 함수
 * @param {boolean} isVisible - 표시 여부
 * @param {function} onClose - 닫기 함수
 * @param {string} position - 'top' (PC) | 'bottom' (Mobile)
 * @param {number} duration - 표시 시간 (ms)
 */
export const Toast = ({
  message,
  actionText,
  onAction,
  isVisible,
  onClose,
  position = "bottom",
  duration = 3000,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, duration]);

  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        "fixed left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-40px)] max-w-[400px] bg-[#111111]/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in",
        {
          "top-6 slide-in-from-top-4": position === "top",
          "bottom-[80px] slide-in-from-bottom-4": position === "bottom",
          "lg:top-6 lg:bottom-auto lg:slide-in-from-top-4": true, // PC 버전 항상 상단 고정
        },
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-medium leading-snug">{message}</span>
        {actionText && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
            className="text-[14px] font-bold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-all whitespace-nowrap"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};
