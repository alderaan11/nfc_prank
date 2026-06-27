import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'v/:id',
    loadComponent: () =>
      import('./features/video/player/player.component').then(
        (m) => m.PlayerComponent
      ),
  },
  { path: '**', redirectTo: 'v/not-found' },
];
