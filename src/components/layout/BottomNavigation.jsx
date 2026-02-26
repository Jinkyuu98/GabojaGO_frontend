"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Home, Calendar, MapPin, User } from "lucide-react";

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
              onClick={() => router.push(item.path)}
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
    </div>
  );
};
