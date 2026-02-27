import React from "react";
import { AlertDialog } from "./AlertDialog";

export const CancelConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    // [MOD] 기존 독자적인 형태 대신 공통 AlertDialog 컴포넌트 사용
    return (
        <AlertDialog
            isOpen={isOpen}
            title="일정 생성을 취소하시겠어요?"
            description="지금 취소하시면 입력된 정보는 삭제돼요"
            cancelText="아니요"
            confirmText="생성 취소"
            onCancel={onClose}
            onConfirm={onConfirm}
        />
    );
};
