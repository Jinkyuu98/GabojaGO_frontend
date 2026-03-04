import "./globals.css";
import Script from "next/script";
import SessionGuard from "../components/layout/SessionGuard"; // [ADD] 세션 관리 가드

export const metadata = {
  title: "GABOJAGO",
  description: "AI Smart Travel Assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* ...기존 head 내용... */}
      </head>
      <body>
        <SessionGuard /> {/* [ADD] 전역 세션 체크 */}
        {children}

        <Script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
