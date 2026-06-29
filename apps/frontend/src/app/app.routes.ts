import { Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

export const routes: Routes = [
  {
    path: 'v/:id',
    loadComponent: () =>
      import('./features/video/player/player.component').then(
        (m) => m.PlayerComponent
      ),
  },
  {
    path: 'r',
    loadComponent: () =>
      import('./features/media/random.component').then(
        (m) => m.RandomMediaComponent
      ),
  },
  {
    path: 'poll',
    loadComponent: () =>
      import('./features/poll/poll.component').then((m) => m.PollComponent),
  },
  { path: '**', component: EmptyComponent },
];
