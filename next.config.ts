import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.ufs.sh' }],
  },
  devIndicators: false,
};

export default nextConfig;
