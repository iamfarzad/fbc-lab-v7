/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

import withBundleAnalyzer from '@next/bundle-analyzer'

export default withBundleAnalyzer(nextConfig)
