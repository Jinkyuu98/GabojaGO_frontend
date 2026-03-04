"use client";

import React, { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Camera,
  RefreshCw,
  X,
  Check,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { MobileContainer } from "../../../../../components/layout/MobileContainer";
import { addScheduleExpense } from "../../../../../services/schedule";

export default function TravelCameraPage() {
  const params = useParams();
  const { tripId, mode } = params;
  const router = useRouter();

  const isReceipt = mode === "receipt";

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .catch((e) => console.error("Video play failed:", e));
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("카메라 접근에 실패했습니다. (권한 및 카메라 상태 확인)");
      }
    };

    if (!capturedImage) {
      startCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [capturedImage]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL("image/jpeg");
      setCapturedImage(imageData);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  const handleAlbumClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleSave = async () => {
    console.log(`Saving ${mode} for trip:`, tripId);

    if (isReceipt && capturedImage) {
      try {
        // [ADD] 영수증 파싱 API 호출 로직 추가 (data URI -> blob 변환)
        const fetchResponse = await fetch(capturedImage);
        const blob = await fetchResponse.blob();

        const formData = new FormData();
        formData.append("file", blob, "receipt.jpg");

        // UI에 로딩 상태를 알리기 위해 임시 알림 (실서비스에선 로딩 스피너 권장)
        alert("영수증 분석을 분석 중입니다... 확인을 누르고 잠시만 기다려주세요.");

        const response = await fetch('/api/vision/parse', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API 오류: ${response.status}`);
        }

        const expenseData = await response.json();
        console.log("GPT 영수증 분석 완료:", expenseData);

        // 3. 백엔드(DB)로 실제 영수증 내역 전송
        // OpenAPI 스폰서 스키마(ScheduleExpenseModel)에 맞춰 속성명(chCategory, nMoney, dtExpense 등) 및 필수값(iUserFK, iLocation) 부여
        const parsedUserId = parseInt(localStorage.getItem("userId") || "1", 10);
        const safeUserId = isNaN(parsedUserId) ? 1 : parsedUserId;

        await addScheduleExpense({
          iScheduleFK: parseInt(tripId, 10), // URL 파라미터 tripId
          iUserFK: safeUserId, // 지출한 사용자 PK
          dtExpense: expenseData.date || new Date().toISOString().replace("T", " ").substring(0, 19),
          chCategory: expenseData.category ? expenseData.category.charAt(0).toUpperCase() : "F", // 카테고리 문자 (F, E 등)
          nMoney: parseInt(expenseData.total || 0, 10), // 총 지출
          iLocation: 0, // 장소 특정 불가 시 0 처분
          strMemo: expenseData.strMemo || "영수증 지출",
        });

        alert(`🎉 영수증 등록 및 지출 저장 완전 성공! (DB 저장 완료)\n\n결제금액: ${expenseData.total}원\n내용: ${expenseData.strMemo}`);
      } catch (error) {
        console.error("영수증 분석 실패:", error);
        alert("영수증 등록 및 분석 중 오류가 발생했습니다.");
      }
    } else if (!isReceipt) {
      alert("사진이 저장되었습니다!");
    }

    // [MOD] 영수증 모드면 비용 탭, 사진 모드면 기록 탭으로 복귀
    const returnTab = isReceipt ? "비용" : "기록";
    router.push(`/trips/${tripId}?tab=${returnTab}`);
  };

  return (
    <MobileContainer>
      <div className="h-full bg-black relative flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 text-white bg-gradient-to-b from-black/60 to-transparent">
          <button
            className="bg-transparent border-none text-white cursor-pointer p-2 rounded-full hover:bg-white/10"
            onClick={() => router.push(`/trips/${tripId}?tab=${isReceipt ? "비용" : "기록"}`)}
          >
            <X size={24} />
          </button>
          <h2 className="text-lg font-bold">
            {isReceipt ? "영수증 촬영" : "사진 촬영"}
          </h2>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Camera View / Preview */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {error ? (
            <div className="text-white text-center p-4">{error}</div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {/* Controls */}
        <div className="bg-black pb-8 pt-6 px-6 flex justify-between items-center z-20">
          {capturedImage ? (
            <>
              <button
                className="flex flex-col items-center gap-1 text-white bg-transparent border-none cursor-pointer p-2"
                onClick={handleRetake}
              >
                <RefreshCw size={24} />
                <span className="text-xs">다시 찍기</span>
              </button>
              <button
                className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold border-none"
                onClick={handleSave}
              >
                <Save size={20} />
                <span>저장하기</span>
              </button>
            </>
          ) : (
            <div className="w-full flex justify-between items-center">
              {isReceipt ? (
                <button
                  className="w-20 text-white text-sm font-medium bg-transparent border-none cursor-pointer"
                  // [MOD] alert 팝업 대신 직접입력 페이지로 실제 라우터 이동
                  onClick={() => router.push(`/trips/${tripId}/expense/manual`)}
                >
                  직접 입력
                </button>
              ) : (
                <div className="w-20" />
              )}

              <button
                className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center bg-transparent cursor-pointer active:scale-95 transition-transform"
                onClick={handleCapture}
                disabled={!!error}
              >
                <div className="w-16 h-16 rounded-full bg-white transition-opacity hover:opacity-90" />
              </button>

              <button
                className="w-20 h-20 flex flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer text-white"
                onClick={handleAlbumClick}
                title="앨범에서 선택"
              >
                <ImageIcon size={24} />
                <span className="text-[10px] font-medium">불러오기</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: "none" }}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </MobileContainer>
  );
}
