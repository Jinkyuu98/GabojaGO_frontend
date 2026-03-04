"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "../../hooks/useCurrentUser";

/**
 * [ADD] SessionGuard
 * 전역 세션 관리 컴포넌트.
 * 모든 페이지에서 렌더링되며 토큰 만료 여부를 실시간으로 체크합니다.
 * 만료 시 자동으로 로그아웃 처리를 하고 로그인 페이지로 리다이렉트합니다.
 */
export default function SessionGuard() {
    const router = useRouter();
    const pathname = usePathname();
    const { isExpired, userId } = useCurrentUser();

    // [ADD] 세션 만료 시간 설정 (기본 24시간)
    const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

    // 화이트리스트: 로그인이 필요 없는 페이지들
    const publicPaths = ["/login", "/signup", "/splash", "/"];

    useEffect(() => {
        if (typeof window === "undefined") return;

        // 1. 현재 경로가 공개 경로인지 확인
        const isPublicPath = publicPaths.includes(pathname);
        if (isPublicPath) return;

        // 2. 로그인된 상태에서 체크
        if (userId) {
            // (a) JWT 토큰 자체 만료 체크
            if (isExpired) {
                handleLogout("세션이 만료되었습니다. 다시 로그인해주세요.");
                return;
            }

            // (b) 접속한 지 24시간이 지났는지 체크 (loginTime 기반)
            const loginTime = localStorage.getItem("loginTime");
            if (loginTime) {
                const elapsed = Date.now() - parseInt(loginTime);
                if (elapsed > SESSION_DURATION_MS) {
                    handleLogout("보안을 위해 24시간마다 다시 로그인해야 합니다.");
                }
            }
        }
    }, [pathname, isExpired, userId]);

    const handleLogout = (message) => {
        alert(message);
        localStorage.removeItem("token");
        localStorage.removeItem("loginTime");
        localStorage.removeItem("saved_places");
        router.push("/login");
    };

    return null;
}
