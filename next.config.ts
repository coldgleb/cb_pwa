import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Разрешаем ваш домен для разработки
  allowedDevOrigins: ['cb.sgl813.ru', 'localhost:3000', '192.168.1.3'],
  
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        'C:/*',
      ],
    };
    return config;
  },
};

export default withSerwist(nextConfig);
