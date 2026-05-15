import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aixcaller.com';

  const routes = [
    '',
    '/login',
    '/signup',
    '/privacy',
    '/terms',
    '/contact',
    '/themes',
    '/use-cases/real-estate-ai-voice-agent',
    '/use-cases/dental-receptionist-ai',
    '/use-cases/ecommerce-support-ai',
    '/compare/bland-ai-alternative',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : (route.startsWith('/privacy') || route.startsWith('/terms') ? 0.5 : 0.8),
  }));
}
