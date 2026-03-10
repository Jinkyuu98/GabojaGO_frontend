"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreVertical, ChevronDown, Heart, ChevronUp, Trash2, X } from "lucide-react"; // [MOD] Trash2, X 추가
import { MobileContainer } from "../../components/layout/MobileContainer";
import { BottomNavigation } from "../../components/layout/BottomNavigation";
import { Toast } from "../../components/common/Toast"; // [ADD] Toast 임포트
import { clsx } from "clsx";
import {
  getSavedPlaces,
  unregisterPlace,
  registerPlace,
  getLocation,
} from "../../services/place";
import {
  getFavoriteList,
  getFavoriteLocationList,
  appendFavoriteLocation,
  removeFavoriteLocation,
  appendFavoriteGroup,
  removeFavoriteGroup,
  getFavoriteImageList,       // [ADD] 찜한 사진 목록
  removeFavoriteImage         // [ADD] 찜한 사진 삭제
} from "../../services/favorite";
import { getPlaceReviews, modifyPlaceReview, removePlaceReview } from "../../services/review"; // [MOD] 수정/삭제 추가
import { useCurrentUser } from "../../hooks/useCurrentUser"; // [ADD] 유저 정보 훅
import { useEffect, useRef } from "react";
import Script from "next/script";

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

// [ADD] 사진 찜하기 스케 skeleton 컴포넌트
const PhotoSkeleton = () => (
  <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f2f4f6] animate-pulse">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
  </div>
);

export default function MyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("장소"); // "장소" 또는 "사진"
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // [ADD] 더보기 설정 팝업 상태
  const [savedPlaces, setSavedPlaces] = useState([]); // [ADD] 실제 등록된 장소 데이터를 위한 상태 추가
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState("latest"); // [ADD] 정렬 상태 (latest, reviews, oldest)
  const [selectedCategory, setSelectedCategory] = useState("전체"); // [ADD] 카테고리 필터 상태
  const [isSortOpen, setIsSortOpen] = useState(false); // [ADD] 정렬 옵션 드롭다운 상태
  const [selectedZoomImage, setSelectedZoomImage] = useState(null); // [ADD] 찜한 사진 확대 상태

  // [ADD] 즐겨찾기 그룹 관리를 위한 상태
  const [favoriteGroups, setFavoriteGroups] = useState([]);
  const [selectedGroupPK, setSelectedGroupPK] = useState(1);
  const [favoriteImages, setFavoriteImages] = useState([]); // [ADD] 찜한 사진 상태

  // [ADD] 실제 리뷰 개수 상태
  const [actualReviewCount, setActualReviewCount] = useState(0);
  const [myReviewsGrouped, setMyReviewsGrouped] = useState([]); // [ADD] 장소별 그룹핑된 리뷰
  const [openAccordions, setOpenAccordions] = useState([]); // [ADD] 아코디언 상태
  const [isReviewLoading, setIsReviewLoading] = useState(false); // [ADD] 리뷰 로딩 상태
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false); // [ADD] 리뷰 수정 모달 상태
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [isRevisit, setIsRevisit] = useState(true);
  const [currentReviewLocId, setCurrentReviewLocId] = useState(null);

  // [ADD] Toast 및 되돌리기 기능용 상태
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastPlace, setToastPlace] = useState(null);
  const [unSavedPlaceIds, setUnSavedPlaceIds] = useState([]); // [ADD] 페이지 이탈 전까지 요소 유지를 위한 해제된 장소 ID 배열

  // [ADD] PC 전용 모달 상태
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState(null);
  const modalMapRef = useRef(null);
  const modalMapInstance = useRef(null);

  const { userName, userId } = useCurrentUser(); // [ADD] 실제 로그인 유저 이름 및 ID 가져오기
  const [isMounted, setIsMounted] = useState(false); // [ADD] Hydration 에러 방지용

  // [ADD] 카테고리 스크롤 관련 Ref 및 상태
  const categoryScrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const checkScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - categoryScrollRef.current.offsetLeft);
    setScrollLeft(categoryScrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    categoryScrollRef.current.scrollLeft = scrollLeft - walk;
    checkScroll();
  };

  const scroll = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [activeTab, savedPlaces]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const user = {
    name: (isMounted && userName) ? `${userName}님` : "로그인 필요",
    reviewCount: actualReviewCount, // [MOD] 실제 리뷰 개수 반영
    profileImage: "/icons/profile.svg",
  };

  // [MOD] 유저 프로필 이미지가 백엔드 경로이면 접두사 추가
  if (user.profileImage && !user.profileImage.startsWith("http") && !user.profileImage.startsWith("/")) {
    user.profileImage = "/proxy/" + user.profileImage;
  }

  const tabs = [
    { id: "장소", label: "찜한 장소" },
    { id: "사진", label: "찜한 사진" },
    { id: "리뷰", label: "나의 리뷰" },
  ];

  // [ADD] 실제 작성한 리뷰 개수 가져오기
  useEffect(() => {
    if (isMounted && userId) {
      const fetchReviewCount = async () => {
        try {
          const res = await getPlaceReviews(0, userId);
          if (res?.review_list) {
            setActualReviewCount(res.review_list.length);
          }
        } catch (e) {
          console.error("Failed to fetch review count", e);
        }
      };
      fetchReviewCount();
    }
  }, [isMounted, userId]);

  // [ADD] 나의 리뷰 페칭 로직을 함수로 분리
  const fetchMyReviews = async () => {
    if (!userId) return;
    setIsReviewLoading(true);
    try {
      const res = await getPlaceReviews(0, userId);
      if (res?.review_list) {
        const list = typeof res.review_list === "string"
          ? JSON.parse(res.review_list.replace(/'/g, '"'))
          : res.review_list;

        const uniqueLocIds = [...new Set(list.map(r => r.iLocationFK))];
        const locResList = await Promise.allSettled(
          uniqueLocIds.map(id => getLocation(id))
        );

        const locMap = {};
        locResList.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value?.data) {
            locMap[uniqueLocIds[idx]] = result.value.data.strName || "알 수 없는 장소";
          } else {
            locMap[uniqueLocIds[idx]] = "정보 없음";
          }
        });

        const grouped = {};
        list.forEach(review => {
          const locId = review.iLocationFK;
          const locName = locMap[locId] || "정보 없음";
          if (!grouped[locId]) {
            grouped[locId] = { id: locId, name: locName, reviews: [] };
          }
          grouped[locId].reviews.push(review);
        });

        setMyReviewsGrouped(Object.values(grouped));
        // 리뷰 개수도 최신화
        setActualReviewCount(list.length);
      }
    } catch (e) {
      console.error("Failed to fetch my reviews", e);
    } finally {
      setIsReviewLoading(false);
    }
  };

  // [ADD] 나의 리뷰 탭 진입 시 데이터 페칭
  useEffect(() => {
    if (activeTab === "리뷰" && userId) {
      fetchMyReviews();
    }
  }, [activeTab, userId]);

  const openModifyReview = (review) => {
    setEditingReviewId(review.iPK);
    setReviewScore(review.nScore);
    setReviewContent(review.strReview);
    setIsRevisit(review.bRevisit);
    setCurrentReviewLocId(review.iLocationFK);
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!reviewContent.trim()) {
      alert("리뷰 내용을 입력해주세요.");
      return;
    }
    try {
      const payload = {
        iPK: editingReviewId,
        iLocationFK: Number(currentReviewLocId),
        iUserFK: userId,
        nScore: reviewScore,
        bRevisit: isRevisit,
        strReview: reviewContent,
        dtCreate: new Date().toISOString()
      };

      await modifyPlaceReview(payload);
      alert("리뷰가 수정되었습니다.");
      setIsReviewModalOpen(false);
      fetchMyReviews();
    } catch (err) {
      console.error("리뷰 수정 불가:", err);
      alert("리뷰 수정에 실패했습니다.");
    }
  };

  const handleDeleteReview = async (iPK) => {
    if (!window.confirm("정말 리뷰를 삭제하시겠습니까?")) return;
    try {
      await removePlaceReview(iPK);
      alert("리뷰가 삭제되었습니다.");
      fetchMyReviews();
    } catch (err) {
      console.error("리뷰 삭제 실패:", err);
      alert("리뷰 삭제에 실패했습니다.");
    }
  };

  // [ADD] 즐겨찾기 그룹 목록 통합 조회 및 초기화
  useEffect(() => {
    if (isMounted && userId) {
      const initGroups = async () => {
        try {
          const res = await getFavoriteList();
          if (res.data?.favorite_list?.length > 0) {
            setFavoriteGroups(res.data.favorite_list);
            // 만약 현재 선택된 PK가 유효하지 않다면 첫 번째 그룹으로 설정
            const currentValid = res.data.favorite_list.find(g => g.iPK === selectedGroupPK);
            if (!currentValid) {
              setSelectedGroupPK(res.data.favorite_list[0].iPK);
            }
          }
        } catch (e) {
          console.error("그룹 목록 초기화 실패:", e);
        }
      };
      initGroups();
    }
  }, [isMounted, userId, selectedGroupPK]);

  useEffect(() => {
    if (activeTab === "장소") {
      const fetchSavedPlaces = async () => {
        setIsLoading(true);
        try {
          // 1. 로컬 스토리지에서 먼저 가져오기
          const localData = JSON.parse(
            localStorage.getItem("saved_places") || "[]",
          );

          // 2. API에서도 가져오기
          let apiData = [];
          let fetchSuccess = false;
          try {
            const favoriteId = selectedGroupPK;

            const response = await getFavoriteLocationList(favoriteId);
            if (response.data && response.data.location_list) {
              const rawData = Array.isArray(response.data.location_list)
                ? response.data.location_list
                : [response.data.location_list];

              // [MOD] 기본 매핑 (rating/reviewCount는 아래에서 API로 덮어씀)
              apiData = rawData.map((item) => {
                const loc = item.location;
                return {
                  id: loc.iPK,
                  favoriteLocationPK: item.iPK,
                  name: loc.strName,
                  address: loc.strAddress,
                  category: loc.strGroupName || "기타",
                  groupCode: loc.strGroupCode || "기타",
                  latitude: parseFloat(loc.ptLatitude),
                  longitude: parseFloat(loc.ptLongitude),
                  rating: 0,
                  reviewCount: 0,
                  dtFavorite: item.dtFavorite, // [ADD] 정렬용 찜한 시간 추가
                };
              });

              // [ADD] 장소별 실제 리뷰 점수를 병렬로 조회하여 반영
              const reviewResults = await Promise.allSettled(
                apiData.map((place) => getPlaceReviews(Number(place.id), 0))
              );
              apiData = apiData.map((place, idx) => {
                const result = reviewResults[idx];
                if (result.status === "fulfilled" && result.value?.review_list) {
                  const list = typeof result.value.review_list === "string"
                    ? JSON.parse(result.value.review_list.replace(/'/g, '"'))
                    : result.value.review_list;
                  const count = list?.length || 0;
                  const avg = count > 0
                    ? parseFloat((list.reduce((s, r) => s + (r.nScore || 0), 0) / count).toFixed(1))
                    : 0;
                  return { ...place, reviewCount: count, rating: avg };
                }
                return place;
              });
            }
            fetchSuccess = true;
          } catch (e) {
            console.error("API fetch failed, using local data only:", e);
          }

          // 3. 중복 제거 후 합치기 (ID 기준)
          // [MOD] DB API 조회가 성공했다면 오직 선택된 해당 그룹의 DB 데이터만 보여준다.
          // (로컬 데이터 무단 병합 방지: 다른 그룹 조회 시 1번 그룹 데이터가 섞여 나오는 현상 완벽 해결)
          let merged = [];
          if (fetchSuccess) {
            merged = [...apiData];
          } else {
            merged = [...localData];
          }

          // [ADD] 정렬 로직 적용
          const sorted = [...merged].sort((a, b) => {
            if (sortBy === "reviews") {
              // 평균평점순
              return (b.rating || 0) - (a.rating || 0);
            } else if (sortBy === "oldest") {
              // 과거순 (dtFavorite 기준)
              return new Date(a.dtFavorite || 0) - new Date(b.dtFavorite || 0);
            } else {
              // 최신순 (dtFavorite 기준)
              return new Date(b.dtFavorite || 0) - new Date(a.dtFavorite || 0);
            }
          });

          setSavedPlaces(sorted);
        } catch (error) {
          console.error("Failed to fetch saved places:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSavedPlaces();
    }
  }, [activeTab, sortBy, selectedGroupPK]);

  // [ADD] "사진" 탭 활성화 시 즐겨찾기 사진 로드
  const fetchFavoriteImages = async () => {
    setIsLoading(true);
    try {
      const response = await getFavoriteImageList(selectedGroupPK); // 1번 그룹(혹은 현재 선택 그룹)
      if (response.data && response.data.image_list) {
        const rawData = Array.isArray(response.data.image_list)
          ? response.data.image_list
          : [response.data.image_list];

        const formattedImages = rawData.map(item => {
          let src = item.image?.strFile || item.image?.strImageFile || item.strFile || item.strImageFile || "";
          // src 정제 (Proxy 혹은 Base URL 적용 등)
          const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "/proxy/";
          if (src && !src.startsWith("http") && !src.startsWith("/")) {
            src = imageBase + (imageBase.endsWith("/") ? "" : "/") + src;
          } else if (src && src.startsWith("/proxy/")) {
            src = src.replace("/proxy/", imageBase + (imageBase.endsWith("/") ? "" : "/"));
          }

          return {
            id: item.iPK,                     // favorite_image_pk
            iImagePK: item.iImageFK,          // 원본 image pk
            src: src || "/icons/camera.svg",
            ...item,
            dtFavorite: item.dtFavorite
          }
        });

        // 최신순 (최근 찜한 순)
        formattedImages.sort((a, b) => new Date(b.dtFavorite || 0) - new Date(a.dtFavorite || 0));
        setFavoriteImages(formattedImages);
      } else {
        setFavoriteImages([]);
      }
    } catch (error) {
      console.error("Failed to fetch favorite images", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "사진") {
      fetchFavoriteImages();
    }
  }, [activeTab, selectedGroupPK]);

  // [ADD] 즐겨찾기 사진 해제 (하트 클릭)
  const handleRemoveFavoriteImage = async (e, iFavoriteImagePK, photoId) => {
    e.stopPropagation();
    if (!window.confirm("찜한 사진을 해제하시겠습니까?")) return;
    try {
      await removeFavoriteImage(iFavoriteImagePK);
      setFavoriteImages(prev => prev.filter(img => img.id !== photoId));
    } catch (e) {
      console.error("Failed to remove favorite image", e);
      alert("해제에 실패했습니다.");
    }
  };

  // [ADD] 즐겨찾기 그룹 관리 핸들러

  const handleCreateGroup = async () => {
    const groupName = window.prompt("새로 생성할 즐겨찾기 그룹 이름을 입력하세요.");
    if (!groupName || groupName.trim() === "") return;
    try {
      await appendFavoriteGroup({
        iPK: 0,
        iUserFK: 1, // 백엔드 로직에 맞춰 하드코딩된 유저 ID 사용
        strName: groupName
      });
      const favListRes = await getFavoriteList();
      if (favListRes.data && favListRes.data.favorite_list) {
        setFavoriteGroups(favListRes.data.favorite_list);
      }
    } catch (e) {
      console.error("그룹 생성 실패", e);
      alert("그룹 생성에 실패했습니다.");
    }
  };

  const handleDeleteGroup = async () => {
    if (favoriteGroups.length <= 1) {
      alert("기본 폴더는 삭제할 수 없습니다.");
      return;
    }
    const confirmDelete = window.confirm("현재 선택된 즐겨찾기 그룹을 삭제하시겠습니까?");
    if (!confirmDelete) return;

    try {
      await removeFavoriteGroup(selectedGroupPK);
      const favListRes = await getFavoriteList();
      if (favListRes.data && favListRes.data.favorite_list) {
        const newGroups = favListRes.data.favorite_list;
        setFavoriteGroups(newGroups);
        if (newGroups.length > 0) {
          setSelectedGroupPK(newGroups[0].iPK); // 삭제 후 첫번째 그룹으로 초기화
        }
      }
    } catch (e) {
      console.error("그룹 삭제 실패", e);
      alert("그룹 삭제에 실패했습니다.");
    }
  };

  // [MOD] 카테고리 필터링 적용 (strGroupCode 기준)
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === "전체") return savedPlaces;

    return savedPlaces.filter((place) => {
      const code = place.groupCode;
      if (selectedCategory === "기타") {
        return !Object.values(CATEGORY_MAP).includes(code);
      }
      return code === CATEGORY_MAP[selectedCategory];
    });
  }, [savedPlaces, selectedCategory]);

  useEffect(() => {
    if (selectedPlaceForModal && window.kakao) {
      window.kakao.maps.load(() => {
        const position = new window.kakao.maps.LatLng(
          selectedPlaceForModal.latitude,
          selectedPlaceForModal.longitude,
        );

        if (!modalMapInstance.current) {
          modalMapInstance.current = new window.kakao.maps.Map(
            modalMapRef.current,
            {
              center: position,
              level: 3,
            },
          );

          // 마커 추가
          const marker = new window.kakao.maps.Marker({ position });
          marker.setMap(modalMapInstance.current);
        } else {
          modalMapInstance.current.setCenter(position);
          modalMapInstance.current.relayout();
        }
      });
    } else {
      modalMapInstance.current = null;
    }
  }, [selectedPlaceForModal]);

  // [MOD] 찜 해제/재등록(리스트에서 즉시 삭제하지 않고 하트 상태만 변경) API 연동 포함
  const toggleSavedPlace = async (e, place) => {
    e.stopPropagation(); // 카드 클릭 이벤트(상세보기 이동 등) 방지

    const payload = {
      iPK: Number(place.id),
      strName: place.name,
      strAddress: place.address,
      strGroupName: place.category || "",
      strGroupCode: place.groupCode || "",
      strGroupDetail: place.groupDetail || "",
      strPhone: place.phone || "",
      strLink: place.link || "",
      chCategory: place.chCategory || "E",
      ptLongitude: String(place.longitude || "0"),
      ptLatitude: String(place.latitude || "0"),
    };

    if (unSavedPlaceIds.includes(place.id)) {
      // 이미 해제된 상태에서 클릭 -> 찜 재등록 (하트 다시 채움)
      try {
        try {
          await registerPlace(payload); // fallback DB register
        } catch (regErr) {
          console.warn("registerPlace failed in profile (might already exist):", regErr);
        }

        try {
          let favoriteId = 1;
          try {
            const favListRes = await getFavoriteList();
            if (favListRes.data && favListRes.data.favorite_list && favListRes.data.favorite_list.length > 0) {
              favoriteId = favListRes.data.favorite_list[0].iPK;
            }
          } catch (e) { }
          await appendFavoriteLocation({
            iPK: 0,
            iFavoriteFK: Number(favoriteId),
            iLocationFK: Number(place.id),
          });
        } catch (e) {
          console.error("즐겨찾기 추가 맵핑 실패:", e);
        }

        setUnSavedPlaceIds((prev) => prev.filter((id) => id !== place.id));

        const localData = JSON.parse(
          localStorage.getItem("saved_places") || "[]",
        );
        if (!localData.find((p) => p.id === place.id)) {
          localData.push(place);
          localStorage.setItem("saved_places", JSON.stringify(localData));
        }

        if (toastPlace?.id === place.id) {
          setIsToastOpen(false);
        }
      } catch (error) {
        console.error("장소 재등록 실패:", error);
      }
    } else {
      // 찜 해제 (바로 리스트에서 제거)
      try {
        if (place.favoriteLocationPK) {
          await removeFavoriteLocation(place.favoriteLocationPK);
        }

        // [MOD] 즉시 리스트에서 제거하도록 상태 업데이트
        setSavedPlaces((prev) => prev.filter((p) => p.id !== place.id));

        const localData = JSON.parse(
          localStorage.getItem("saved_places") || "[]",
        );
        const updatedLocalData = localData.filter((p) => p.id !== place.id);
        localStorage.setItem("saved_places", JSON.stringify(updatedLocalData));

        setToastPlace(place);
        setIsToastOpen(true);
      } catch (error) {
        console.error("찜 해제 실패:", error);
      }
    }
  };


  return (
    <MobileContainer showNav={true}>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_API_KEY}&autoload=false&libraries=services`}
        strategy="afterInteractive"
      />
      <div className="w-full h-screen bg-white flex flex-col lg:bg-[#f8f9fa]">
        <header className="flex items-center justify-between py-4 bg-white sticky top-0 z-10 lg:bg-transparent lg:border-none lg:py-6">
          <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between px-5 lg:px-10">
            <h1 className="text-[20px] lg:text-[24px] font-semibold text-[#111] tracking-tighter">
              마이페이지
            </h1>
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 -mr-2 text-[#111] hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <MoreVertical size={24} strokeWidth={2} />
              </button>

              {isSettingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSettingsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#eceff4] z-50 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      className="px-4 py-3 text-[14px] lg:text-sm font-medium text-[#111] text-left hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        console.log("프로필 수정 클릭");
                        setIsSettingsOpen(false);
                      }}
                    >
                      프로필 수정
                    </button>
                    <button
                      className="px-4 py-3 text-[14px] lg:text-sm font-medium text-[#ff3b3b] text-left hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        // [MOD] 로그아웃 구현 (백엔드 API 없이 클라이언트에서 토큰 삭제)
                        if (window.confirm("로그아웃 하시겠습니까?")) {
                          localStorage.removeItem("token");
                          localStorage.removeItem("saved_places");
                          router.push("/login"); // 로그인 페이지로 이동
                        }
                        setIsSettingsOpen(false);
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full pb-32">
          <div className="max-w-[1280px] w-full mx-auto lg:px-10">
            {/* Profile Section */}
            <div className="pt-2 pb-4 px-5 lg:bg-white lg:rounded-2xl lg:mt-2 lg:px-10 lg:border lg:border-[#eceff4] lg:py-6">
              <div className="flex items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-5 lg:gap-6">
                  <div className="w-16 h-16 bg-[#f2f4f6] rounded-full flex items-center justify-center border border-[#eceff4] shrink-0">
                    <Image
                      src={user.profileImage}
                      alt="profile"
                      width={26}
                      height={34}
                      className="grayscale opacity-20"
                    />
                  </div>
                  <div className="flex flex-col gap-1 lg:gap-1.5">
                    <h1 className="text-[20px] font-semibold text-[#111111] tracking-[-0.5px] lg:text-[24px]">
                      {user.name}
                    </h1>

                  </div>
                </div>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-[#f2f4f6] bg-white lg:mt-4 lg:rounded-t-2xl lg:px-8 lg:border-x lg:border-t lg:border-[#eceff4]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "flex-1 py-4 text-[16px] tracking-[-0.3px] transition-all relative lg:text-[18px] lg:py-6",
                    activeTab === tab.id
                      ? "font-semibold text-[#111111]"
                      : "font-medium text-[#abb1b9]",
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#111111]" />
                  )}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="bg-[#fafafa] lg:bg-white px-5 pt-4 pb-12 lg:py-8 lg:rounded-b-2xl lg:px-8 min-h-[400px] lg:border lg:border-[#eceff4]">
              {activeTab === "장소" ? (
                <div className="flex flex-col gap-2">
                  {/* [ADD] 카테고리 필터 버튼 UI (검색 결과 페이지와 동일한 스타일) */}
                  <div className="relative group/nav mb-2">
                    {showLeftArrow && (
                      <button
                        onClick={() => scroll("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 border border-[#eceff4] rounded-full shadow-sm text-[#111111] hover:bg-white transition-all shadow-md"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                    )}
                    <div
                      ref={categoryScrollRef}
                      onScroll={checkScroll}
                      onMouseDown={handleMouseDown}
                      onMouseLeave={handleMouseLeave}
                      onMouseUp={handleMouseUp}
                      onMouseMove={handleMouseMove}
                      className="flex overflow-x-auto gap-1.5 scrollbar-hide pb-2 -mx-5 px-5 lg:-mx-8 lg:px-8 after:content-[''] after:w-[1px] after:pr-5 lg:after:pr-8 cursor-grab active:cursor-grabbing select-none"
                    >
                      {[
                        "전체",
                        "음식점",
                        "카페",
                        "편의점",
                        "관광명소",
                        "문화시설",
                        "숙박",
                        "지하철역",
                        "주차장",
                        "주유소",
                        "대형마트",
                      ].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={clsx(
                            "whitespace-nowrap px-3 py-1.5 rounded-full text-[14px] font-medium transition-all border shrink-0",
                            selectedCategory === cat
                              ? "bg-[#111111] text-white border-[#111111] font-semibold"
                              : "bg-white text-[#111111] border-[#DBDBDB] hover:bg-gray-50",
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {showRightArrow && (
                      <button
                        onClick={() => scroll("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 border border-[#eceff4] rounded-full shadow-sm text-[#111111] hover:bg-white transition-all shadow-md"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2 pt-2 pb-1 relative z-30 w-full">
                    {/* [ADD] 즐겨찾기 폴더 그룹 리스트 영역 */}
                    <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-1 sm:pr-4 w-full">
                      {favoriteGroups.map((group) => (
                        <button
                          key={group.iPK || group.strName}
                          onClick={() => setSelectedGroupPK(group.iPK)}
                          className={clsx(
                            "whitespace-nowrap px-3 py-1.5 rounded-full text-[14px] font-medium transition-all border shrink-0",
                            selectedGroupPK === group.iPK
                              ? "bg-[#7a28fa] text-white border-[#7a28fa] font-semibold"
                              : "bg-white text-[#111111] border-[#DBDBDB] hover:bg-gray-50",
                          )}
                        >
                          {group.strName}
                        </button>
                      ))}
                      {favoriteGroups.length === 0 && (
                        <button
                          className="whitespace-nowrap px-3 py-1.5 rounded-full text-[14px] font-semibold transition-all border bg-[#7a28fa] text-white border-[#7a28fa] shrink-0"
                        >
                          1
                        </button>
                      )}

                      {/* 그룹 추가/삭제 버튼 */}
                      <button
                        onClick={handleCreateGroup}
                        className="whitespace-nowrap px-2.5 py-1.5 rounded-full text-[13px] font-medium bg-white text-[#111] border border-[#eceff4] hover:bg-gray-50 transition-all shrink-0 flex items-center shadow-sm"
                      >
                        +그룹생성
                      </button>
                      {favoriteGroups.length > 0 && (
                        <button
                          onClick={handleDeleteGroup}
                          className="whitespace-nowrap px-2.5 py-1.5 rounded-full text-[13px] font-medium bg-white text-[#ff3b3b] border border-[#ff3b3b] hover:bg-red-50 transition-all shrink-0 flex items-center shadow-sm"
                        >
                          -그룹삭제
                        </button>
                      )}
                    </div>

                    {/* [MOD] 기존 정렬 드롭다운 (우측 고정, 위치 필터 삭제됨) */}
                    <div className="flex justify-start sm:justify-end gap-2 shrink-0 w-full sm:w-auto mt-1 sm:mt-0">
                      <div className="relative">
                        <button
                          onClick={() => setIsSortOpen(!isSortOpen)}
                          className="flex items-center gap-1 py-1 pl-3 pr-1 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-[14px] font-medium text-[#898989]">
                            {{
                              latest: "최신순",
                              reviews: "평균평점",
                              oldest: "과거순",
                            }[sortBy] || "최신순"}
                          </span>
                          <ChevronDown
                            size={16}
                            className={clsx(
                              "text-[#898989] transition-transform",
                              isSortOpen && "rotate-180",
                            )}
                          />
                        </button>

                        {isSortOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsSortOpen(false)}
                            />
                            <div className="absolute top-full right-0 mt-1 w-28 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-[#eceff4] z-20 overflow-hidden flex flex-col py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                              {[
                                { id: "latest", label: "최신순" },
                                { id: "reviews", label: "평균평점" },
                                { id: "oldest", label: "과거순" },
                              ].map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => {
                                    setSortBy(option.id);
                                    setIsSortOpen(false);
                                  }}
                                  className={clsx(
                                    "px-4 py-3 text-[14px] text-left transition-colors",
                                    sortBy === option.id
                                      ? "font-bold text-[#111111] bg-gray-50 text-opacity-100"
                                      : "font-medium text-[#6e6e6e] hover:bg-gray-50",
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-2">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-[#abb1b9]">
                        <p className="text-[16px] font-medium animate-pulse">
                          장소를 불러오는 중...
                        </p>
                      </div>
                    ) : (
                      <>
                        {filteredPlaces.map((place) => (
                          <div
                            key={place.id}
                            onClick={() => {
                              if (window.innerWidth >= 1024) {
                                setSelectedPlaceForModal(place);
                              } else {
                                localStorage.setItem(
                                  `place_${place.id}`,
                                  JSON.stringify(place),
                                );
                                router.push(`/search/place/${place.id}`);
                              }
                            }}
                            className="bg-white rounded-2xl border border-[#eceff4] p-4 hover:border-[#7a28fa] transition-shadow cursor-pointer relative"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex flex-col gap-1 items-start w-full pr-8">
                                <h3 className="text-[17px] font-bold text-[#111111] w-full line-clamp-1">
                                  {place.name}
                                </h3>
                                {/* [MOD] 카테고리 뱃지와 주소를 나란히 배치 */}
                                <div className="flex items-center gap-2 mt-0.5 w-full">
                                  <span className="text-[12px] font-medium text-[#7a28fa] bg-[#f8f6ff] px-2 py-0.5 rounded-[4px] flex-shrink-0">
                                    {place.category}
                                  </span>
                                  <p className="text-[13px] text-[#6d818f] line-clamp-1">
                                    {place.address}
                                  </p>
                                </div>
                              </div>
                              {/* [MOD] 찜 해제 하트 버튼 (상태에 따른 시각적 변화 처리) */}
                              <button
                                onClick={(e) => toggleSavedPlace(e, place)}
                                className={clsx(
                                  "p-1 -mr-1 -mt-1 hover:bg-gray-50 rounded-full transition-colors absolute right-4 top-4 flex-shrink-0",
                                  unSavedPlaceIds.includes(place.id)
                                    ? "text-[#abb1b9]" // 해제 시 회색
                                    : "text-[#ff3b3b]", // 찜 상태 시 빨간색
                                )}
                                aria-label="찜 상태 변경"
                              >
                                <Heart
                                  size={20}
                                  fill="currentColor"
                                  strokeWidth={0}
                                />
                              </button>
                            </div>
                            <div className="flex flex-col gap-1.5 mt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-bold text-[#7a28fa] flex items-center gap-0.5">
                                  ★ {place.rating || 0}
                                </span>
                                <span className="text-[13px] text-[#abb1b9]">
                                  ({place.reviewCount || 0})
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredPlaces.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 text-[#abb1b9]">
                            <p className="text-[16px] font-medium">
                              해당 카테고리의 찜한 장소가 없습니다.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : activeTab === "리뷰" ? (
                <div className="flex flex-col gap-4">
                  {isReviewLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7a28fa]" />
                    </div>
                  ) : myReviewsGrouped.length > 0 ? (
                    myReviewsGrouped.map((group) => {
                      const isOpen = openAccordions.includes(group.id);
                      return (
                        <div key={group.id} className="bg-white rounded-2xl border border-[#eceff4] overflow-hidden">
                          <button
                            onClick={() => {
                              setOpenAccordions(prev =>
                                prev.includes(group.id)
                                  ? prev.filter(id => id !== group.id)
                                  : [...prev, group.id]
                              );
                            }}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#f2f4f6] rounded-lg flex items-center justify-center">
                                <Image src="/icons/location.svg" alt="location" width={16} height={16} />
                              </div>
                              <span className="text-[16px] font-bold text-[#111]">{group.name}</span>
                              <span className="text-[14px] font-medium text-[#abb1b9]">{group.reviews.length}</span>
                            </div>
                            {isOpen ? <ChevronUp size={20} className="text-[#abb1b9] transition-transform" /> : <ChevronDown size={20} className="text-[#abb1b9] transition-transform" />}
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-4 flex flex-col gap-4 border-t border-[#f2f4f6] pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              {group.reviews.map((review, idx) => (
                                <div key={review.iPK || idx} className="flex flex-col gap-2 bg-[#f9f9fb] p-3 rounded-xl">
                                  <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex text-[#7a28fa] text-[12px]">
                                        {"★".repeat(review.nScore)}{"☆".repeat(5 - review.nScore)}
                                      </div>
                                      <p className="text-[14px] text-[#555] leading-relaxed">
                                        {review.strReview}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span className="text-[12px] text-[#abb1b9]">
                                        {(review.dtCreate || "").split(" ")[0].replace(/-/g, ".")}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => openModifyReview(review)}
                                          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                          <div
                                            className="w-[14px] h-[14px] bg-[#7a28fa] opacity-60"
                                            style={{
                                              WebkitMaskImage: "url('/icons/edit.svg')",
                                              maskImage: "url('/icons/edit.svg')",
                                              WebkitMaskSize: "contain",
                                              maskSize: "contain",
                                              WebkitMaskRepeat: "no-repeat",
                                              maskRepeat: "no-repeat",
                                              WebkitMaskPosition: "center",
                                              maskPosition: "center",
                                            }}
                                          />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReview(review.iPK)}
                                          className="p-1.5 hover:bg-red-50 text-[#abb1b9] hover:text-[#ff3b3b] rounded-md transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 px-5 text-center bg-white rounded-2xl border border-[#eceff4]">
                      <div className="w-16 h-16 bg-[#F2F4F6] rounded-full flex items-center justify-center mb-4">
                        <Image src="/icons/profile.svg" alt="profile" width={24} height={24} className="grayscale opacity-20" />
                      </div>
                      <p className="text-[#898F97] text-[16px] font-medium mb-1">작성한 리뷰가 없습니다</p>
                      <p className="text-[#ABB1B9] text-[14px]">방문하신 장소에 대한 소중한 리뷰를 남겨보세요!</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">

                  {isLoading ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 lg:gap-3">
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <PhotoSkeleton key={`skeleton-${idx}`} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 lg:gap-3">
                      {favoriteImages.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative aspect-square rounded-xl overflow-hidden group bg-[#f2f4f6]"
                        >
                          <Image
                            src={photo.src}
                            alt="saved-photo"
                            fill
                            sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 200px"
                            quality={75}
                            className="object-cover group-hover:scale-110 transition-transform cursor-pointer"
                            onClick={() => setSelectedZoomImage(photo.src)} // [ADD] 클릭 시 확대
                          />
                          {/* [ADD] 찜 해제 하트 버튼 (상태 유지: 빨간색 채워짐) */}
                          <button
                            onClick={(e) => handleRemoveFavoriteImage(e, photo.id, photo.id)}
                            className="absolute bottom-1 left-1 p-1.5 hover:bg-black/10 rounded-full transition-all z-10"
                          >
                            <Heart size={18} fill="#ff3b3b" color="#ff3b3b" strokeWidth={0} />
                          </button>
                        </div>
                      ))}
                      {favoriteImages.length === 0 && (
                        <div className="col-span-3 md:col-span-4 flex flex-col items-center justify-center py-20 px-5 text-center bg-white rounded-2xl border border-[#eceff4]">
                          <div className="w-16 h-16 bg-[#F2F4F6] rounded-full flex items-center justify-center mb-4">
                            <Image src="/icons/profile.svg" alt="profile" width={24} height={24} className="grayscale opacity-20" />
                          </div>
                          <p className="text-[#898F97] text-[16px] font-medium mb-1">
                            아직 찜한 사진이 없습니다
                          </p>
                          <p className="text-[#ABB1B9] text-[14px]">
                            가고 싶은 여행지의 사진을 찜해보세요!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Toast
          isVisible={isToastOpen}
          onClose={() => setIsToastOpen(false)}
          message="찜한 장소를 해제했어요"
          position="bottom"
        />

        <BottomNavigation />
      </div>

      {/* [ADD] 리뷰 수정 모달 */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg relative">
            <h3 className="text-[17px] font-bold text-[#111] mb-5">리뷰 수정</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[14px] font-semibold text-[#111] mb-2 block">별점</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onClick={() => setReviewScore(s)}
                      className={clsx("text-2xl", reviewScore >= s ? "text-[#7a28fa]" : "text-gray-200")}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-[14px] font-semibold text-[#111] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRevisit}
                    onChange={(e) => setIsRevisit(e.target.checked)}
                    className="accent-[#7a28fa] w-4 h-4"
                  />
                  다음에 또 방문할래요
                </label>
              </div>
              <div>
                <label className="text-[14px] font-semibold text-[#111] mb-2 block">리뷰 내용</label>
                <textarea
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  placeholder="방문 경험을 들려주세요 (최대 1000자)"
                  className="w-full h-32 border border-gray-200 rounded-lg p-3 text-[14px] resize-none focus:outline-none focus:border-[#7a28fa]"
                  maxLength={1000}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="flex-1 py-3.5 bg-gray-100 text-[#555] font-semibold rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleSaveReview}
                className="flex-1 py-3.5 bg-[#7a28fa] text-white font-semibold rounded-lg hover:bg-[#6b22de]"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}


      {/* [MOD] 찜한 사진 확대 모달 (기존 trips/[tripId]와 동일한 UI 구성) */}
      {selectedZoomImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 py-10 animate-in fade-in duration-200"
          onClick={() => setSelectedZoomImage(null)}
        >
          <div 
            className="relative w-full max-w-[600px] bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-2 flex justify-between items-center">
              <h3 className="text-[18px] font-bold text-[#111] tracking-tight">사진 크게 보기</h3>
              <button
                className="w-10 h-10 flex items-center justify-center text-[#8e8e93] hover:text-[#111] transition-colors rounded-full hover:bg-gray-100"
                onClick={() => setSelectedZoomImage(null)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Image Area */}
            <div className="p-4 flex flex-col items-center">
              <img
                src={selectedZoomImage}
                alt="Enlarged"
                className="w-full h-auto max-h-[70vh] object-contain rounded-2xl"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-6 flex justify-center bg-[#fbfbfc]">
              <button
                onClick={() => setSelectedZoomImage(null)}
                className="w-full h-[56px] bg-[#7a28fa] text-white rounded-2xl text-[16px] font-bold hover:bg-[#6922d5] transition-colors shadow-lg shadow-[#7a28fa]/20 active:scale-95 transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [ADD] PC 전용 상세 정보 모달 */}
      {
        selectedPlaceForModal && (
          <div className="hidden lg:flex fixed inset-0 z-[100] items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-[600px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="p-8 pb-4 flex flex-col gap-2">
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="text-[13px] font-bold text-[#7a28fa] bg-[#f8f6ff] px-3 py-1 rounded-full">
                    {selectedPlaceForModal.category}
                  </span>
                  <h2 className="text-[28px] font-bold text-[#111111] tracking-tight">
                    {selectedPlaceForModal.name}
                  </h2>
                </div>
                <p className="text-[16px] text-[#6d818f]">
                  {selectedPlaceForModal.address}
                </p>
              </div>

              {/* Map Area */}
              <div className="flex-1 min-h-[300px] relative">
                <div
                  ref={modalMapRef}
                  className="absolute inset-0 w-full h-full"
                />
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0px_0px_40px_rgba(0,0,0,0.05)]" />
              </div>

              {/* Modal Footer */}
              <div className="p-8 flex items-center justify-between bg-[#fbfbfc]">
                <button
                  onClick={() => {
                    localStorage.setItem(
                      `place_${selectedPlaceForModal.id}`,
                      JSON.stringify(selectedPlaceForModal),
                    );
                    router.push(`/search?select=${selectedPlaceForModal.id}`);
                  }}
                  className="h-[56px] px-8 bg-[#7a28fa] text-white rounded-2xl text-[16px] font-bold hover:bg-[#6922d5] transition-colors shadow-lg shadow-[#7a28fa]/20 active:scale-95 transition-all"
                >
                  상세보기
                </button>
                <button
                  onClick={() => setSelectedPlaceForModal(null)}
                  className="h-[56px] px-8 border border-[#eceff4] bg-white text-[#6d818f] rounded-2xl text-[16px] font-bold hover:bg-gray-50 active:scale-95 transition-all"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )
      }
    </MobileContainer >
  );
}
