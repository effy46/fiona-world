import { create } from 'zustand';
import type { SectionId } from '../content/portfolio';

export type CrankId = 'projects' | 'skills' | 'thoughts' | 'contact';

type WorldState = {
  activeSection: SectionId;
  audioEnabled: boolean;
  crankAngles: Record<CrankId, number>;
  solvedEdges: Record<CrankId, boolean>;
  setActiveSection: (section: SectionId) => void;
  setAudioEnabled: (enabled: boolean) => void;
  rotateCrank: (id: CrankId, delta: number) => number;
  setCrankAngle: (id: CrankId, angle: number) => void;
};

const targets: Record<CrankId, number> = {
  projects: 90,
  skills: 180,
  thoughts: 270,
  contact: 135,
};

function normalize(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function solved(id: CrankId, angle: number) {
  const target = targets[id];
  const diff = Math.abs(normalize(angle) - target);
  return Math.min(diff, 360 - diff) <= 8;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  activeSection: 'entry',
  audioEnabled: false,
  crankAngles: {
    projects: 0,
    skills: 45,
    thoughts: 90,
    contact: 225,
  },
  solvedEdges: {
    projects: false,
    skills: false,
    thoughts: false,
    contact: false,
  },
  setActiveSection: (activeSection) => set({ activeSection }),
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  rotateCrank: (id, delta) => {
    const next = normalize(get().crankAngles[id] + delta);
    set((state) => ({
      crankAngles: { ...state.crankAngles, [id]: next },
      solvedEdges: { ...state.solvedEdges, [id]: solved(id, next) },
    }));
    return next;
  },
  setCrankAngle: (id, angle) => {
    const next = normalize(angle);
    set((state) => ({
      crankAngles: { ...state.crankAngles, [id]: next },
      solvedEdges: { ...state.solvedEdges, [id]: solved(id, next) },
    }));
  },
}));

export const crankTargets = targets;
