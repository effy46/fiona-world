import { Vector3 } from 'three';
import type { CrankId } from '../store/worldStore';
import type { SectionId } from '../content/portfolio';

export type NodeId = 'entry' | 'hub' | 'projects' | 'skills' | 'thoughts' | 'contact';

export type PathSegment = {
  id: CrankId;
  from: NodeId;
  to: NodeId;
  points: Vector3[];
};

export const nodePositions: Record<NodeId, Vector3> = {
  entry: new Vector3(-4.2, 2.05, 0),
  hub: new Vector3(-1.65, 1.35, 0),
  projects: new Vector3(1.35, 1.85, -1.4),
  skills: new Vector3(1.25, 1.1, 1.65),
  thoughts: new Vector3(3.65, 2.35, -0.2),
  contact: new Vector3(4.95, 2.85, 1.75),
};

export const sectionNodes: Record<SectionId, NodeId> = {
  entry: 'entry',
  projects: 'projects',
  skills: 'skills',
  thoughts: 'thoughts',
  contact: 'contact',
};

export const nodeSections: Partial<Record<NodeId, SectionId>> = {
  entry: 'entry',
  projects: 'projects',
  skills: 'skills',
  thoughts: 'thoughts',
  contact: 'contact',
};

export const pathSegments: PathSegment[] = [
  {
    id: 'projects',
    from: 'hub',
    to: 'projects',
    points: [
      nodePositions.hub,
      new Vector3(-0.45, 1.35, -0.28),
      new Vector3(0.46, 1.72, -0.88),
      nodePositions.projects,
    ],
  },
  {
    id: 'skills',
    from: 'hub',
    to: 'skills',
    points: [
      nodePositions.hub,
      new Vector3(-0.4, 1.12, 0.62),
      new Vector3(0.44, 1.1, 1.42),
      nodePositions.skills,
    ],
  },
  {
    id: 'thoughts',
    from: 'projects',
    to: 'thoughts',
    points: [
      nodePositions.projects,
      new Vector3(2.16, 1.96, -1.16),
      new Vector3(2.85, 2.22, -0.72),
      nodePositions.thoughts,
    ],
  },
  {
    id: 'contact',
    from: 'skills',
    to: 'contact',
    points: [
      nodePositions.skills,
      new Vector3(2.18, 1.54, 1.74),
      new Vector3(3.42, 2.1, 1.68),
      nodePositions.contact,
    ],
  },
];

export const entryPath = [
  nodePositions.entry,
  new Vector3(-3.35, 1.82, 0),
  new Vector3(-2.42, 1.35, 0),
  nodePositions.hub,
];
