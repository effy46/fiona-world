import {
  BookOpen,
  BriefcaseBusiness,
  Flower2,
  Home,
  Mail,
  type LucideIcon,
} from 'lucide-react';

export type SectionId = 'entry' | 'projects' | 'skills' | 'thoughts' | 'contact';

export type Project = {
  title: string;
  kicker: string;
  tools: string[];
  todos: string[];
};

export type PortfolioSection = {
  id: SectionId;
  route: string;
  navLabel: string;
  worldLabel: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  icon: LucideIcon;
  accent: string;
  todos?: string[];
  projects?: Project[];
  caseStudy?: {
    title: string;
    subtitle: string;
    sections: string[];
  };
};

export const baseUrl = 'https://ffeng.github.io/fiona-world';

export const portfolioSections: PortfolioSection[] = [
  {
    id: 'entry',
    route: '/',
    navLabel: 'Home',
    worldLabel: 'Entry Tower',
    title: 'I turn data into clarity and impact',
    metaTitle: 'Fiona Feng | Analytics Engineer',
    metaDescription:
      'Fiona Feng is an analytics engineer building trusted data products, validation frameworks, and AI-augmented workflows.',
    summary:
      'Analytics engineer building trusted data products, validation frameworks, and AI-augmented workflows.',
    icon: Home,
    accent: '#e8a699',
  },
  {
    id: 'projects',
    route: '/projects',
    navLabel: 'Projects',
    worldLabel: 'Projects Hall',
    title: 'Projects Hall',
    metaTitle: 'Projects | Fiona Feng',
    metaDescription:
      'Selected public-safe analytics engineering projects: parity validation, planning platform migration, and AI-augmented analytics workflows.',
    summary: 'Selected work and projects I am proud of.',
    icon: BriefcaseBusiness,
    accent: '#b79acb',
    projects: [
      {
        title: 'Cross-System Parity Validation Framework',
        kicker: 'Automated comparison harness catching regressions before they ship.',
        tools: ['SQL', 'Python', 'dbt', 'Airflow', 'Snowflake'],
        todos: ['TODO: business impact line (waiting on public-safe phrasing)', 'TODO: architecture diagram'],
      },
      {
        title: 'Planning Platform Migration',
        kicker: 'Moving a fragile reporting surface into validated, testable data products.',
        tools: ['SQL', 'dbt', 'Snowflake'],
        todos: ['TODO: business impact line', 'TODO: before/after architecture diagram'],
      },
      {
        title: 'AI-Augmented Analytics Workflow',
        kicker:
          'Multi-agent loop (Claude + Codex + Cursor) for query authoring, review, and adversarial testing.',
        tools: ['Claude Code', 'Codex CLI', 'Cursor', 'custom prompts'],
        todos: ['TODO: workflow diagram'],
      },
    ],
  },
  {
    id: 'skills',
    route: '/skills',
    navLabel: 'Skills',
    worldLabel: 'Skills Garden',
    title: 'Skills Garden',
    metaTitle: 'Skills | Fiona Feng',
    metaDescription:
      'Fiona Feng skills placeholders covering SQL, Snowflake, data modeling, validation tooling, dashboards, Python, and AI workflows.',
    summary: 'Working toolkit for analytics engineering and data product reliability.',
    icon: Flower2,
    accent: '#82b7a8',
    todos: [
      'TODO: SQL + Snowflake depth marker',
      'TODO: Data modeling depth marker',
      'TODO: Pipeline QA / validation tooling',
      'TODO: Dashboard systems',
      'TODO: Python tooling',
      'TODO: AI-augmented workflow tooling',
    ],
  },
  {
    id: 'thoughts',
    route: '/thoughts',
    navLabel: 'Thoughts',
    worldLabel: 'Thoughts Corridor',
    title: 'Thoughts Corridor',
    metaTitle: 'Case Study | Fiona Feng',
    metaDescription:
      'Case study placeholder: Cross-System Parity Validation and a clean-day gate for migration quality.',
    summary: 'Writing and case-study space for public-safe technical storytelling.',
    icon: BookOpen,
    accent: '#d49b71',
    caseStudy: {
      title: 'Case Study: Cross-System Parity Validation',
      subtitle:
        'How we built a clean-day gate that blocked migration regressions before they hit prod.',
      sections: ['Context (TODO)', 'Approach (TODO)', 'Implementation (TODO)', 'Impact (TODO)', 'Takeaways (TODO)'],
    },
  },
  {
    id: 'contact',
    route: '/contact',
    navLabel: 'Contact',
    worldLabel: 'Contact Lighthouse',
    title: 'Contact Lighthouse',
    metaTitle: 'Contact | Fiona Feng',
    metaDescription:
      'Contact placeholders for Fiona Feng: public email, LinkedIn, GitHub, and optional time-zone line.',
    summary: 'TODO: public contact details.',
    icon: Mail,
    accent: '#86bfd0',
    todos: [
      'TODO: public email',
      'TODO: LinkedIn URL',
      'TODO: GitHub URL',
      'TODO: optional time-zone line',
    ],
  },
];

export const sectionById = Object.fromEntries(
  portfolioSections.map((section) => [section.id, section]),
) as Record<SectionId, PortfolioSection>;

export const routeToSectionId: Record<string, SectionId> = {
  '/': 'entry',
  '/projects': 'projects',
  '/skills': 'skills',
  '/thoughts': 'thoughts',
  '/contact': 'contact',
};

export function sectionForPath(pathname: string): PortfolioSection {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return sectionById[routeToSectionId[normalized] ?? 'entry'];
}
