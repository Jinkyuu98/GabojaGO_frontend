"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { login } from "../../services/auth";

/**
 * [MOD] LoginContent 컴포넌트
 * 로그인 페이지의 실제 콘텐츠를 담당하는 컴포넌트입니다.
 * useSearchParams를 사용하기 때문에 Suspense로 감싸져야 합니다.
 */
function LoginContent() {
  const router = useRouter(); // [ADD] 페이지 이동을 위한 Next.js 라우터 훅
  const searchParams = useSearchParams(); // [ADD] URL 쿼리 파라미터를 읽기 위한 훅

  // [ADD] 전역 상태 관리를 위한 온보딩 스토어 관련 함수 추출
  const { setUser, saveTrip } = useOnboardingStore();

  // [ADD] 로그인 입력을 위한 로컬 상태 관리
  const [userId, setUserId] = useState(""); // 사용자 아이디
  const [password, setPassword] = useState(""); // 사용자 비밀번호

  // [ADD] 쿼리 파라미터에 따라 닫기 버튼 표시 여부 결정
  const showClose = searchParams.get("showClose") === "true";

  /**
   * [MOD] 로그인 처리 함수
   * 실제 FastAPI 백엔드와 연동하여 인증을 수행합니다.
   */
  const handleLogin = async (e) => {
    if (e) e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

    // [ADD] 필수 입력값 유효성 검사
    if (!userId || !password) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      // [MOD] auth 서비스의 login 함수를 호출하여 서버 인증 수행
      const data = await login(userId, password);

      // [MOD] 로그인 성공 시 전역 스토어에 사용자 정보 저장
      setUser({
        id: userId,
      });

      const from = searchParams.get("from");

      // [ADD] 특정 경로(일정 저장 시도 중 로그인)에서 온 경우 처리 로직
      if (from === "result_save") {
        try {
          const newTrip = await saveTrip(); // 저장되지 않았던 여행 일정 저장 (API 호출 포함)
          alert("로그인되었습니다. 여행 일정이 저장되었습니다.");
          if (newTrip && newTrip.id) {
            router.push(`/trips/${newTrip.id}`);
          } else {
            router.push("/home");
          }
          return; // [ADD] 불필요한 홈 이동 방지
        } catch (tripErr) {
          alert("로그인은 완료되었으나 일정 저장에 실패했습니다.");
        }
      }

      // [ADD] 일반 로그인이거나 저장 실패 후 메인 홈 화면으로 이동
      router.push("/home");
    } catch (err) {
      // [MOD] 서버 에러 메시지가 있으면 표시하고, 없으면 기본 메시지 표시
      const errorMessage =
        err.response?.data?.detail ||
        "아이디 또는 비밀번호가 올바르지 않습니다.";
      alert(errorMessage);
      console.error("[Login Error]", err);
    }
  };

  // [ADD] 엔터 키 입력 시 로그인 처리
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && userId && password) {
      handleLogin(e);
    }
  };

  // [ADD] 각 경로로의 이동을 처리하는 핸들러 함수들
  const handleSignup = () => router.push("/signup"); // 회원가입 페이지 이동
  const handleCreateItinerary = () => router.push("/onboarding/location"); // 일정 생성 시작
  const handleBrowse = () => router.push("/home"); // 비로그인 둘러보기

  return (
    // [ADD] 모바일 뷰포트 레이아웃을 위한 컨테이너
    <MobileContainer className="mx-auto">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
        {/* [ADD] 조건부 렌더링: 닫기 버튼 */}
        {showClose && (
          <button
            onClick={() => router.back()}
            className="absolute top-6 left-6 z-[60] p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Image
              src="/icons/close-icon.svg"
              alt="close"
              width={24}
              height={24}
            />
          </button>
        )}

        <div className="relative flex flex-1 flex-col z-10">
          {/* 상단 섹션: 로고 및 로고 설명 */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 pt-12 pb-8">
            {/* 로고 영역 */}
            <div className="flex flex-col items-center gap-2 mb-12">
              <h1 className="text-[40px] font-extrabold tracking-[-1.5px] leading-tight text-[#111111]">
                가보자<span className="text-[#7a28fa] font-black">GO</span>
              </h1>
              <p className="text-[15px] font-medium text-[#7e7e7e] tracking-[-0.3px]">
                일정 생성부터 준비물까지, 당신만의 AI 가이드
              </p>
            </div>

            {/* 입력 폼 및 로그인 영역 */}
            <div className="w-full lg:max-w-[400px] lg:mx-auto flex flex-col gap-6 mb-8">
              <div className="flex flex-col gap-3">
                {/* 아이디 입력 필드 */}
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="아이디"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-[60px] bg-[#f5f5f7] border-2 border-transparent focus:border-[#7a28fa]/20 focus:bg-white rounded-2xl px-5 text-[15px] font-medium transition-all outline-none"
                  />
                </div>
                {/* 비밀번호 입력 필드 */}
                <div className="relative group">
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-[60px] bg-[#f5f5f7] border-2 border-transparent focus:border-[#7a28fa]/20 focus:bg-white rounded-2xl px-5 text-[15px] font-medium transition-all outline-none"
                  />
                </div>
              </div>

              {/* 로그인 버튼: 입력값이 없으면 비활성화 */}
              <button
                onClick={handleLogin}
                disabled={!userId || !password}
                className="w-full h-[56px] bg-[#111111] text-white rounded-2xl text-[16px] font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-black/10"
              >
                로그인
              </button>

              {/* 회원가입 링크 */}
              <div className="flex justify-center">
                <button
                  onClick={handleSignup}
                  className="text-[14px] font-semibold text-[#c7c8d8] hover:text-[#7a28fa] transition-colors"
                >
                  아직 회원이 아니신가요?{" "}
                  <span className="underline decoration-[#c7c8d8] underline-offset-4">
                    회원가입
                  </span>
                </button>
              </div>

              {/* 하단 주요 액션 버튼 영역 */}
              <div className="pb-12 pt-6 bg-white shrink-0">
                <div className="flex flex-col gap-3">
                  {/* AI 일정 생성 버튼 */}
                  <button
                    onClick={handleCreateItinerary}
                    className="w-full h-[60px] bg-[#7a28fa] text-white rounded-2xl text-[16px] font-bold flex items-center justify-center shadow-xl shadow-[#7a28fa]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    AI 여행 일정 생성하기
                  </button>
                  {/* 둘러보기 버튼 */}
                  <button
                    onClick={handleBrowse}
                    className="w-full h-[60px] bg-white border-2 border-[#f2f4f6] text-[#111111] rounded-2xl text-[16px] font-bold flex items-center justify-center hover:bg-[#f2f4f6] transition-all"
                  >
                    둘러보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}

/**
 * [MOD] 로그인 페이지 엔트리 컴포넌트
 * Next.js 13+ App Router 구조에서 사용되는 페이지 컴포넌트입니다.
 * 클라이언트 사이드 훅(useSearchParams 등)을 사용하는 콘텐츠를 Suspense로 감싸 로딩 상태를 처리합니다.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        // [ADD] 데이터를 불러오거나 훅이 준비되는 동안 보여줄 로딩 UI
        <div className="flex items-center justify-center h-screen bg-white text-[#111111] font-semibold text-lg z-[9999]">
          잠시만 기다려 주세요...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
