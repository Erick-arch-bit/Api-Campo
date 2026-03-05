import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',')
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',      value: origins.join(',') },
          { key: 'Access-Control-Allow-Methods',     value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers',     value: 'Content-Type,Authorization,x-signature,x-timestamp,x-device-info' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ]
  },
}

export default nextConfig
