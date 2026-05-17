import { ChevronDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { gitHubHref, linkedInHref, portfolioSections, resumeHref } from '../content/portfolio';
import { usePortfolioStore } from '../store/usePortfolioStore';

export function Header() {
  const [open, setOpen] = useState(false);
  const requestNavigation = usePortfolioStore((state) => state.requestNavigation);
  const activeSection = usePortfolioStore((state) => state.activeSection);

  return (
    <header className="site-header">
      <button
        className="brand"
        type="button"
        aria-label="Fiona Feng home"
        onClick={() => requestNavigation('entry')}
      >
        <span>FIONA FENG</span>
        <small>Analytics Engineer</small>
      </button>
      <nav className="nav-actions" aria-label="Primary">
        <div className="dropdown-wrap">
          <button className="nav-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
            Explore <ChevronDown size={14} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                className="explore-menu"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {portfolioSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.id === activeSection;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={isActive ? 'is-active' : undefined}
                      onClick={() => {
                        setOpen(false);
                        if (!isActive) requestNavigation(section.id);
                      }}
                    >
                      <Icon size={16} /> {section.shortLabel}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <a className="nav-button" href={resumeHref} target="_blank" rel="noreferrer">Resume</a>
        <a className="nav-button external-link" href={gitHubHref} aria-label="GitHub">
          GitHub <ExternalLink size={13} />
        </a>
        <a className="nav-button external-link" href={linkedInHref} aria-label="LinkedIn">
          LinkedIn <ExternalLink size={13} />
        </a>
      </nav>
    </header>
  );
}
