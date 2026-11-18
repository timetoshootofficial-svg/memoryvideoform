import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // YouTube thumbnails are the heaviest thing on the page. Letting Next
    // resize and re-encode them is the one clear win of this rewrite.
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com' }],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      { source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
