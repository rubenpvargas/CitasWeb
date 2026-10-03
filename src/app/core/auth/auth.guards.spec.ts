import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { SessionStore } from './session.store';
import { roleHome, safeReturnUrl } from './role-home';
import { loginResponse } from '../../testing/fixtures';

@Component({ template: 'page' })
class PageComponent {}

describe('guards', () => {
  let session: SessionStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: PageComponent, canActivate: [guestGuard] },
          { path: 'perfil', component: PageComponent, canActivate: [authGuard] },
          { path: 'inicio', component: PageComponent, canActivate: [authGuard, roleGuard], data: { roles: ['USER'] } },
          { path: 'operacion', component: PageComponent, canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN', 'PROFESSIONAL'] } },
          { path: 'no-autorizado', component: PageComponent },
        ]),
      ],
    });
    session = TestBed.inject(SessionStore);
  });

  afterEach(() => sessionStorage.clear());

  async function navigate(url: string): Promise<string> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it('authGuard envía a login con returnUrl si no hay sesión', async () => {
    expect(await navigate('/perfil')).toBe('/login?returnUrl=%2Fperfil');
  });

  it('authGuard permite el acceso con sesión vigente', async () => {
    session.start(loginResponse(['USER']));
    expect(await navigate('/perfil')).toBe('/perfil');
  });

  it('authGuard rechaza una sesión con refresh vencido', async () => {
    session.start({ ...loginResponse(), refreshExpiresAt: new Date(Date.now() - 1).toISOString() });
    expect(await navigate('/perfil')).toBe('/login?returnUrl=%2Fperfil');
    expect(session.isAuthenticated()).toBe(false);
  });

  it('roleGuard permite el rol requerido', async () => {
    session.start(loginResponse(['ADMIN']));
    expect(await navigate('/operacion')).toBe('/operacion');
  });

  it('roleGuard envía a no-autorizado sin el rol requerido', async () => {
    session.start(loginResponse(['USER']));
    expect(await navigate('/operacion')).toBe('/no-autorizado');
  });

  it('roleGuard sin sesión envía a login', async () => {
    expect(await navigate('/inicio')).toBe('/login?returnUrl=%2Finicio');
  });

  it('guestGuard permite login a visitantes', async () => {
    expect(await navigate('/login')).toBe('/login');
  });

  it('guestGuard redirige al inicio del rol si ya hay sesión', async () => {
    session.start(loginResponse(['PROFESSIONAL']));
    expect(await navigate('/login')).toBe('/operacion');
  });
});

describe('roleHome / safeReturnUrl', () => {
  it('elige el inicio por rol', () => {
    expect(roleHome(['USER'])).toBe('/inicio');
    expect(roleHome(['ADMIN'])).toBe('/operacion');
    expect(roleHome(['PROFESSIONAL', 'USER'])).toBe('/operacion');
    expect(roleHome([])).toBe('/perfil');
  });

  it('solo acepta returnUrl internos', () => {
    expect(safeReturnUrl('/mis-citas')).toBe('/mis-citas');
    expect(safeReturnUrl('//evil.test')).toBeNull();
    expect(safeReturnUrl('https://evil.test')).toBeNull();
    expect(safeReturnUrl('/login?x')).toBeNull();
    expect(safeReturnUrl(undefined)).toBeNull();
  });
});
