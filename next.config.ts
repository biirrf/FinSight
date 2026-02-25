import type { NextConfig } from "next";
import TerserPlugin from 'terser-webpack-plugin';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  }, typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { webpack, dev }) => {
    if (!dev) {
      config.optimization = config.optimization || {};
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
            },
          },
        }),
      ];
    }
    return config;
  },
};

export default nextConfig;
