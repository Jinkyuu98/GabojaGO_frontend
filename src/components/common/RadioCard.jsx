import React from "react";
import { clsx } from "clsx";
import { Check } from "lucide-react";

export const RadioCard = ({ label, icon, value, selectedValue, onChange }) => {
  const selected = value === selectedValue;

  return (
    <div
      className={clsx(
        "flex items-center p-4 rounded-2xl cursor-pointer transition-all duration-200 relative active:scale-[0.98] h-[60px]",
        selected
          ? "bg-[#111111] text-white border-2 border-[#111111] font-semibold"
          : "bg-white border text-[#111111] border-[#e5e5e5] hover:border-[#111111] font-medium"
      )}
      onClick={() => onChange(value)}
    >
      <div className="mr-3 text-[20px]">{icon}</div>
      <div className="text-[16px] flex-1">{label}</div>
      {selected && (
        <div className="text-white rounded-full p-0.5 flex">
          <Check size={20} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};
