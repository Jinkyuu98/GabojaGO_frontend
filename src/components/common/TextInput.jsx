import React from "react";

export const TextInput = ({
  label,
  value,
  onChange,
  onEnter,
  placeholder,
  type = "text",
  autoFocus = false,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault(); // 폼 제출 등 기본 동작 방지
      onEnter();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-sm text-text-dim ml-1">{label}</label>}
      <input
        type={type}
        className="w-full p-4 bg-[#f5f5f7] rounded-xl text-[#111111] text-base border border-transparent transition-all duration-200 focus:border-[#111111] focus:bg-white placeholder-[#999999] outline-none"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
};
