import React from "react";
import { Plane } from "lucide-react";

export const LoadingIndicator = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-20 h-20 flex items-center justify-center mb-6">
        <Plane size={48} className="text-[#7a28fa] z-10 animate-fly" />
        <div className="absolute inset-0 rounded-full border-2 border-[#7a28fa] opacity-0 animate-ripple"></div>
      </div>
      <p className="text-lg text-text text-center leading-relaxed animate-pulse whitespace-pre-wrap">
        {message}
      </p>
    </div>
  );
};
