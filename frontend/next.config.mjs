// frontend/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dangerously allow production builds to successfully complete 
  // even if your project has TypeScript or Linting errors.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
