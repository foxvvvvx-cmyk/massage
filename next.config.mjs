import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === "win32";
const isWslUncPath = projectRoot.startsWith("\\\\wsl$\\");

function resolveDistDir() {
  // Allow local verification builds to use an isolated dist dir.
  if (process.env.NEXT_DIST_DIR) {
    return process.env.NEXT_DIST_DIR;
  }
  if (!isWindows || !isWslUncPath) {
    return ".next";
  }

  const safeProjectName = path.basename(projectRoot).replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(os.tmpdir(), `next-dist-${safeProjectName}`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  outputFileTracingRoot: projectRoot,
  distDir: resolveDistDir(),
  outputFileTracingIncludes: {
    "/api/**": ["./data/**"],
  },
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    // 客户端 bundle（isServer=false）和 Edge Middleware/Edge Functions（isServer=true 但
    // nextRuntime="edge"）都跑在没有 Node.js 内置模块的运行时里，两边都要去掉 node: 依赖，
    // 否则误引入的 fs/path/module 会在 Edge Runtime 里直接报错（如 __dirname is not defined）。
    if (!isServer || nextRuntime === "edge") {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        module: false,
      };
    }
    if (nextRuntime === "edge") {
      // next/server eagerly requires userAgent(), which pulls in Next's ncc-bundled
      // ua-parser-js. That bundle's __nccwpck_require__ boilerplate references a bare
      // __dirname (next/dist/compiled/ua-parser-js/ua-parser.js), which doesn't exist
      // in the Edge sandbox and throws "ReferenceError: __dirname is not defined" at
      // request time — this is a known Next.js/Vercel landmine, not app code. Edge
      // Middleware never touches the real filesystem, so a harmless constant is safe.
      config.plugins.push(new webpack.DefinePlugin({ __dirname: JSON.stringify("/") }));
    }
    return config;
  },
};

export default nextConfig;
