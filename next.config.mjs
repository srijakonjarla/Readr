/** @type {import('next').NextConfig} */
const nextConfig = {
  // Default Next.js Node runtime — node:sqlite, fs, the `epub` package all
  // require Node, not Edge. Route handlers can override per-route if needed.
  reactStrictMode: true,

  // Pin the workspace root so Next doesn't pick up the lockfile in a parent
  // directory. (We're a single-repo project, not a workspace.)
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
