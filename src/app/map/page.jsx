"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { HeaderBackButton } from "../../components/common/HeaderBackButton";

export default function MapViewPage() {
  const router = useRouter();

  return (
    <MobileContainer>
      <div className="absolute top-4 left-4 z-50">
        <HeaderBackButton onBack={() => router.back()} />
      </div>
      <div className="w-full h-full bg-[#e5e5e5] relative flex items-center justify-center">
        {/* Placeholder for actual map */}
        <div className="flex flex-col items-center p-8 text-center opacity-60">
          <span style={{ fontSize: "48px", marginBottom: "16px" }}>🗺️</span>
          <p className="text-lg font-bold text-[#333]">
            지도 뷰는 준비 중입니다.
          </p>
        </div>
      </div>

      {/* Bottom Sheet Mockup */}
      <div className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl p-6 shadow-lg z-50 pb-10">
        <div className="w-10 h-1 bg-[#e5e5ea] rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-bold mb-2">여행 경로</h3>
        <p className="text-sm text-[#636366]">
          Day 1: 공항 → 자매국수 → 함덕 해수욕장 → 델문도
        </p>
      </div>
    </MobileContainer>
  );
}
