"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileContainer } from "../../components/layout/MobileContainer";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { TextInput } from "../../components/common/TextInput";
import Image from "next/image";
import { signup } from "../../services/auth"; // ⭐ 경로 수정

export default function SignupPage() {
  const router = useRouter();
  const setUser = useOnboardingStore((state) => state.setUser);

  const [name, setName] = useState("");
  const [id, setID] = useState(""); // userId → email로 통일 (백엔드와 맞춤)
  const [email, setEmail] = useState(""); // [ADD] 이메일 상태 추가
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ⭐⭐⭐ 여기만 핵심
  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      // [MOD] FastAPI 호출 파라미터 변동에 따른 수정 (strUserID, strUserPW, strName, strEmail)
      await signup({
        strUserID: id,
        strUserPW: password,
        strName: name,
        strEmail: email, // [ADD] 이메일 필드 추가
      });

      // ✅ 전역 상태 저장 (선택)
      setUser({
        id,
        name,
        email, // [ADD] 이메일 필드 추가
      });

      alert("회원가입 완료!");
      router.push("/"); // 홈 이동
    } catch (err) {
      alert("회원가입 실패");
      console.error(err);
    }
  };

  return (
    <MobileContainer className="mx-auto">
      <div className="p-6 flex flex-col h-full w-full bg-[#ffffff] text-[#111111]">
        <div className="flex items-center gap-6 pt-0 pb-6 lg:max-w-[400px] lg:mx-auto w-full mb-10 lg:mb-16">
          <button onClick={() => router.back()}>
            <Image
              src="/icons/close-icon.svg"
              alt="Close"
              width={16}
              height={16}
            />
          </button>
          <h1 className="text-[18px] font-semibold">회원가입</h1>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-6 w-full lg:max-w-[400px] lg:mx-auto">
          <TextInput
            label={name ? "이름" : ""}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 입력"
          />

          <TextInput
            label={id ? "아이디" : ""}
            value={id}
            onChange={(e) => setID(e.target.value)}
            placeholder="아이디 입력"
          />

          {/* [ADD] 이메일 입력 필드 추가 */}
          <TextInput
            label={email ? "이메일" : ""}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 입력"
            type="email"
          />

          <TextInput
            label={password ? "비밀번호" : ""}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            type="password"
          />

          <TextInput
            label={confirmPassword ? "비밀번호 확인" : ""}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 확인"
            type="password"
          />

          {/* [MOD] 1개라도 미입력 시 비활성화 상태에 따른 스타일 적용 */}
          <button
            type="submit"
            disabled={!name || !id || !email || !password || !confirmPassword}
            className="w-full py-4 bg-[#111111] text-white rounded-xl font-bold transition-all disabled:bg-[#ebebeb] disabled:text-[#a0a0a0] disabled:cursor-not-allowed"
          >
            회원가입
          </button>
        </form>
      </div>
    </MobileContainer>
  );
}
