/* eslint-disable import/no-extraneous-dependencies */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  poweredByHeader: false,
  trailingSlash: true,
  basePath: '',
  // The starter code load resources from `public` folder with `router.basePath` in React components.
  // So, the source code is "basePath-ready".
  // You can remove `basePath` if you don't need it.
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_DEFIOS_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_DEFIOS_CONTRACT_ADDRESS,
    NEXT_PUBLIC_PINATA_JWT: process.env.NEXT_PUBLIC_PINATA_JWT,
    NEXT_PUBLIC_MULTI_CALL_ADDRESS: process.env.NEXT_PUBLIC_MULTI_CALL_ADDRESS,
    NEXT_PUBLIC_NAMES_DEFIOS_ADDRESS: process.env.NEXT_PUBLIC_NAMES_DEFIOS_ADDRESS,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
});
