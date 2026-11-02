import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Akked — أكّد', short_name: 'Akked', start_url: '/orders', display: 'standalone', background_color: '#f6f7f9', theme_color: '#0f9d58', lang: 'ar', dir: 'rtl',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] };
}
