import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.ufs.sh' }],
  },
  transpilePackages: ['@tryonlink/shared'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
