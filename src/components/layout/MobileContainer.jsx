import React from "react";
import { SideNavigation } from "./SideNavigation";

export const MobileContainer = ({ children, className, showNav = false }) => {
  return (
    <div
      className={`w-full min-h-screen flex justify-center bg-[#f8f9fa] lg:bg-white ${showNav ? "lg:flex-row" : ""}`}
    >
      {showNav && <SideNavigation />}
      <div
        className={`w-full max-w-[480px] lg:max-w-none min-h-screen bg-[#ffffff] text-[#111111] lg:shadow-none relative flex flex-col overflow-x-hidden ${className || ""}`}
      >
        {children}
      </div>
    </div>
  );
};
