/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["algoliasearch"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      zlib: false,
      http: false,
      https: false,
      buffer: false,
      util: false,
      url: false,
    };
    return config;
  },
};

export default nextConfig;
