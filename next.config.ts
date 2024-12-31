import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
      parser: {
        parse: JSON.parse,
      },
    });

    // Disable cache if issues persist
    config.cache = false;

    return config;
  },
};

export default nextConfig;
