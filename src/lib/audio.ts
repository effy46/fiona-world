import type * as ToneType from 'tone';
import type { CrankId } from '../store/worldStore';

type ToneModule = typeof ToneType;

type AudioState = {
  tone?: ToneModule;
  step?: ToneType.Synth;
  crank?: ToneType.Synth;
  solve?: ToneType.PolySynth;
  drone?: ToneType.AMSynth;
};

const state: AudioState = {};
const pentatonic = ['C5', 'D5', 'E5', 'G5', 'A5'];
const crankNotes = ['C4', 'Db4', 'D4', 'Eb4', 'E4', 'G4', 'A4', 'Bb4'];

export async function ensureAudio() {
  if (!state.tone) {
    const tone = await import('tone');
    state.tone = tone;
    state.step = new tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.06, sustain: 0.04, release: 0.22 },
    }).toDestination();
    state.crank = new tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.05, release: 0.18 },
    }).toDestination();
    state.solve = new tone.PolySynth(tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.03, decay: 0.36, sustain: 0.12, release: 1.1 },
    }).toDestination();
    state.drone = new tone.AMSynth({
      harmonicity: 1.35,
      envelope: { attack: 0.28, decay: 0.3, sustain: 0.25, release: 1.4 },
    }).toDestination();
    tone.Destination.volume.value = -16;
  }

  if (state.tone.context.state !== 'running') {
    await state.tone.start();
  }
}

export function playStep(enabled: boolean) {
  if (!enabled || !state.tone) return;
  const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
  state.step?.triggerAttackRelease(note, '16n');
}

export function playCrank(enabled: boolean, angle: number) {
  if (!enabled || !state.tone) return;
  const index = Math.round(angle / 45) % crankNotes.length;
  state.crank?.triggerAttackRelease(crankNotes[index], '32n');
}

export function playSolve(enabled: boolean, id: CrankId) {
  if (!enabled || !state.tone) return;
  const rootByCrank: Record<CrankId, string[]> = {
    projects: ['C4', 'E4', 'G4'],
    skills: ['D4', 'G4', 'A4'],
    thoughts: ['Eb4', 'G4', 'Bb4'],
    contact: ['F4', 'A4', 'C5'],
  };
  const now = state.tone.now();
  state.solve?.triggerAttackRelease(rootByCrank[id], '2n', now);
  state.drone?.triggerAttackRelease(rootByCrank[id][0], '1n', now + 0.04);
}
