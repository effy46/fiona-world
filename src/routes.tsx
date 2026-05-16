import type { RouteRecord } from 'vite-react-ssg';
import { App } from './App';

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <App />,
    entry: 'src/App.tsx',
    children: [
      { index: true, element: null },
      { path: 'projects', element: null },
      { path: 'skills', element: null },
      { path: 'thoughts', element: null },
      { path: 'contact', element: null },
      { path: 'standard', element: null },
    ],
  },
];
