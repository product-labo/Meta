/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Set output file tracing root to silence workspace warning
  outputFileTracingRoot: process.cwd(),
  // Force webpack mode
  experimental: {},
  webpack: (config, { isServer }) => {
    // Exclude problematic node_modules from being processed
    config.module.rules.push({
      test: /node_modules\/thread-stream\/(test|bench|LICENSE|README\.md)/,
      use: 'ignore-loader',
    });
    
    // Add fallbacks for problematic modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'tap': false,
      'fastbench': false,
      'desm': false,
      'pino-elasticsearch': false,
      'tape': false,
      'why-is-node-running': false,
    };

    // Exclude test files from being processed
    config.module.rules.push({
      test: /\.(test|spec)\.(js|mjs|ts|tsx)$/,
      use: 'ignore-loader',
    });

    return config;
  },
}

export default nextConfig
