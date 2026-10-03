import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { SessionStore } from './core/auth/session.store';
import { AppConfigService } from './core/config/app-config.service';
import { routes } from './app.routes';
import { TEST_API_URL, loginResponse } from './testing/fixtures';

@Component({ template: '' })
class BlankComponent {}

describe('App', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'inicio', component: BlankComponent },
          { path: 'perfil', component: BlankComponent },
          { path: 'login', component: BlankComponent },
        ]),
      ],
    }).compileComponents();
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
  });

  afterEach(() => sessionStorage.clear());

  it('no contiene el selector rápido de pantallas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Navegador de Pantallas"]')).toBeNull();
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });

  it('muestra solo las opciones de navegación permitidas por el rol', async () => {
    TestBed.inject(SessionStore).start(loginResponse(['USER']));
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/inicio');
    await fixture.whenStable();
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).map((a) => a.lastElementChild?.textContent?.trim());
    expect(labels).toEqual(['Inicio', 'Solicitar', 'Mis citas', 'Perfil']);
  });

  it('un ADMIN ve Operación y Perfil, no las opciones de paciente', async () => {
    TestBed.inject(SessionStore).start(loginResponse(['ADMIN']));
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/perfil');
    await fixture.whenStable();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/operacion', '/perfil']);
  });

  it('sin sesión no muestra la barra de navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/login');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')).toBeNull();
  });
});

describe('app.routes', () => {
  it('declara las rutas de la Ola A con guards', () => {
    const byPath = new Map(routes.map((r) => [r.path, r]));
    for (const path of ['login', 'registro', 'recuperar', 'restablecer', 'inicio', 'reservar', 'mis-citas', 'perfil', 'operacion', 'no-autorizado', '**']) {
      expect(byPath.has(path)).toBe(true);
    }
    expect(byPath.get('operacion')?.data?.['roles']).toEqual(['ADMIN', 'PROFESSIONAL']);
    expect(byPath.get('inicio')?.data?.['roles']).toEqual(['USER']);
    expect(byPath.get('login')?.canActivate?.length).toBe(1);
  });
});
