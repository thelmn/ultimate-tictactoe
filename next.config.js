/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dynamic routes for PartyKit rooms/games require runtime rendering
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_PARTYKIT_HOST: process.env.NEXT_PUBLIC_PARTYKIT_HOST || 
      (process.env.NODE_ENV === 'production' ? 'ultimate-tictactoe.thelmn.partykit.dev' : '127.0.0.1:1999'),
    NEXT_PUBLIC_PARTYKIT_NAME: process.env.NEXT_PUBLIC_PARTYKIT_NAME || 'ultimate_tictactoe'
  }
};

module.exports = nextConfig