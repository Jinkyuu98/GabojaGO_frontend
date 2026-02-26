"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { MobileContainer } from "../../../components/layout/MobileContainer";
import { HeaderBackButton } from "../../../components/common/HeaderBackButton";

export default function PlaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  // Mock Data Lookup
  const place = {
    id,
    name: "자매국수",
    type: "음식점",
    rating: 4.5,
    reviewCount: 1240,
    address: "제주특별자치도 제주시 탑동로 11길 6",
    phone: "064-727-1112",
    link: "https://www.instagram.com/jamae_guksu/",
    description: "진한 고기국수 육수가 일품인 제주 맛집",
    images: ["🍜", "🥩", "🍲"],
  };

  return (
    <MobileContainer>
      <div className="h-[250px] relative bg-gray-200">
        <div className="absolute top-4 left-4 z-10">
          <HeaderBackButton onBack={() => router.back()} />
        </div>
        <div className="w-full h-full flex items-center justify-center text-[80px]">
          {place.images[0]}
        </div>
      </div>

      <div className="p-6 -mt-6 bg-white rounded-t-3xl relative z-10 min-h-[500px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold text-[#111]">{place.name}</h1>
          <span className="text-xs text-[#8e8e93] bg-[#f2f2f7] px-2 py-1 rounded-md">
            {place.type}
          </span>
        </div>

        <div className="text-[#ff9500] font-semibold mb-4 text-sm flex items-center gap-1">
          <span>⭐</span> {place.rating}
          <span className="text-[#8e8e93] font-normal">
            ({place.reviewCount.toLocaleString()})
          </span>
        </div>

        <p className="text-sm text-[#636366] mb-2 flex items-start gap-1">
          📍 {place.address}
        </p>

        <p className="text-sm text-[#636366] mb-2 flex items-start gap-1">
          📞{" "}
          <a href={`tel:${place.phone}`} className="hover:underline">
            {place.phone}
          </a>
        </p>

        <p className="text-sm text-[#636366] mb-6 flex items-start gap-1 overflow-hidden">
          🔗{" "}
          <a
            href={place.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-[#7a28fa] truncate"
          >
            {place.link}
          </a>
        </p>

        <div className="h-[1px] bg-[#f2f2f7] w-full my-6" />

        <h3 className="text-base font-bold text-[#111] mb-2">소개</h3>
        <p className="text-[15px] text-[#3a3a3a] leading-relaxed">
          {place.description}
        </p>
      </div>
    </MobileContainer>
  );
}
