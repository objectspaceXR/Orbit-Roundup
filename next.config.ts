import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",   // static HTML export — Cloudflare Pages compatible
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
