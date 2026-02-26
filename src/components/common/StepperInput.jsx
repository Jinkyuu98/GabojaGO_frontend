import React from "react";
import { Minus, Plus } from "lucide-react";

export const StepperInput = ({ value, onChange, min = 1, max = 100 }) => {
  const handleDecrease = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrease = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex items-center justify-between bg-surface rounded-2xl p-2 w-full">
      <button
        className="w-12 h-12 flex items-center justify-center bg-[#333] rounded-xl text-text transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={handleDecrease}
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus size={24} />
      </button>
      <div className="text-xl font-bold text-text w-[60px] text-center">
        {value}
      </div>
      <button
        className="w-12 h-12 flex items-center justify-center bg-[#333] rounded-xl text-text transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={handleIncrease}
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};
