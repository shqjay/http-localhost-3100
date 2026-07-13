const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"]
  },
  ...(isGitHubPages
    ? {
        output: "export",
        basePath: "/http-localhost-3100",
        assetPrefix: "/http-localhost-3100",
        images: { unoptimized: true }
      }
    : {})
};

export default nextConfig;