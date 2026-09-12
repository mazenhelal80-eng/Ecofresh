import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EcoFresh | إيكو فريش — نظام إدارة التصدير',
    short_name: 'EcoFresh',
    description: 'نظام إدارة موارد المؤسسة الموحد لشركات تصدير الحاصلات الزراعية المجمدة وإدارة محطات التبريد',
    start_url: '/dashboard',
    id: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#012d1d',
    theme_color: '#012d1d',
    lang: 'ar',
    dir: 'rtl',
    categories: ['business', 'productivity', 'finance'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
