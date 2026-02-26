"use client";

import React from "react";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  addDays,
  getDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import Image from "next/image";
import { clsx } from "clsx";
import { useRef, useEffect } from "react";

// Mock weather data - in real app this would come from an API
const getWeatherIcon = (date) => {
  const day = date.getDate();
  const weatherPatterns = [
    "/icons/weather-sunny.svg",
    "/icons/weather-cloudy.svg",
    "/icons/weather-partly-cloudy.svg",
    "/icons/weather-clear.svg",
    "/icons/weather-rainy.svg",
  ];

  // Pattern based on date for demo
  if (day % 7 === 1 || day % 7 === 0) return weatherPatterns[0]; // sunny
  if (day % 7 === 5 || day % 7 === 6) return weatherPatterns[3]; // clear
  if (day % 7 === 3) return weatherPatterns[2]; // partly cloudy
  if (day % 7 === 2 || day % 7 === 4) return weatherPatterns[1]; // cloudy
  return weatherPatterns[4]; // rainy
};

export const TravelCalendarPicker = ({ startDate, endDate, onChange }) => {
  const today = new Date();
  const months = Array.from({ length: 25 }, (_, i) =>
    addMonths(startOfMonth(today), i - 12),
  );
  const currentMonthRef = useRef(null);

  useEffect(() => {
    if (currentMonthRef.current) {
      // Small timeout to ensure layout is complete before scrolling
      setTimeout(() => {
        currentMonthRef.current.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }, 100);
    }
  }, []);

  const onDateClick = (day) => {
    if (!startDate || (startDate && endDate)) {
      onChange(day, null);
    } else if (day < startDate) {
      onChange(day, null);
    } else {
      onChange(startDate, day);
    }
  };

  const renderMonth = (month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDateGrid;

    while (day <= endDateGrid) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayOfWeek = getDay(day);
        const isCurrentMonth = day >= monthStart && day <= monthEnd;

        let isSelected = false;
        let isInRange = false;
        let isStart = false;
        let isEnd = false;

        if (startDate && isSameDay(day, startDate)) {
          isSelected = true;
          isStart = true;
        }
        if (endDate && isSameDay(day, endDate)) {
          isSelected = true;
          isEnd = true;
        }
        if (
          startDate &&
          endDate &&
          isWithinInterval(day, { start: startDate, end: endDate }) &&
          !isStart &&
          !isEnd
        ) {
          isInRange = true;
        }

        const textColor =
          isSelected || isInRange
            ? "text-white"
            : dayOfWeek === 0
              ? "text-[#ff3344]"
              : dayOfWeek === 6
                ? "text-[#0091ff]"
                : "text-[#111111]";

        days.push(
          <div
            key={day.toString()}
            className={clsx("flex flex-col items-center gap-2", {
              "opacity-0 pointer-events-none": !isCurrentMonth,
              "cursor-pointer": isCurrentMonth,
            })}
            onClick={() => isCurrentMonth && onDateClick(cloneDay)}
          >
            <div
              className={clsx(
                "w-6 h-[23px] flex items-center justify-center text-[15px] font-semibold tracking-[-0.5px]",
                textColor,
                {
                  "bg-[#111111] rounded": isSelected || isInRange,
                },
              )}
            >
              {format(day, "d")}
            </div>
            {isCurrentMonth && (
              <Image
                src={getWeatherIcon(day)}
                alt="weather"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            )}
          </div>,
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="flex justify-between gap-[3px]" key={day.toString()}>
          {days}
        </div>,
      );
      days = [];
    }
    return rows;
  };

  return (
    <div className="flex flex-col gap-10 pb-10">
      {months.map((month, idx) => {
        const isTodayMonth = isSameMonth(month, today);
        return (
          <div
            key={idx}
            ref={isTodayMonth ? currentMonthRef : null}
            className="flex flex-col gap-5"
          >
            <h3 className="text-base font-semibold text-[#111111] tracking-[-0.5px]">
              {format(month, "yyyy년 M월", { locale: ko })}
            </h3>
            <div className="flex flex-col gap-7">{renderMonth(month)}</div>
          </div>
        );
      })}
    </div>
  );
};
