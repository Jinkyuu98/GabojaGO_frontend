"use client";

import React from "react";
import { clsx } from "clsx";

export const DayTabs = ({ days = [], selectedDay, onSelect }) => {
  return (
    <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide pt-1">
      {days.map((day) => (
        <button
          key={day.day}
          className={clsx(
            "shrink-0 px-5 py-2.5 rounded-full text-[14px] font-bold border-none cursor-pointer transition-all duration-200",
            {
              "bg-[#7a28fa] text-white shadow-lg shadow-[#7a28fa]/20 scale-105":
                selectedDay === day.day,
              "bg-[#f5f5f7] text-[#8e8e93] hover:bg-[#efeff4]":
                selectedDay !== day.day,
            },
          )}
          onClick={() => onSelect(day.day)}
        >
          {day.day}일차
        </button>
      ))}
    </div>
  );
};
