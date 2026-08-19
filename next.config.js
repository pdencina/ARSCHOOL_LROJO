/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TODO: Quitar esto una vez arreglados los errores TS heredados
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

module.exports = nextConfig
