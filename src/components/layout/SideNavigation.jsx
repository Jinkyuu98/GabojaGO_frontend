"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Home, Calendar, MapPin, User } from "lucide-react";

export const SideNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();

  const NAV_ITEMS = [
    {
      label: "홈",
      path: "/home",
      icon: Home,
      width: 24,
    },
    {
      label: "일정",
      path: "/trips",
      icon: Calendar,
      width: 24,
    },
    {
      label: "장소 검색",
      path: "/search",
      icon: MapPin,
      width: 24,
    },
    {
      label: "마이페이지",
      path: "/profile",
      icon: User,
      width: 24,
    },
  ];

  return (
    <div className="hidden lg:flex flex-col w-[100px] h-screen bg-white border-r border-[#f2f4f6] sticky top-0 left-0 py-8 px-2 z-50">
      <nav className="flex flex-col gap-6">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/home"
              ? pathname === "/home"
              : pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              className={clsx(
                "flex flex-col items-center justify-center gap-2 px-1 py-4 rounded-2xl transition-all w-full",
                isActive
                  ? "bg-[#f8f6ff] text-[#7a28fa]"
                  : "bg-transparent text-[#abb1b9] hover:bg-[#f5f7f9] hover:text-[#556574]",
              )}
              onClick={() => router.push(item.path)}
            >
              <Icon
                size={item.width}
                fill={isActive ? "currentColor" : "#abb1b9"}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-colors"
              />
              <span className="text-[12px] font-bold tracking-[-0.4px] text-center whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
