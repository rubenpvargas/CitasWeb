import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { SessionStore } from './core/auth/session.store';
import { roleHome } from './core/auth/role-home';
import { Role } from './core/api/api.types';
import { operationsHome } from './components/operations/operations-links';

const USER_ONLY: Role[] = ['USER'];
const OPERATIONS: Role[] = ['ADMIN', 'PROFESSIONAL'];
const ADMIN_ONLY: Role[] = ['ADMIN'];
const PROFESSIONAL_ONLY: Role[] = ['PROFESSIONAL'];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const session = inject(SessionStore);
      return session.hasValidSession() ? roleHome(session.roles()) : '/login';
    },
  },
  {
    path: 'login',
    title: 'Iniciar sesión | Portal de Citas HIC | FCV',
    canActivate: [guestGuard],
    loadComponent: () => import('./components/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta | Portal de Citas HIC | FCV',
    canActivate: [guestGuard],
    loadComponent: () => import('./components/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña | Portal de Citas HIC | FCV',
    loadComponent: () =>
      import('./components/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'restablecer',
    title: 'Crear nueva contraseña | Portal de Citas HIC | FCV',
    loadComponent: () =>
      import('./components/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'inicio',
    title: 'Inicio | Portal de Citas HIC | FCV',
    canActivate: [authGuard, roleGuard],
    data: { roles: USER_ONLY },
    loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'reservar',
    title: 'Solicitar cita | Portal de Citas HIC | FCV',
    canActivate: [authGuard, roleGuard],
    data: { roles: USER_ONLY },
    loadComponent: () => import('./components/booking/booking').then((m) => m.BookingComponent),
  },
  {
    path: 'mis-citas',
    title: 'Mis citas | Portal de Citas HIC | FCV',
    canActivate: [authGuard, roleGuard],
    data: { roles: USER_ONLY },
    loadComponent: () => import('./components/appointments/appointments').then((m) => m.AppointmentsComponent),
  },
  {
    path: 'perfil',
    title: 'Mi perfil | Portal de Citas HIC | FCV',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile').then((m) => m.ProfileComponent),
  },
  {
    path: 'operacion',
    title: 'Operación | Portal de Citas HIC | FCV',
    canActivate: [authGuard, roleGuard],
    data: { roles: OPERATIONS },
    loadComponent: () => import('./components/operations/operations').then((m) => m.OperationsComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => operationsHome(inject(SessionStore).roles()),
      },
      {
        path: 'bandeja',
        title: 'Bandeja | Operación | Portal de Citas HIC | FCV',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY },
        loadComponent: () => import('./components/operations/inbox/inbox').then((m) => m.InboxComponent),
      },
      {
        path: 'eps',
        title: 'EPS y planes | Operación | Portal de Citas HIC | FCV',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY },
        loadComponent: () => import('./components/operations/eps/eps-admin').then((m) => m.EpsAdminComponent),
      },
      {
        path: 'especialidades',
        title: 'Especialidades | Operación | Portal de Citas HIC | FCV',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY },
        loadComponent: () => import('./components/operations/specialties/specialties-admin').then((m) => m.SpecialtiesAdminComponent),
      },
      {
        path: 'profesionales',
        title: 'Profesionales | Operación | Portal de Citas HIC | FCV',
        canActivate: [roleGuard],
        data: { roles: ADMIN_ONLY },
        loadComponent: () => import('./components/operations/professionals/professionals-admin').then((m) => m.ProfessionalsAdminComponent),
      },
      {
        path: 'agenda',
        title: 'Agenda | Operación | Portal de Citas HIC | FCV',
        canActivate: [roleGuard],
        data: { roles: PROFESSIONAL_ONLY },
        loadComponent: () => import('./components/operations/agenda/agenda').then((m) => m.AgendaComponent),
      },
    ],
  },
  {
    path: 'no-autorizado',
    title: 'Acceso no autorizado | Portal de Citas HIC | FCV',
    loadComponent: () => import('./components/forbidden/forbidden').then((m) => m.ForbiddenComponent),
  },
  { path: '**', redirectTo: '' },
];
