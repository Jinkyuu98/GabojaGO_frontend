import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg text-white">
      <h2 className="text-xl font-bold mb-4">페이지를 찾을 수 없습니다.</h2>
      <p className="mb-4 text-text-dim">요청하신 페이지가 존재하지 않습니다.</p>
      <Link
        href="/home"
        className="px-4 py-2 bg-primary text-black rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
