import { useEffect } from 'react';

type NotebookOpeningProps = {
  active: boolean;
};

export function NotebookOpening({ active }: NotebookOpeningProps) {
  // The shield lives in index.html so feedback precedes the JavaScript and scene assets.
  // Readiness reveals the closed 3D notebook; opening it remains the visitor's choice.
  useEffect(() => {
    const loader = document.getElementById('notebook-loading')!;
    loader.dataset.state = active ? 'loading' : 'done';
    loader.setAttribute('aria-hidden', String(!active));
    return () => {
      // An error boundary must be able to reveal its retry controls.
      loader.dataset.state = 'done';
      loader.setAttribute('aria-hidden', 'true');
    };
  }, [active]);
  return null;
}
