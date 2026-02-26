"use client";

import React, { useEffect, useState } from "react";

export function ActionSheet({ isOpen, onClose, title, options }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      setTimeout(() => setShow(false), 300); // animation duration
    }
  }, [isOpen]);

  if (!isOpen && !show) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 lg:bottom-auto lg:top-1/2 lg:left-1/2 w-full lg:w-[400px] max-w-[1280px] lg:max-w-none mx-auto lg:mx-0 bg-white rounded-t-3xl lg:rounded-3xl z-[100] p-6 lg:p-8 transition-all duration-300 transform ${isOpen
          ? "translate-y-0 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:opacity-100 lg:scale-100"
          : "translate-y-full lg:-translate-x-1/2 lg:-translate-y-1/2 lg:opacity-0 lg:scale-95"
          }`}
      >
        {title && <h3 className="text-[18px] lg:text-[20px] font-bold text-[#111] mb-4 lg:mb-6">{title}</h3>}
        <div className="flex flex-col gap-2">
          {options.map((opt, idx) => (
            <button
              key={idx}
              className="w-full text-left py-4 px-4 lg:px-5 text-[16px] lg:text-[17px] font-semibold text-[#111] hover:bg-[#f5f5f5] active:bg-[#ececec] rounded-xl transition-colors"
              onClick={() => {
                opt.onClick();
                onClose();
              }}
            >
              {opt.label}
            </button>
          ))}

          {/* [ADD] 취소 버튼 */}
          <button
            className="w-full text-center py-4 px-4 lg:px-5 text-[16px] lg:text-[17px] font-bold text-[#556574] bg-[#f5f7f9] hover:bg-[#eceff4] active:bg-[#e2e6eb] rounded-xl transition-colors mt-2"
            onClick={onClose}
          >
            취소
          </button>
        </div>
      </div>
    </>
  );
}
