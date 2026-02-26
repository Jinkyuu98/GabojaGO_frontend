"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { MobileContainer } from "../../../components/layout/MobileContainer";
import { searchPlaces } from "../../../services/place";

const HighlightText = ({ text, keyword }) => {
  if (!keyword.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${keyword})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <span key={i} className="text-[#7a28fa]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
};

export default function SearchInputPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId");
  const day = searchParams.get("day");
  const dateParam = searchParams.get("date");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("전체"); // [ADD] 드롭다운 카테고리 상태
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  // [ADD] 카테고리 목록 정의
  const categories = [
    "전체",
    "음식점",
    "카페",
    "편의점",
    "대형마트",
    "관광명소",
    "숙박",
    "문화시설",
    "지하철역",
    "주차장",
    "주유소",
    "기타",
  ];

  const CATEGORY_MAP = {
    음식점: "FD6",
    카페: "CE7",
    편의점: "CS2",
    대형마트: "MT1",
    관광명소: "AT4",
    숙박: "AD5",
    문화시설: "CT1",
    지하철역: "SW8",
    주차장: "PK6",
    주유소: "OL7",
  };

  // [ADD] 서버 데이터(LocationModel Map)를 프론트엔드용 배열로 변환
  const transformServerData = (data, keyword) => {
    if (!data) return [];
    // FastAPI 응답은 키가 인덱스인 객체 맵 형식일 수 있으므로 배열로 변환
    const items =
      typeof data === "object" && !Array.isArray(data)
        ? Object.values(data)
        : data;

    // [MOD] 실제 백엔드 API 응답 필드명(strName, strAddress 등)에 맞게 변환 및 카테고리 필터 적용
    return items
      .filter((item) => {
        // 카테고리 필터 적용 (strGroupCode 기반)
        if (selectedCategory === "전체") return true;

        const code = item.strGroupCode;
        if (selectedCategory === "기타") {
          return !Object.values(CATEGORY_MAP).includes(code);
        }
        return code === CATEGORY_MAP[selectedCategory];
      })
      .slice(0, 15) // [MOD] 결과 항목을 15개로 제한
      .map((item) => ({
        id: item.iPK, // Kakao Place ID
        name: item.strName,
        address: item.strAddress,
        category: item.strGroupName || "기타",
        groupCode: item.strGroupCode || "기타",
        rating: 0,
        reviewCount: 0,
        longitude: parseFloat(item.ptLongitude),
        latitude: parseFloat(item.ptLatitude),
        link: item.strLink,
        phone: item.strPhone,
      }));
  };

  // [ADD] 검색 API 호출 로직 (디바운스 적용)
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchPlaces(searchQuery);
        const transformedData = transformServerData(response.data, searchQuery);
        setSearchResults(transformedData);
      } catch (error) {
        console.error("Place search failed:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]); // [MOD] 카테고리 변경 시에도 검색 재실행

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <MobileContainer>
      <div className="w-full h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 px-6 pt-4 pb-4 flex items-center justify-between bg-white z-10 max-w-[430px] mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()}>
              <Image
                src="/icons/arrow-left.svg"
                alt="back"
                width={20}
                height={16}
                className="w-5 h-4"
              />
            </button>
            <h1 className="text-[18px] font-semibold text-[#111111] tracking-[-0.5px]">
              장소 검색
            </h1>
          </div>
        </div>

        {/* Search Input Section */}
        <div className="px-5 py-4 mt-[60px] flex flex-col gap-3">
          {/* [ADD] Category Dropdown Filter */}
          <div className="relative w-full">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-12 bg-white border border-[#f2f4f6] text-[#111111] text-[15px] font-medium rounded-xl px-4 appearance-none outline-none focus:border-[#7a28fa] focus:ring-1 focus:ring-[#7a28fa]/20 transition-all cursor-pointer shadow-sm"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke="#7e7e7e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-3 bg-[#f5f7f9] h-14 px-4 rounded-xl border border-[#f2f4f6] transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7a28fa]/20 focus-within:border-[#7a28fa]">
            <Image
              src="/icons/search.svg"
              alt="search"
              width={20}
              height={20}
              className="opacity-50"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="어디로 가고 싶으신가요?"
              className="flex-1 bg-transparent text-[16px] font-medium text-[#111111] placeholder:text-[#abb1b9] outline-none"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center pt-20 text-[#abb1b9]">
              <p className="text-[15px] font-medium animate-pulse">
                검색 중...
              </p>
            </div>
          ) : searchQuery.trim() && searchResults.length > 0 ? (
            <div className="flex flex-col gap-5 pt-2">
              {searchResults.map((place) => (
                <div
                  key={place.id}
                  onClick={() => {
                    localStorage.setItem(
                      `place_${place.id}`,
                      JSON.stringify(place),
                    );
                    const destUrl = tripId
                      ? `/search/place/${place.id}?tripId=${tripId}&day=${day}&date=${encodeURIComponent(dateParam || "")}`
                      : `/search/place/${place.id}`;
                    router.push(destUrl);
                  }}
                  className="flex flex-col gap-1 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold text-[#111111]">
                      <HighlightText text={place.name} keyword={searchQuery} />
                    </h3>
                    <span className="text-[12px] font-medium text-[#7a28fa] bg-[#f9f5ff] px-2 py-0.5 rounded">
                      {place.category}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <p className="text-[13px] text-[#898989] line-clamp-1">
                      {place.address}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-[#7a28fa]">
                        ★ {place.rating}
                      </span>
                      <span className="text-[11px] text-[#abb1b9]">
                        ({place.reviewCount})
                      </span>
                    </div>
                  </div>
                  <div className="h-[1px] bg-[#f2f4f6] mt-4" />
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="flex flex-col items-center justify-center pt-20 text-[#abb1b9]">
              <p className="text-[15px] font-medium">검색 결과가 없습니다.</p>
            </div>
          ) : null}
        </div>
      </div>
    </MobileContainer>
  );
}
