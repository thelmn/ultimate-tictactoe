/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dynamic routes for PartyKit rooms/games require runtime rendering
  trailingSlash: true,
  images: { unoptimized: true },
};

module.exports = nextConfig