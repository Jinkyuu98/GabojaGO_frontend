"use client";

import React from "react";

/**
 * [ADD] AlertDialog
 * 사용자에게 확인을 요청하거나 알림을 표시하는 프리미엄 디자인의 모달 컴포넌트입니다.
 *
 * @param {boolean} isOpen 모달 표시 여부
 * @param {string} title 주요 텍스트
 * @param {string} description 서브 텍스트
 * @param {string} cancelText 취소/왼쪽 버튼 텍스트
 * @param {string} confirmText 확인/오른쪽 버튼 텍스트
 * @param {function} onCancel 취소 클릭 시 실행할 함수
 * @param {function} onConfirm 확인 클릭 시 실행할 함수
 */
export const AlertDialog = ({
  isOpen,
  title,
  description,
  cancelText = "취소",
  confirmText = "확인",
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onCancel}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-[320px] bg-white rounded-[24px] overflow-hidden shadow-2xl animate-fadeIn">
        <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <h3 className="text-[18px] font-bold text-[#111111] tracking-[-0.5px] mb-2">
            {title}
          </h3>
          <p className="text-[14px] text-[#6e6e6e] font-medium leading-relaxed tracking-[-0.3px] whitespace-pre-line">
            {description}
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="flex border-t border-[#f2f4f6]">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-[15px] font-semibold text-[#8e8e93] hover:bg-gray-50 active:bg-gray-100 transition-colors border-r border-[#f2f4f6]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 text-[15px] font-bold text-[#7a28fa] hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
