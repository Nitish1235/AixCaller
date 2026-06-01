import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /dashboard/ removed — middleware redirects unauthenticated crawlers to /login,
        // which lets Google follow the redirect and de-index the dashboard URL naturally.
        // /api/ and /admin/ stay blocked because they return raw JSON / internal routes.
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: 'https://aixcaller.com/sitemap.xml',
    host: 'https://aixcaller.com',
  };
}
