/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 
                          process.env.NEXT_PUBLIC_API_URL || 
                          'http://localhost:8000'
    
    console.log(`[Next.js Rewrites] Proxying /api/* to ${internalApiUrl}/api/*`)
    
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
