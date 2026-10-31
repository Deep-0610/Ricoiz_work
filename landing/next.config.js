/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiOrigin = process.env.RICOIZ_API_ORIGIN || "https://ricoiz-backend.onrender.com";
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};
module.exports = nextConfig;
