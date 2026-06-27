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
  { path: '**', component: EmptyComponent },
];
