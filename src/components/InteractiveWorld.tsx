import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioSections, resumeHref } from '../content/portfolio';
import { getSceneView, sceneGraph, type SceneId, type RotatorState, type Waypoint } from '../content/scene-graph';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { playCrank, playStep } from '../lib/audio';
import { Crank } from './crank/Crank';
import { MousePointer2 } from 'lucide-react';

type InteractiveWorldProps = {
  activeSection: SceneId;
};

type WorldTransition = {
  key: number;
  from: SceneId;
  to: SceneId;
  label: string;
};

type EdgeLine = {
  id: string;
  from: string;
  to: string;
};

const routeForScene = (sceneId: SceneId) => portfolioSections.find((item) => item.id === sceneId)?.route ?? '/';

const entranceWaypointId: Record<SceneId, string> = {
  entry: 'entry-base',
  projects: 'projects-entrance',
  skills: 'skills-entrance',
  thoughts: 'thoughts-entrance',
  contact: 'contact-entrance'
};

const entryStateForScene: Partial<Record<SceneId, RotatorState>> = {
  projects: 1,
  skills: 2,
  thoughts: 3
};

function getWaypoint(id: string) {
  return sceneGraph.waypoints.find((point) => point.id === id);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function getSceneEntrance(sceneId: SceneId) {
  return getWaypoint(entranceWaypointId[sceneId]);
}

export function InteractiveWorld({ activeSection }: InteractiveWorldProps) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  const [characterFacing, setCharacterFacing] = useState<'front' | 'bridge'>('front');
  const [worldTransition, setWorldTransition] = useState<WorldTransition | null>(null);
  const previousSectionRef = useRef(activeSection);
  const entryRotatorState = usePortfolioStore((state) => state.entryRotatorState);
  const setEntryRotatorState = usePortfolioStore((state) => state.setEntryRotatorState);
  const characterPosition = usePortfolioStore((state) => state.characterPosition);
  const moveCharacter = usePortfolioStore((state) => state.moveCharacter);
  const audioEnabled = usePortfolioStore((state) => state.audioEnabled);
  const section = portfolioSections.find((item) => item.id === activeSection) ?? portfolioSections[0];
  const sceneView = useMemo(() => getSceneView(activeSection, entryRotatorState), [activeSection, entryRotatorState]);
  const base = import.meta.env.BASE_URL;
  const bridgeOpen = activeSection === 'entry' && entryRotatorState === 1;

  useEffect(() => {
    const previous = previousSectionRef.current;
    if (previous !== activeSection) {
      const destination = getSceneEntrance(activeSection);
      setWorldTransition((current) => current ?? {
        key: Date.now(),
        from: previous,
        to: activeSection,
        label: portfolioSections.find((item) => item.id === activeSection)?.label ?? activeSection
      });
      window.setTimeout(() => {
        if (destination) moveCharacter({ waypointId: destination.id, x: destination.x, y: destination.y });
        setCharacterFacing('front');
      }, 240);
      window.setTimeout(() => setWorldTransition(null), 1080);
    }
    previousSectionRef.current = activeSection;
  }, [activeSection, moveCharacter]);

  if (imageFailed || reducedMotion) {
    return <StandardRedirect activeSection={activeSection} />;
  }

  const rotateEntry = (state: RotatorState) => {
    setEntryRotatorState(state);
    void playCrank(audioEnabled, state);
  };

  const crossToScene = (targetScene: SceneId, waypoint?: Waypoint) => {
    const label = portfolioSections.find((item) => item.id === targetScene)?.label ?? targetScene;
    setWorldTransition({ key: Date.now(), from: activeSection, to: targetScene, label });
    setCharacterFacing(targetScene === 'entry' ? 'front' : 'bridge');
    if (waypoint) moveCharacter({ waypointId: waypoint.id, x: waypoint.x, y: waypoint.y });
    void playStep(audioEnabled);
    window.setTimeout(() => navigate(routeForScene(targetScene)), 720);
    window.setTimeout(() => {
      setWorldTransition(null);
      setCharacterFacing('front');
    }, 1320);
  };

  const handleHotspot = (hotspotId: string) => {
    const hotspot = sceneGraph.hotspots.find((spot) => spot.id === hotspotId);
    if (!hotspot) return;

    const target = hotspot.waypointId ? getWaypoint(hotspot.waypointId) : undefined;
    if (target) {
      setCharacterFacing('front');
      moveCharacter({ waypointId: target.id, x: target.x, y: target.y });
      void playStep(audioEnabled);
    }
    if (hotspot.id === 'entry-press-button') {
      window.setTimeout(() => rotateEntry(1), 850);
      return;
    }
    if (hotspot.targetScene && hotspot.targetScene !== activeSection) {
      window.setTimeout(() => crossToScene(hotspot.targetScene as SceneId, target), 330);
    }
  };

  // Walk to a waypoint, return promise that resolves after the lerp completes.
  const STEP_MS = 600;
  const walkTo = async (waypointId: string) => {
    const wp = getWaypoint(waypointId);
    if (!wp) return;
    setCharacterFacing('front');
    moveCharacter({ waypointId: wp.id, x: wp.x, y: wp.y });
    void playStep(audioEnabled);
    await delay(STEP_MS);
  };

  const startProjectsPath = async () => {
    if (activeSection !== 'entry') {
      navigate('/projects');
      return;
    }
    // Cinematic: walk Fiona along the path. State-0: base → stairs → mid → walkway end → red button.
    // Then rotate. State-1: bridge appears, Fiona walks across to Projects portal.
    if (entryRotatorState === 0) {
      await walkTo('entry-stairs');
      await walkTo('entry-platform-mid');
      await walkTo('entry-walkway-end');
      // Reach the button — trigger rotation.
      rotateEntry(1);
      await delay(700);
    }
    await walkTo('entry-bridge-start');
    await walkTo('entry-bridge-to-projects');
    // Transition to Projects section.
    crossToScene('projects', getWaypoint('entry-bridge-to-projects'));
  };

  return (
    <section className={`world-shell world-${activeSection}`} aria-labelledby="scene-title">
      <div className="scene-stage">
        <div className="scene-canvas">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={`${sceneView.sceneId}-${sceneView.state}`}
              className="scene-image"
              src={`${base}${sceneView.imageSrc}`}
              alt={`${section.label} isometric scene`}
              loading={activeSection === 'entry' ? 'eager' : 'lazy'}
              onError={() => setImageFailed(true)}
              initial={false}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.97, filter: 'blur(2px)' }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            />
          </AnimatePresence>
          <motion.div
            className={`character-marker facing-${characterFacing}`}
            initial={false}
            animate={{ left: `${characterPosition.x}%`, top: `${characterPosition.y}%` }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
            aria-hidden="true"
          >
            <img
              className="character-sprite"
              src={`${base}${characterFacing === 'bridge' ? 'character-bridge.png' : 'character.png'}`}
              alt=""
            />
          </motion.div>
          {/* Invisible hotspot click targets — no visual marker, just touch zones */}
          {sceneView.hotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              className={`hotspot-invisible`}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              type="button"
              onClick={() => handleHotspot(hotspot.id)}
              aria-label={hotspot.label}
            />
          ))}
          {activeSection === 'entry' && (
            <Crank
              state={entryRotatorState}
              x={sceneGraph.rotators[0].x}
              y={sceneGraph.rotators[0].y}
              onStateChange={rotateEntry}
            />
          )}
        </div>
      </div>
      <motion.aside
        className={`scene-panel${bridgeOpen ? ' panel-parked' : ''}`}
        initial={false}
        animate={{ opacity: bridgeOpen ? 0 : 1, x: bridgeOpen ? 430 : 0, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12 }}
      >
        <p>{section.eyebrow}</p>
        <h1 id="scene-title">{section.id === 'entry' ? section.title : section.label}</h1>
        <p className="panel-summary">{section.summary}</p>
        {section.id === 'entry' && (
          <div className="cta-row">
            <button className="primary-cta" type="button" onClick={startProjectsPath}>View My Work</button>
            <a className="secondary-cta" href={resumeHref} target="_blank" rel="noreferrer">Download Resume</a>
          </div>
        )}
        {section.projects && <ProjectList />}
        {section.bullets && <BulletList bullets={section.bullets} />}
      </motion.aside>
    </section>
  );
}

function InstructionPill() {
  return (
    <div className="instruction-pill" aria-hidden="true">
      <MousePointer2 size={23} strokeWidth={1.6} />
      <span>Click on the path to walk</span>
      <span>Click on a building to explore</span>
    </div>
  );
}

function PathOverlay({ waypoints, edges }: { waypoints: Waypoint[]; edges: EdgeLine[] }) {
  const points = new Map(waypoints.map((point) => [point.id, point]));

  return (
    <svg className="path-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {edges.map((edge) => {
        const from = points.get(edge.from);
        const to = points.get(edge.to);
        if (!from || !to) return null;
        return (
          <line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            pathLength={1}
          />
        );
      })}
      {waypoints.map((point) => <circle key={point.id} cx={point.x} cy={point.y} r={0.45} />)}
    </svg>
  );
}

function GateDial({ state }: { state: RotatorState }) {
  const activeTarget = Object.entries(entryStateForScene).find(([, targetState]) => targetState === state)?.[0] as SceneId | undefined;
  const label = activeTarget ? portfolioSections.find((item) => item.id === activeTarget)?.shortLabel : 'Home';

  return (
    <motion.div
      className="gate-dial"
      animate={{ rotate: state * 90 }}
      transition={{ duration: 0.62, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <span>{label}</span>
    </motion.div>
  );
}

function WorldTransitionOverlay({ transition }: { transition: WorldTransition }) {
  return (
    <motion.div
      key={transition.key}
      className={`world-transition transition-${transition.from}-to-${transition.to}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      aria-hidden="true"
    >
      <motion.div
        className="folding-bridge"
        initial={{ scaleX: 0, rotate: -9 }}
        animate={{ scaleX: 1, rotate: 0 }}
        exit={{ scaleX: 0.12, rotate: 9 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      />
      <motion.div
        className="transition-door"
        initial={{ scale: 0.72, rotateY: 70 }}
        animate={{ scale: 1, rotateY: 0 }}
        exit={{ scale: 1.15, rotateY: -70 }}
        transition={{ duration: 0.72, ease: 'easeInOut' }}
      >
        {transition.label}
      </motion.div>
      <motion.div
        className="transition-traveler"
        initial={{ x: '-34vw', y: '7vh', opacity: 0 }}
        animate={{ x: '0vw', y: 0, opacity: 1 }}
        exit={{ x: '34vw', y: '-7vh', opacity: 0 }}
        transition={{ duration: 0.78, ease: 'easeInOut' }}
      >
        <span />
      </motion.div>
    </motion.div>
  );
}

function StandardRedirect({ activeSection }: { activeSection: SceneId }) {
  return (
    <div className="standard-fallback">
      <StaticNotice />
      <StaticViewInline activeSection={activeSection} />
    </div>
  );
}

function StaticNotice() {
  return <p className="fallback-note">Standard view active.</p>;
}

function StaticViewInline({ activeSection }: { activeSection: SceneId }) {
  const section = portfolioSections.find((item) => item.id === activeSection) ?? portfolioSections[0];
  return (
    <section className="static-inline">
      <h1>{section.label}</h1>
      <p>{section.summary}</p>
    </section>
  );
}

function ProjectList() {
  const projects = portfolioSections.find((item) => item.id === 'projects')?.projects ?? [];
  return (
    <div className="project-stack">
      {projects.map((project) => (
        <article key={project.title}>
          <h2>{project.title}</h2>
          <p>{project.kicker}</p>
          <small>{project.tools.join(' / ')}</small>
        </article>
      ))}
    </div>
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="bullet-list">
      {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
    </ul>
  );
}
