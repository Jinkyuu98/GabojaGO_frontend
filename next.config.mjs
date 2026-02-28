/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // [ADD] CORS 우회를 위한 API 프록시 설정
  // 클라이언트 → localhost:3000/proxy/* → 백엔드 서버로 프록시
  async rewrites() {
    const backendUrl = process.env.API_URL || "http://localhost:8000";
    return [
      {
        source: "/proxy/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
