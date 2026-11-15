import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Deke Sharon',
    short_name: 'Deke Sharon',
    description: 'The Father of Contemporary A Cappella',
    start_url: '/',
    display: 'browser',
    background_color: '#151B2B',
    theme_color: '#151B2B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
