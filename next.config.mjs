/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR permite compilar en otra carpeta sin pisar la del servidor de desarrollo
const nextConfig = { reactStrictMode: true, distDir: process.env.NEXT_DIST_DIR || ".next", devIndicators: false };
export default nextConfig;
