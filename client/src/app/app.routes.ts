import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'appointments' },
  {
    path: 'appointments',
    loadComponent: () => import('./appointments/appointment-list').then((m) => m.AppointmentList),
  },
  {
    path: 'appointments/new',
    data: { mode: 'create' },
    loadComponent: () =>
      import('./appointments/appointment-editor').then((m) => m.AppointmentEditor),
  },
  {
    path: 'appointments/:id',
    loadComponent: () =>
      import('./appointments/appointment-editor').then((m) => m.AppointmentEditor),
  },
  { path: '**', redirectTo: 'appointments' },
];
