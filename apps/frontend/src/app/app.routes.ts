import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'admin/upload',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/upload/upload.component').then(
        (m) => m.UploadComponent
      ),
  },
  {
    path: 'v/:id',
    loadComponent: () =>
      import('./features/video/player/player.component').then(
        (m) => m.PlayerComponent
      ),
  },
  { path: '**', redirectTo: 'admin' },
];
