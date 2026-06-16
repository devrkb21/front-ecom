/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['168.144.148.133', 'czbd.tech'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/storage/**',
      },
    ],
    // Cloudflare Pages doesn't support Next.js Image Optimization
    // Use unoptimized images or Cloudflare Images
    unoptimized: true,
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
