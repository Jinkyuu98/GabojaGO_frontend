"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export const HeaderBackButton = ({ onBack }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className="bg-transparent border-none cursor-pointer p-1 hover:opacity-80 transition-opacity"
      aria-label="Go back"
    >
      <Image
        src="/icons/arrow-left.svg"
        alt="back"
        width={20}
        height={16}
        className="w-5 h-4"
      />
    </button>
  );
};
