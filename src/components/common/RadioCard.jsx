import React from "react";
import { clsx } from "clsx";
import { Check } from "lucide-react";

export const RadioCard = ({ label, icon, value, selectedValue, onChange }) => {
  const selected = value === selectedValue;

  return (
    <div
      className={clsx(
        "flex items-center p-4 bg-surface rounded-2xl border-2 border-transparent cursor-pointer transition-all duration-200 relative mb-3 active:scale-[0.98]",
        {
          "border-primary bg-[#252525]": selected,
        },
      )}
      onClick={() => onChange(value)}
    >
      <div className="mr-4 text-2xl">{icon}</div>
      <div className="text-base font-medium flex-1 text-text">{label}</div>
      {selected && (
        <div className="bg-primary text-bg rounded-full p-0.5 flex">
          <Check size={16} />
        </div>
      )}
    </div>
  );
};
