import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const site = 'https://ffeng.github.io/fiona-world';

const routes = [
  {
    path: '/',
    title: 'Fiona Feng | Analytics Engineer',
    description:
      'Fiona Feng is an analytics engineer building trusted data products, validation frameworks, and AI-augmented workflows.',
  },
  {
    path: '/projects',
    title: 'Projects | Fiona Feng',
    description:
      'Selected public-safe analytics engineering projects: parity validation, planning platform migration, and AI-augmented analytics workflows.',
  },
  {
    path: '/skills',
    title: 'Skills | Fiona Feng',
    description:
      'Fiona Feng skills placeholders covering SQL, Snowflake, data modeling, validation tooling, dashboards, Python, and AI workflows.',
  },
  {
    path: '/thoughts',
    title: 'Case Study | Fiona Feng',
    description:
      'Case study placeholder: Cross-System Parity Validation and a clean-day gate for migration quality.',
  },
  {
    path: '/contact',
    title: 'Contact | Fiona Feng',
    description:
      'Contact placeholders for Fiona Feng: public email, LinkedIn, GitHub, and optional time-zone line.',
  },
  {
    path: '/standard',
    title: 'Fiona Feng | Analytics Engineer',
    description:
      'Static accessible portfolio page for Fiona Feng, analytics engineer building trusted data products and validation workflows.',
  },
];

function routeFile(path) {
  return path === '/' ? join(dist, 'index.html') : join(dist, path.slice(1), 'index.html');
}

function injectHead(html, route) {
  const canonical = `${site}${route.path === '/' ? '/' : route.path}`;
  const tags = [
    `<title>${route.title}</title>`,
    `<meta name="description" content="${route.description}">`,
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${route.title}">`,
    `<meta property="og:description" content="${route.description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:site_name" content="Fiona Feng">`,
  ].join('\n    ');

  let next = html.replace(/<title>.*?<\/title>/, '');
  next = next.replace(/<meta name="description"[^>]*>/g, '');
  next = next.replace(/<link rel="canonical"[^>]*>/g, '');
  next = next.replace(/<meta property="og:[^"]+"[^>]*>/g, '');
  return next.replace('</head>', `    ${tags}\n  </head>`);
}

if (!existsSync(dist)) {
  throw new Error('dist does not exist. Run build first.');
}

for (const route of routes) {
  const file = routeFile(route.path);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  writeFileSync(file, injectHead(html, route));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${site}${route.path === '/' ? '/' : route.path}</loc>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync(join(dist, 'sitemap.xml'), sitemap);
writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`,
);

for (const route of routes) {
  if (route.path === '/') continue;
  const file = routeFile(route.path);
  if (!existsSync(file) && existsSync(join(dist, 'index.html'))) {
    mkdirSync(dirname(file), { recursive: true });
    const html = injectHead(readFileSync(join(dist, 'index.html'), 'utf8'), route);
    writeFileSync(file, html);
  }
}
