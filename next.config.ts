import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint/typecheck in CI via npm run lint / typecheck — skip during build for speed
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep typechecking on; incremental tsconfig already helps. Fail build on errors.
    ignoreBuildErrors: false,
  },
  // Heavy browser-only packages — don't pull into Node server bundles
  serverExternalPackages: ["onnxruntime-web", "@ricky0123/vad-web"],
  // Keep VAD / ONNX WASM out of serverless function traces (Vercel size limit)
  outputFileTracingExcludes: {
    "*": [
      "node_modules/onnxruntime-web/**/*",
      "node_modules/@ricky0123/vad-web/**/*",
      "node_modules/@img/**/*",
      "node_modules/typescript/**/*",
      "node_modules/eslint/**/*",
      "node_modules/vitest/**/*",
      "node_modules/@esbuild/**/*",
      "node_modules/@rollup/**/*",
    ],
  },
  experimental: {
    // Tree-shake large barrel packages (major compile-time win)
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
