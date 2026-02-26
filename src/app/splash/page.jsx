"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SparklesText } from "../../components/ui/sparkles-text";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // [ADD] PC 화면(width >= 768px)일 경우 2초 대기 없이 바로 로그인 페이지로 이동
    if (window.innerWidth >= 768) {
      router.replace("/login");
      return;
    }

    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    // [MOD] PC 화면(md 이상)에서는 전체 화면을 숨기기 위해 md:hidden 클래스 추가
    <div
      className="flex min-h-screen w-full items-center justify-center md:hidden"
      style={{ backgroundColor: "#000000" }}
    >
      <div
        className="relative h-[812px] w-full max-w-[375px]"
        style={{ backgroundColor: "#111111" }}
      >
        {/* Logo Text - positioned at y: 491px from container top */}
        <div
          style={{
            position: "absolute",
            left: "0",
            right: "0",
            top: "360px",
            textAlign: "center",
          }}
        >
          <SparklesText className="text-[36px] font-extrabold text-white tracking-[-0.8px]">
            가보자GO
          </SparklesText>
        </div>
      </div>
    </div>
  );
}
