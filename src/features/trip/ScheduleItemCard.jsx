"use client";

import React from "react";
import { Clock, Timer, MapPin, MoreVertical } from "lucide-react";
import { clsx } from "clsx";

export const ScheduleItemCard = ({ index, place, onClick }) => {
  return (
    <div
      className="flex gap-4 relative cursor-pointer group mb-6 last:mb-0"
      onClick={onClick}
    >
      {/* Index and Connector Line */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#7a28fa] text-white text-[14px] font-bold flex items-center justify-center z-10 shadow-md">
          {index + 1}
        </div>
        <div className="w-0.5 flex-1 bg-[#efeff4] my-1 group-last:hidden" />
      </div>

      {/* Card Content */}
      <div className="flex-1 pb-2">
        <div className="bg-white rounded-2xl p-4 border border-[#f2f4f6] flex justify-between items-start shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-bold text-[#111111] mb-2 truncate">
              {place.name}
            </h3>

            <div className="flex items-center gap-3 text-xs font-medium text-[#8e8e93]">
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-[#c7c7cc]" />
                <span>{place.time || "10:00"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Timer size={14} className="text-[#c7c7cc]" />
                <span>{place.duration || "1시간"}</span>
              </div>
              {place.category && (
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#c7c7cc]" />
                  <span>{place.category}</span>
                </div>
              )}
            </div>
          </div>
          <button className="p-1 hover:bg-[#f5f5f7] rounded-full transition-colors">
            <MoreVertical size={20} className="text-[#c7c7cc]" />
          </button>
        </div>
      </div>
    </div>
  );
};
