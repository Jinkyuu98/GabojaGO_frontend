"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MobileContainer } from "../../../../../components/layout/MobileContainer";
import { addScheduleExpense } from "../../../../../services/schedule";

// [ADD] 비용 직접입력 페이지 - 영수증 촬영 없이 수동으로 지출 내역을 등록하는 폼 페이지
export default function ManualExpensePage() {
    const params = useParams();
    const { tripId } = params;
    const router = useRouter();

    // [ADD] 카테고리 목록 정의 (OpenAPI 스펙의 chCategory 값에 맞춤)
    const categories = [
        { code: "F", label: "식비", emoji: "🍽️" },
        { code: "T", label: "교통비", emoji: "🚗" },
        { code: "L", label: "숙박비", emoji: "🏨" },
        { code: "E", label: "기타", emoji: "📦" },
    ];

    // [ADD] 폼 상태 관리
    const [selectedCategory, setSelectedCategory] = useState("F");
    const [money, setMoney] = useState("");
    const [memo, setMemo] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // [ADD] 현재 시간을 datetime-local input의 기본값 형식으로 변환
    const now = new Date();
    const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const [expenseDate, setExpenseDate] = useState(defaultDateTime);

    // [ADD] 지출 등록 제출 핸들러 - addScheduleExpense API를 호출하여 DB에 저장
    const handleSubmit = async () => {
        if (!money || parseInt(money, 10) <= 0) {
            alert("금액을 입력해주세요.");
            return;
        }

        setIsSubmitting(true);

        try {
            // [ADD] localStorage에서 userId를 가져오고 없으면 기본값 1 사용
            const parsedUserId = parseInt(localStorage.getItem("userId") || "1", 10);
            const safeUserId = isNaN(parsedUserId) ? 1 : parsedUserId;

            // [ADD] datetime-local 형식(YYYY-MM-DDTHH:MM)을 API 형식(YYYY-MM-DD HH:MM:SS)으로 변환
            const dtExpense = expenseDate.replace("T", " ") + ":00";

            await addScheduleExpense({
                iScheduleFK: parseInt(tripId, 10),
                iUserFK: safeUserId,
                nMoney: parseInt(money, 10),
                dtExpense,
                chCategory: selectedCategory,
                strMemo: memo || "직접 입력 지출",
            });

            alert("✅ 지출 내역이 등록되었습니다.");
            // [MOD] 비용 탭 상태를 유지하기 위해 ?tab=비용 쿼리 파라미터 전달
            router.push(`/trips/${tripId}?tab=비용`);
        } catch (error) {
            console.error("지출 등록 실패:", error);
            alert("지출 등록 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MobileContainer>
            <div className="h-full bg-white relative flex flex-col">
                {/* [ADD] 헤더 - 닫기 버튼과 페이지 타이틀 */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f2f4f6]">
                    <button
                        className="p-1 text-[#111]"
                        onClick={() => router.back()}
                    >
                        <X size={22} />
                    </button>
                    <h2 className="text-[17px] font-bold text-[#111]">지출 직접 입력</h2>
                    <div className="w-6" />
                </div>

                {/* [ADD] 입력 폼 영역 */}
                <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10 flex flex-col gap-7">

                    {/* [ADD] 카테고리 선택 */}
                    <div className="flex flex-col gap-3">
                        <label className="text-[14px] font-semibold text-[#111]">카테고리</label>
                        <div className="grid grid-cols-4 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.code}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.code)}
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${selectedCategory === cat.code
                                        ? "border-[#7a28fa] bg-[#f5eeff]"
                                        : "border-[#e5ebf1] bg-white"
                                        }`}
                                >
                                    <span className="text-[22px]">{cat.emoji}</span>
                                    <span
                                        className={`text-[13px] font-semibold ${selectedCategory === cat.code
                                            ? "text-[#7a28fa]"
                                            : "text-[#556574]"
                                            }`}
                                    >
                                        {cat.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* [ADD] 금액 입력 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold text-[#111]">금액</label>
                        <div className="relative">
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                value={money}
                                onChange={(e) => setMoney(e.target.value)}
                                className="w-full px-4 py-3.5 pr-10 border border-[#d1d5db] rounded-xl text-[16px] text-[#111] focus:outline-none focus:border-[#7a28fa] focus:ring-1 focus:ring-[#7a28fa] transition-colors"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-[#8e8e93]">
                                원
                            </span>
                        </div>
                    </div>

                    {/* [ADD] 지출 일시 입력 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold text-[#111]">지출 일시</label>
                        <input
                            type="datetime-local"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full px-4 py-3.5 border border-[#d1d5db] rounded-xl text-[16px] text-[#111] focus:outline-none focus:border-[#7a28fa] focus:ring-1 focus:ring-[#7a28fa] transition-colors"
                        />
                    </div>

                    {/* [ADD] 메모 입력 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[14px] font-semibold text-[#111]">메모</label>
                        <input
                            type="text"
                            placeholder="지출 내용을 입력해주세요"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            maxLength={100}
                            className="w-full px-4 py-3.5 border border-[#d1d5db] rounded-xl text-[16px] text-[#111] placeholder:text-[#c7c8d8] focus:outline-none focus:border-[#7a28fa] focus:ring-1 focus:ring-[#7a28fa] transition-colors"
                        />
                    </div>
                </div>

                {/* [ADD] 등록 버튼 - 하단 고정 */}
                <div className="px-5 pb-8 pt-3 border-t border-[#f2f4f6] bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !money}
                        className={`w-full py-4 rounded-xl text-[16px] font-bold transition-all ${isSubmitting || !money
                            ? "bg-[#e5ebf1] text-[#abb1b9] cursor-not-allowed"
                            : "bg-[#7a28fa] text-white hover:bg-[#6620d9] active:scale-[0.98]"
                            }`}
                    >
                        {isSubmitting ? "등록 중..." : "등록하기"}
                    </button>
                </div>
            </div>
        </MobileContainer>
    );
}
