/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add fuse.js to the transpiled modules
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/fuse\.js/,
      use: ['babel-loader']
    });
    return config;
  }
};

export default nextConfig;
