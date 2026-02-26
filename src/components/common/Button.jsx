import React from "react";

export const Button = ({
  children,
  onClick,
  variant = "primary",
  fullWidth = false,
  disabled = false,
  type = "button",
}) => {
  const baseStyles =
    "px-6 py-4 rounded-lg text-base font-semibold transition-all duration-200 inline-flex items-center justify-center active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary: "bg-[#111111] text-white",
    secondary: "bg-gray-200 text-black",
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${fullWidth ? "w-full" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const BottomCTAButton = ({ children, onClick, disabled }) => {
  return (
    <div className="w-full lg:w-[180px] lg:mx-auto">
      <Button variant="primary" fullWidth onClick={onClick} disabled={disabled}>
        {children}
      </Button>
    </div>
  );
};
