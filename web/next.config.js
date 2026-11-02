/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhwtfjgtripwikxwookp.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3Rmamd0cmlwd2lreHdvb2twIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MDU0NDYsImV4cCI6MjA4MDE4MTQ0Nn0.irdLKmMu1d_-Uiyv4zNEaH4rUwL8KCZ8FHhf30MABlU',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    },
    redirects: async () => {
        return [
            {
                source: '/pricing',
                destination: '/#pricing',
                permanent: true,
            },
            {
                source: '/coaching',
                destination: '/#coaching',
                permanent: true,
            },
        ];
    },
    rewrites: async () => {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.BACKEND_URL || 'https://twinmind-9l6x.onrender.com'}/api/:path*`
            }
        ]
    },
    headers: async () => {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    }
                ]
            }
        ]
    }
}

module.exports = nextConfig
