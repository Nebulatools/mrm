/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Handle native dependencies for SSH2
    if (isServer) {
      config.externals.push({
        'ssh2': 'commonjs ssh2',
        'ssh2-sftp-client': 'commonjs ssh2-sftp-client'
      });
    } else {
      // For client-side, ignore these modules entirely
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Ignore native binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });

    return config;
  },
};

export default nextConfig;
