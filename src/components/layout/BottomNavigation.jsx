"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { Home, Calendar, MapPin, User } from "lucide-react";
import { AlertDialog } from "../common/AlertDialog";

export const BottomNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const NAV_ITEMS = [
    {
      label: "홈",
      path: "/home",
      icon: Home,
      width: 24,
      offset: "",
    },
    {
      label: "일정",
      path: "/trips",
      icon: Calendar,
      width: 24,
      offset: "",
    },
    {
      label: "장소 검색",
      path: "/search",
      icon: MapPin,
      width: 24,
      offset: "",
    },
    {
      label: "마이페이지",
      path: "/profile",
      icon: User,
      width: 24,
      offset: "",
    },
  ];

  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // URL 쿼리에 mode=browse가 있거나, localStorage 등에 상태가 유지되는 경우를 대비
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "browse") {
      setIsBrowseMode(true);
    }
  }, []);

  const handleNavClick = (path) => {
    if (isBrowseMode && path !== "/home") {
      setShowLoginModal(true);
    } else {
      router.push(path + (isBrowseMode && path === "/home" ? "?mode=browse" : ""));
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#f2f4f6] z-50 lg:hidden">
      <div className="flex items-start justify-around px-5 pt-2 pb-2 max-w-[480px] mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              className="flex flex-col items-center gap-0.5"
              onClick={() => handleNavClick(item.path)}
            >
              <div
                className={clsx(
                  "flex h-6 items-center justify-center",
                  item.offset,
                )}
              >
                <Icon
                  size={item.width}
                  fill={isActive ? "#111111" : "#abb1b9"}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={clsx("transition-all", {
                    "text-[#111111]": isActive,
                    "text-[#abb1b9]": !isActive,
                  })}
                />
              </div>
              <span
                className={clsx(
                  "text-[11px] font-medium tracking-[-0.28px] transition-colors",
                  {
                    "text-[#111111]": isActive,
                    "text-[#abb1b9]": !isActive,
                  },
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* [ADD] 둘러보기 모드 전용 로그인 모달 */}
      <AlertDialog
        isOpen={showLoginModal}
        title="로그인이 필요한 기능이예요!"
        description="로그인 하시면 많은 기능을 이용하실 수 있어요"
        cancelText="취소"
        confirmText="로그인"
        onCancel={() => setShowLoginModal(false)}
        onConfirm={() => router.push("/login")}
      />
    </div>
  );
};
