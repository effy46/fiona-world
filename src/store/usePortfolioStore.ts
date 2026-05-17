import { create } from 'zustand';
import type { SceneId, RotatorState } from '../content/scene-graph';

type CharacterPosition = {
  waypointId: string;
  x: number;
  y: number;
};

type PortfolioStore = {
  activeSection: SceneId;
  audioEnabled: boolean;
  entryRotatorState: RotatorState;
  characterPosition: CharacterPosition;
  crankSolved: boolean;
  setActiveSection: (section: SceneId) => void;
  toggleAudio: () => void;
  setEntryRotatorState: (state: RotatorState) => void;
  moveCharacter: (position: CharacterPosition) => void;
};

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  activeSection: 'entry',
  audioEnabled: false,
  entryRotatorState: 0,
  characterPosition: { waypointId: 'entry-base', x: 33, y: 87 },
  crankSolved: false,
  setActiveSection: (section) => set({ activeSection: section }),
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
  setEntryRotatorState: (entryRotatorState) => set({ entryRotatorState, crankSolved: entryRotatorState === 1 }),
  moveCharacter: (characterPosition) => set({ characterPosition })
}));
