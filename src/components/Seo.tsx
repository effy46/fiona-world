import { Helmet } from 'react-helmet-async';
import { sectionForPath } from '../content/portfolio';
import { routeUrl } from '../content/seo';

type SeoProps = {
  pathname: string;
};

export function Seo({ pathname }: SeoProps) {
  const section = pathname === '/standard' ? sectionForPath('/') : sectionForPath(pathname);
  const url = routeUrl(pathname);

  return (
    <Helmet prioritizeSeoTags>
      <title>{section.metaTitle}</title>
      <meta name="description" content={section.metaDescription} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={section.metaTitle} />
      <meta property="og:description" content={section.metaDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Fiona Feng" />
    </Helmet>
  );
}
