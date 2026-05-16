import { baseUrl, portfolioSections } from './portfolio';

export const siteRoutes = [
  ...portfolioSections.map((section) => section.route),
  '/standard',
];

export function routeUrl(route: string) {
  return `${baseUrl}${route === '/' ? '/' : route}`;
}
