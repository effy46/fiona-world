import { useState } from 'react';
import { ExternalLink, Github, Linkedin, Menu, Volume2, VolumeX, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { portfolioSections } from '../content/portfolio';
import { ensureAudio } from '../lib/audio';
import { assetPath } from '../lib/paths';
import { useWorldStore } from '../store/worldStore';

export function Header() {
  const [open, setOpen] = useState(false);
  const audioEnabled = useWorldStore((state) => state.audioEnabled);
  const setAudioEnabled = useWorldStore((state) => state.setAudioEnabled);
  const setActiveSection = useWorldStore((state) => state.setActiveSection);
  const navigate = useNavigate();
  const location = useLocation();

  async function toggleAudio() {
    if (!audioEnabled) await ensureAudio();
    setAudioEnabled(!audioEnabled);
  }

  function go(route: string) {
    const section = portfolioSections.find((item) => item.route === route);
    if (section) setActiveSection(section.id);
    setOpen(false);
    navigate(route);
  }

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <button
        className="mobile-menu"
        type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <Link className="brand" to="/" onClick={() => setActiveSection('entry')}>
        <span>FIONA FENG</span>
        <small>Analytics Engineer</small>
      </Link>
      <nav className="desktop-nav" aria-label="Primary">
        <div className="explore-wrap">
          <button
            className="nav-trigger"
            type="button"
            aria-expanded={open}
            aria-controls="explore-menu"
            onClick={() => setOpen((value) => !value)}
          >
            Explore
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                className="explore-menu"
                id="explore-menu"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                {portfolioSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      aria-current={location.pathname === section.route ? 'page' : undefined}
                      key={section.id}
                      type="button"
                      onClick={() => go(section.route)}
                    >
                      <Icon size={16} />
                      {section.navLabel}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <a href={assetPath('/resume.pdf')} target="_blank" rel="noreferrer">
          Resume
        </a>
        <a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub placeholder">
          <Github size={18} />
        </a>
        <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn placeholder">
          <Linkedin size={18} />
        </a>
        <button
          className="icon-button"
          type="button"
          onClick={toggleAudio}
          aria-label={audioEnabled ? 'Mute musical audio' : 'Enable musical audio'}
          title={audioEnabled ? 'Mute musical audio' : 'Enable musical audio'}
        >
          {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <Link className="standard-link" to="/standard?view=standard">
          Standard <ExternalLink size={13} />
        </Link>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.nav
            className="mobile-drawer"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
          >
            {portfolioSections.map((section) => (
              <button key={section.id} type="button" onClick={() => go(section.route)}>
                {section.navLabel}
              </button>
            ))}
            <a href={assetPath('/resume.pdf')} target="_blank" rel="noreferrer">
              Resume
            </a>
            <a href="https://github.com/" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
