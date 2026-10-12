/**
 * Next.js configuration.
 *
 * Nothing exotic is required here: the API key protection happens in the route
 * handler under `app/api/transcribe/route.js`, which always runs on the server.
 *
 * @type {import('next').NextConfig} 
 */
const nextConfig = {
  reactStrictMode: true,

  // Do not advertise the framework version to the world.
  poweredByHeader: false,

  // Allow embedded previews / tunnels to reach the dev server (e.g. a sandbox
  // preview host, an ngrok tunnel, or a LAN IP). Production builds are
  // unaffected by this list.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.e2b.app',
    '*.arena.ai',
    '*.ngrok-free.app',
    '*.ngrok.app',
    '*.trycloudflare.com',
    '*.loca.lt',
  ],

  async headers() {
    return [
      {
        // Baseline hardening for every route. `microphone=(self)` is required
        // so the in-browser recorder can capture audio on the same origin.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
