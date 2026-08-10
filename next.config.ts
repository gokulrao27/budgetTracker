import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  allowedDevOrigins: process.env.NODE_ENV === 'development' ? ['http://192.168.31.82:3000'] : undefined,
};

export default nextConfig;
