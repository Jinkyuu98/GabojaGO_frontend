import React, { useState } from "react";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export const CalendarRangePicker = ({ startDate, endDate, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const onDateClick = (day) => {
    if (!startDate || (startDate && endDate)) {
      onChange(day, null);
    } else if (day < startDate) {
      onChange(day, null);
    } else {
      onChange(startDate, day);
    }
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button
          className="p-2 flex items-center justify-center text-text hover:bg-white/10 rounded-full transition-colors"
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-xl font-bold text-text">
          {format(currentMonth, "yyyy.MM")}
        </span>
        <button
          className="p-2 flex items-center justify-center text-text hover:bg-white/10 rounded-full transition-colors"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return (
      <div className="flex mb-2">
        {days.map((day) => (
          <div className="flex-1 text-center text-xs text-text-dim" key={day}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart);
    const endDateGrid = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDateGrid;
    let formattedDate = "";

    while (day <= endDateGrid) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;

        let isSelected = false;
        let isRange = false;

        if (startDate && isSameDay(day, startDate)) isSelected = true;
        if (endDate && isSameDay(day, endDate)) isSelected = true;
        if (
          startDate &&
          endDate &&
          isWithinInterval(day, { start: startDate, end: endDate })
        )
          isRange = true;

        days.push(
          <div
            className={clsx(
              "flex-1 h-10 flex items-center justify-center cursor-pointer relative text-sm",
              {
                "text-[#444] pointer-events-none": !isSameMonth(
                  day,
                  monthStart,
                ),
                "bg-primary text-bg font-bold rounded-full z-10": isSelected, // Selected (Start/End)
                "bg-[#333] text-text rounded-none first:rounded-l-full last:rounded-r-full":
                  isRange && !isSelected, // Middle Range
              },
            )}
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
          >
            <span className="relative z-10">{formattedDate}</span>
          </div>,
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="flex gap-0" key={day.toString()}>
          {days}
        </div>,
      );
      days = [];
    }
    return <div className="flex flex-col gap-0.5">{rows}</div>;
  };

  return (
    <div className="w-full bg-surface rounded-2xl p-4 select-none">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};
