import { useEffect, useState } from 'react';

// Plain warm LOADING SHIELD only. The real opening is IN-SCENE: the 3D notebook itself sits
// closed on the desk and its front cover swings open (see OpeningDirector in CatLab.tsx) —
// ONE notebook, one camera, no overlay book. This div just hides the first unstyled frames
// while textures load, then fades out when CatLab signals ready (the closed 3D notebook is
// what it reveals). "opening..." appears only if loading drags on.
const SLOW_LINE_MS = 1300;

type NotebookOpeningProps = {
  active: boolean;
};

export function NotebookOpening({ active }: NotebookOpeningProps) {
  const [showLine, setShowLine] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setShowLine(true), SLOW_LINE_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <div className={`notebook-opening${active ? '' : ' notebook-opening--done'}`} aria-hidden={!active}>
      <p className={`notebook-opening__line${showLine && active ? ' notebook-opening__line--visible' : ''}`}>opening...</p>
    </div>
  );
}
