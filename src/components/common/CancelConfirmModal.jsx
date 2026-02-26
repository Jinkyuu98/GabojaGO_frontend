import React from "react";

export const CancelConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-5">
            <div className="w-full max-w-[320px] bg-white rounded-2xl p-6 flex flex-col items-left">
                <h3 className="text-[18px] font-bold text-[#111111] mb-2 text-left">
                    일정 생성을 취소하시겠어요?
                </h3>
                <p className="text-[14px] text-[#767676] mb-6 text-left whitespace-pre-wrap">
                    지금 취소하시면 입력된 정보는 삭제돼요
                </p>

                <div className="w-full flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-[14px] rounded-xl bg-[#f2f4f6] text-[#767676] text-[15px] font-semibold hover:bg-[#e5e8eb] transition-colors"
                    >
                        아니요
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-[14px] rounded-xl bg-[#111111] text-white text-[15px] font-semibold hover:bg-black transition-colors"
                    >
                        생성 취소
                    </button>
                </div>
            </div>
        </div>
    );
};
