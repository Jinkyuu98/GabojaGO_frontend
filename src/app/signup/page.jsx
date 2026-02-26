// "use client";

// import React, { useState } from "react";
// import { useRouter } from "next/navigation";
// import { MobileContainer } from "../../components/layout/MobileContainer";
// import { useOnboardingStore } from "../../store/useOnboardingStore";
// import { TextInput } from "../../components/common/TextInput"; // Added import
// import Image from "next/image";
// import { signup } from "../services/auth"

// export default function SignupPage() {
// const [form, setForm] = useState({
//     email: "",
//     password: "",
//     name: "",
//   })

//   const handleSubmit = async () => {
//     await signup(form)
//     alert("회원가입 완료!")
//     window.location.href = "/"
//   }

//   const router = useRouter();
//   const setUser = useOnboardingStore((state) => state.setUser);

//   const [name, setName] = useState("");
//   const [userId, setUserId] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");

//   const handleSignup = (e) => {
//     e.preventDefault();
//     if (password !== confirmPassword) {
//       alert("비밀번호가 일치하지 않습니다.");
//       return;
//     }

//     setTimeout(() => {
//       const user = {
//         id: userId,
//         name: name,
//         email: userId,
//       };
//       setUser(user);
//       router.back();
//     }, 1000);
//   };

//   return (
//     <MobileContainer className="mx-auto">
//       <div className="p-6 flex flex-col h-full w-full bg-[#ffffff] text-[#111111]">
//         {/* Header - Keeping existing Image button logic but adapting wrapper */}
//         <div className="flex items-center gap-4 pt-0 pb-6">
//           <button onClick={() => router.back()} className="flex-shrink-0">
//             <Image
//               src="/icons/close-icon.svg"
//               alt="Close"
//               width={16}
//               height={16}
//               className="w-4 h-4"
//             />
//           </button>
//           <h1 className="text-[18px] font-semibold tracking-[-0.5px] text-[#111111]">
//             회원가입
//           </h1>
//         </div>

//         <div className="flex-1 flex flex-col pt-0">
//           {/* Form - Layout adapted from Login page */}
//           <form onSubmit={handleSignup} className="flex flex-col gap-6 w-full">
//             <TextInput
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="이름 입력"
//               type="text"
//             />
//             <TextInput
//               value={userId}
//               onChange={(e) => setUserId(e.target.value)}
//               placeholder="아이디 입력"
//               type="text"
//             />
//             <TextInput
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="비밀번호 입력"
//               type="password"
//             />
//             <TextInput
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               placeholder="비밀번호 입력 확인"
//               type="password"
//             />

//             {/* Submit Button - Keeping original button style but inside the form flow */}
//             <div className="mt-8">
//               <button
//                 type="submit"
//                 disabled={!name || !userId || !password || !confirmPassword}
//                 className="w-full py-[18px] bg-[#111111] text-white text-[16px] font-semibold tracking-[-0.06px] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 회원가입
//               </button>
//             </div>
//           </form>

//           {/* Bottom Text - Keeping original */}
//           <div className="flex justify-center items-center mt-auto pb-8 pt-12">
//             <span className="text-[14px] font-medium tracking-[-0.35px] text-[#c7c8d8]">
//               계정이 이미 있나요?{" "}
//               <button
//                 type="button"
//                 onClick={() => router.push("/login")}
//                 className="underline"
//               >
//                 로그인
//               </button>
//             </span>
//           </div>
//         </div>
//       </div>
//     </MobileContainer>
//   );
// }

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
        <div className="flex items-center gap-4 pt-0 pb-6">
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

        <form onSubmit={handleSignup} className="flex flex-col gap-6">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 입력"
          />

          <TextInput
            value={id}
            onChange={(e) => setID(e.target.value)}
            placeholder="아이디 입력"
          />

          {/* [ADD] 이메일 입력 필드 추가 */}
          <TextInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 입력"
            type="email"
          />

          <TextInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            type="password"
          />

          <TextInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호 확인"
            type="password"
          />

          {/* [MOD] id 관련 변수 참조 오류 수정 */}
          <button
            type="submit"
            disabled={!name || !id || !email || !password || !confirmPassword} // [MOD] email 조건 추가
            className="w-full py-4 bg-black text-white rounded-xl"
          >
            회원가입
          </button>
        </form>
      </div>
    </MobileContainer>
  );
}
