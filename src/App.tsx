import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Seo } from './components/Seo';
import { SectionPanel } from './components/SectionPanel';
import { StaticView } from './components/StaticView';
import { portfolioSections, sectionById, sectionForPath, type SectionId } from './content/portfolio';
import { assetPath } from './lib/paths';
import { canUseWebGL } from './lib/webgl';
import { useWorldStore } from './store/worldStore';
import { WorldScene } from './three/WorldScene';

function useShouldUseStaticView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWebgl(canUseWebGL());
  }, []);

  const forcedStandard =
    location.pathname === '/standard' ||
    (mounted && new URLSearchParams(window.location.search).get('view') === 'standard');

  return !mounted || forcedStandard || !webgl;
}

function InteractiveView() {
  const location = useLocation();
  const activeSection = useWorldStore((state) => state.activeSection);
  const setActiveSection = useWorldStore((state) => state.setActiveSection);

  useEffect(() => {
    setActiveSection(sectionForPath(location.pathname).id);
  }, [location.pathname, setActiveSection]);

  const selected = useMemo(() => sectionById[activeSection], [activeSection]);

  function openSection(section: SectionId) {
    setActiveSection(section);
    navigate(sectionById[section].route);
  }

  return (
    <main id="main-content" className="interactive-shell">
      <section className="hero-stage" aria-labelledby="hero-title">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
        >
          <p className="eyebrow">Hello, I am Fiona.</p>
          <h1 id="hero-title">I turn data into clarity and impact</h1>
          <p>
            Analytics engineer building trusted data products, validation frameworks, and
            AI-augmented workflows.
          </p>
          <div className="hero-actions">
            <a href="/projects" onClick={(event) => {
              event.preventDefault();
              openSection('projects');
            }}>
              View My Work
            </a>
            <a href={assetPath('/resume.pdf')} target="_blank" rel="noreferrer">
              Download Resume
            </a>
          </div>
        </motion.div>
        <ErrorBoundary fallback={<StaticView />}>
          <WorldScene onSectionOpen={openSection} />
        </ErrorBoundary>
        <SectionPanel section={selected} />
      </section>
      <section className="quick-sections" aria-label="Portfolio section shortcuts">
        {portfolioSections.map((section) => (
          <a
            key={section.id}
            href={section.route}
            onClick={(event) => {
              event.preventDefault();
              openSection(section.id);
            }}
          >
            <span>{section.worldLabel}</span>
            <strong>{section.navLabel}</strong>
          </a>
        ))}
      </section>
    </main>
  );
}

export function App() {
  const location = useLocation();
  const staticView = useShouldUseStaticView();

  return (
    <HelmetProvider>
      <Seo pathname={location.pathname} />
      <Header />
      {staticView ? <StaticView /> : <InteractiveView />}
    </HelmetProvider>
  );
}
