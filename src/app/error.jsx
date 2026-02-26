"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-8 text-center text-black">
      <h2 className="mb-4 text-2xl font-bold text-red-600">
        오류가 발생했습니다
      </h2>
      <p className="mb-8 text-gray-600">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-black px-6 py-2 text-white font-semibold"
      >
        다시 시도
      </button>
    </div>
  );
}
