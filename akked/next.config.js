/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { serverActions: { bodySizeLimit: '3mb' } }, // payment-proof uploads
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'same-origin' },
    ] }];
  },
};
