import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.ufs.sh' }],
  },
  transpilePackages: ['@tryonlink/shared'],
};

export default nextConfig;
