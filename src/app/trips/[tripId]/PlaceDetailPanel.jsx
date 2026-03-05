import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getPlaceReviews, addPlaceReview, modifyPlaceReview, removePlaceReview } from "../../../services/review";
import { appendFavoriteLocation, getFavoriteList } from "../../../services/favorite";
import { registerPlace } from "../../../services/place";
import { Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useCurrentUser } from "../../../hooks/useCurrentUser"; // [ADD] 공통 유저 훅

export function PlaceDetailPanel({ place, onClose, onFavoriteSaved }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);

    // 리뷰 입력/수정 상태
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [reviewScore, setReviewScore] = useState(5);
    const [reviewContent, setReviewContent] = useState("");
    const [isRevisit, setIsRevisit] = useState(true);

    // 즐겨찾기 그룹 선택 관련 상태
    const [showGroupSelector, setShowGroupSelector] = useState(false);
    const [favoriteGroups, setFavoriteGroups] = useState([]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // [MOD] IIFE 제거 → 공통 훅으로 교체 (JWT payload.iPK 사용)
    const { userId: rawUserId, userLoginId, userName: rawUserName } = useCurrentUser();

    // Hydration 가드: 마운트 전에는 유효한 사용자 정보가 없는 것으로 간주 (서버와 동일하게)
    const currentUserId = mounted ? rawUserId : null;
    const currentUserName = mounted ? rawUserName : null;

    // [MOD] fullItem이 있는 경우(trips 페이지에서 전달) → fullItem.location 경로로 수정
    // [FIX] phone/link 버그: 기존 place.location?.strPhone → place.fullItem?.location?.strPhone
    const normalizedPlace = place?.fullItem ? {
        id: place.fullItem.iLocationFK,
        name: place.fullItem.location?.strName,
        address: place.fullItem.location?.strAddress,
        category: place.fullItem.location?.strGroupName,
        groupCode: place.fullItem.location?.strGroupCode,
        phone: place.fullItem.location?.strPhone,       // [FIX] 올바른 경로
        link: place.fullItem.location?.strLink,         // [FIX] 올바른 경로
        latitude: place.fullItem.location?.ptLatitude,
        longitude: place.fullItem.location?.ptLongitude,
        rating: 0,
        reviewCount: reviews.length
    } : place;

    const loadReviews = async () => {
        if (!normalizedPlace?.id) return;
        setLoading(true);
        try {
            const locationId = Number(normalizedPlace.id);
            const res = await getPlaceReviews(locationId);

            if (res?.review_list) {
                const list = typeof res.review_list === "string"
                    ? JSON.parse(res.review_list.replace(/'/g, '"'))
                    : res.review_list;
                setReviews(list || []);
            } else {
                setReviews([]);
            }
        } catch (err) {
            console.error("리뷰 조회 실패:", err);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (normalizedPlace) {
            loadReviews();
        }
    }, [place]);

    const openAddReview = () => {
        setEditingReviewId(null);
        setReviewScore(5);
        setReviewContent("");
        setIsRevisit(true);
        setIsReviewModalOpen(true);
    };

    const openModifyReview = (review) => {
        setEditingReviewId(review.iPK);
        setReviewScore(review.nScore);
        setReviewContent(review.strReview);
        setIsRevisit(review.bRevisit);
        setIsReviewModalOpen(true);
    };

    const handleSaveReview = async () => {
        if (!reviewContent.trim()) {
            alert("리뷰 내용을 입력해주세요.");
            return;
        }
        try {
            const payload = {
                iPK: editingReviewId || 0,
                iLocationFK: Number(normalizedPlace.id),
                iUserFK: currentUserId,
                nScore: reviewScore,
                bRevisit: isRevisit,
                strReview: reviewContent,
                dtCreate: new Date().toISOString()
            };

            if (editingReviewId) {
                await modifyPlaceReview(payload);
                alert("리뷰가 수정되었습니다.");
            } else {
                await addPlaceReview(payload);
                alert("리뷰가 등록되었습니다.");
            }
            setIsReviewModalOpen(false);
            loadReviews();
        } catch (err) {
            console.error("리뷰 저장 불가:", err);
            alert("리뷰 등록/수정에 실패했습니다.");
        }
    };

    const handleDeleteReview = async (iPK) => {
        if (!window.confirm("정말 리뷰를 삭제하시겠습니까?")) return;
        try {
            await removePlaceReview(iPK);
            alert("리뷰가 삭제되었습니다.");
            loadReviews();
        } catch (err) {
            console.error("리뷰 삭제 실패:", err);
            alert("리뷰 삭제에 실패했습니다.");
        }
    };

    if (!normalizedPlace) return null;

    return (
        <div className="flex flex-col h-full bg-white relative w-full overflow-y-auto scrollbar-hide pt-2 lg:px-2">
            {/* 상단 닫기/뒤로가기 헤더 */}
            <div className="sticky top-0 bg-white z-10 flex items-center mb-6 pb-2">
                <button
                    onClick={onClose}
                    className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Image src="/icons/arrow-left.svg" alt="back" width={20} height={16} className="w-5 h-4" />
                </button>
                <h2 className="ml-4 text-[18px] font-bold text-[#111111]">
                    장소 상세
                </h2>
            </div>

            <div className="flex flex-col gap-6 px-2">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex">
                            <span className="text-[12px] font-semibold text-[#7a28fa] bg-[#f9f5ff] px-2 py-0.5 rounded">
                                {normalizedPlace.category || "기타"}
                            </span>
                        </div>
                        <h1 className="text-[24px] font-bold text-[#111111] tracking-[-1px]">
                            {normalizedPlace.name}
                        </h1>
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-[14px] text-[#6e6e6e] leading-relaxed">
                            {normalizedPlace.address || "주소 정보가 없습니다."}
                        </p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            {normalizedPlace.phone && (
                                <p className="text-[13px] text-[#6e6e6e] flex items-center gap-1">
                                    📞{" "}
                                    <a href={`tel:${normalizedPlace.phone}`} className="hover:underline">
                                        {normalizedPlace.phone}
                                    </a>
                                </p>
                            )}
                            {normalizedPlace.link && (
                                <p className="text-[13px] text-[#6e6e6e] flex items-center gap-1 overflow-hidden">
                                    🔗{" "}
                                    <a href={normalizedPlace.link} target="_blank" rel="noopener noreferrer" className="hover:underline text-[#7a28fa] truncate">
                                        {normalizedPlace.link}
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                    <button
                        onClick={async () => {
                            try {
                                const favListRes = await getFavoriteList();
                                if (favListRes.data && favListRes.data.favorite_list && favListRes.data.favorite_list.length > 0) {
                                    setFavoriteGroups(favListRes.data.favorite_list);
                                    setShowGroupSelector(true);
                                } else {
                                    alert("즐겨찾기 그룹 정보를 불러올 수 없습니다.");
                                }
                            } catch (e) {
                                console.error("Failed to fetch favorite list:", e);
                                alert("즐겨찾기 목록을 불러오는 중 오류가 발생했습니다.");
                            }
                        }}
                        className="w-full h-[56px] bg-[#111111] text-white rounded-2xl text-[16px] font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        찜한 장소로 등록하기
                    </button>
                </div>

                {showGroupSelector && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center p-4">
                        <div className="w-full max-w-[400px] bg-white rounded-t-[20px] sm:rounded-[20px] overflow-hidden animate-slide-up">
                            <div className="px-5 py-4 border-b border-[#f2f4f6] flex items-center justify-between">
                                <h3 className="text-[17px] font-bold text-[#111]">저장할 그룹 선택</h3>
                                <button onClick={() => setShowGroupSelector(false)} className="text-[#abb1b9]">
                                    <Image src="/icons/close-icon.svg" alt="close" width={24} height={24} />
                                </button>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto px-2 py-2">
                                {favoriteGroups.map((group) => (
                                    <button
                                        key={group.iPK}
                                        onClick={async () => {
                                            try {
                                                try {
                                                    await registerPlace({
                                                        iPK: Number(normalizedPlace.id),
                                                        strName: normalizedPlace.name,
                                                        strAddress: normalizedPlace.address,
                                                        strGroupName: normalizedPlace.category || "",
                                                        strGroupCode: normalizedPlace.groupCode || "",
                                                        strGroupDetail: normalizedPlace.groupDetail || "",
                                                        strPhone: normalizedPlace.phone || "",
                                                        strLink: normalizedPlace.link || "",
                                                        chCategory: normalizedPlace.chCategory || "E",
                                                        ptLatitude: String(normalizedPlace.latitude || "0"),
                                                        ptLongitude: String(normalizedPlace.longitude || "0")
                                                    });
                                                } catch (e) {
                                                    // 의도된 에러 무시
                                                }

                                                await appendFavoriteLocation({
                                                    iPK: 0,
                                                    iFavoriteFK: Number(group.iPK),
                                                    iLocationFK: Number(normalizedPlace.id)
                                                });

                                                setShowGroupSelector(false);
                                                alert("찜한 장소로 등록되었습니다.");
                                                if (onFavoriteSaved) {
                                                    onFavoriteSaved(normalizedPlace);
                                                }
                                            } catch (e) {
                                                console.error("즐겨찾기 추가 실패:", e);
                                                // [MOD] 사용자의 첫 번째 요청: "이미 찜한 장소입니다" 노출
                                                alert("이미 찜한 장소입니다.");
                                            }
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#f8f9fa] rounded-xl transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 bg-[#f2f4f6] rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Image src="/icons/location.svg" alt="folder" width={20} height={20} />
                                        </div>
                                        <span className="text-[15px] font-medium text-[#111]">{group.strName}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-[1px] bg-[#f2f4f6] mt-2" />

                <section className="pb-8">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[16px] font-bold text-[#111111]">
                                리뷰 <span className="text-[#abb1b9] font-medium ml-1">{reviews.length}</span>
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <span className="text-[#7a28fa] text-[14px]">★</span>
                                <span className="text-[16px] font-bold text-[#7a28fa]">
                                    {reviews.length ? (reviews.reduce((s, r) => s + r.nScore, 0) / reviews.length).toFixed(1) : 0}
                                </span>
                            </div>
                            <button
                                onClick={openAddReview}
                                className="px-3 py-1.5 bg-[#f4f0fd] text-[#7a28fa] text-[13px] font-semibold rounded-md hover:bg-[#ebdffd] transition-colors"
                            >
                                + 리뷰추가
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {reviews.length > 0 ? reviews.map((r, i) => {
                            // [MOD] 리뷰 작성자 이름 표시 (strUserID 우선, 없으면 기본값)
                            let strName = r.strUserID || r.strUserId || r.strUserName || r.userId || r.name || r.user?.strUserID || r.user?.strName;
                            // [MOD] 내 리뷰라면 훅에서 가져온 userLoginId/userName 우선 사용
                            if (!strName && currentUserId !== null && String(r.iUserFK) === String(currentUserId)) {
                                strName = userLoginId || currentUserName;
                            }
                            strName = strName || `유저 [${r.iUserFK}]`;

                            // [MOD] 현재 유저 ID(훅의 iPK)와 리뷰의 iUserFK 비교로 본인 확인
                            const isMine = currentUserId !== null && String(r.iUserFK) === String(currentUserId);

                            return (
                                <div key={r.iPK || i} className="flex flex-col gap-2 pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-bold text-[#111111]">{strName}</span>
                                            {isMine && (
                                                <div className="flex items-center gap-1 ml-2">
                                                    <button onClick={() => openModifyReview(r)} className="p-1 hover:bg-gray-100 rounded flex items-center justify-center relative group">
                                                        <div
                                                            className="w-[14px] h-[14px] bg-[#7a28fa] opacity-60 group-hover:opacity-100 transition-opacity"
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
                                                    <button onClick={() => handleDeleteReview(r.iPK)} className="p-1 hover:bg-gray-100 rounded text-[#969696] hover:text-[#ff4d4f] flex items-center justify-center">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex text-[#7a28fa] text-[10px]">
                                            {"★".repeat(r.nScore)}{"☆".repeat(5 - r.nScore)}
                                        </div>
                                    </div>
                                    <p className="text-[13px] text-[#6e6e6e] leading-snug">{r.strReview}</p>
                                </div>
                            );
                        }) : (
                            <div className="py-2 text-center">
                                <p className="text-[14px] text-[#8e8e93]">아직 등록된 리뷰가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {isReviewModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg relative">
                        <h3 className="text-[17px] font-bold text-[#111] mb-5">{editingReviewId ? "리뷰 수정" : "리뷰 작성"}</h3>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-[14px] font-semibold text-[#555] mb-2 block">별점</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} onClick={() => setReviewScore(s)} className={clsx("text-2xl", reviewScore >= s ? "text-[#7a28fa]" : "text-gray-200")}>★</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-[14px] font-semibold text-[#555] cursor-pointer">
                                    <input type="checkbox" checked={isRevisit} onChange={(e) => setIsRevisit(e.target.checked)} className="accent-[#7a28fa] w-4 h-4" />
                                    다음에 또 방문할래요
                                </label>
                            </div>
                            <div>
                                <label className="text-[14px] font-semibold text-[#555] mb-2 block">리뷰 내용</label>
                                <textarea value={reviewContent} onChange={(e) => setReviewContent(e.target.value)} placeholder="방문 경험을 들려주세요 (최대 1000자)" className="w-full h-32 border border-gray-300 rounded-lg p-3 text-[14px] resize-none focus:outline-none focus:border-[#7a28fa]" maxLength={1000} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setIsReviewModalOpen(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">취소</button>
                            <button onClick={handleSaveReview} className="flex-1 py-3.5 bg-[#7a28fa] text-white font-semibold rounded-lg hover:bg-[#6b22de]">저장</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlaceDetailPanel;
