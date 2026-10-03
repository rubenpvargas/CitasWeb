import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { INVALID_CREDENTIALS_MESSAGE, LoginComponent } from './login';
import { AppConfigService } from '../../core/config/app-config.service';
import { SessionStore } from '../../core/auth/session.store';
import { TEST_API_URL, loginResponse } from '../../testing/fixtures';

const LOGIN_URL = `${TEST_API_URL}/api/v1/auth/login`;

describe('LoginComponent (HU-002)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function input(id: string): HTMLInputElement {
    return el.querySelector(`#${id}`) as HTMLInputElement;
  }

  async function fillAndSubmit(email: string, password: string) {
    input('email').value = email;
    input('email').dispatchEvent(new Event('input'));
    input('password').value = password;
    input('password').dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const submitButton = () => el.querySelector('[data-testid="login-submit"]') as HTMLButtonElement;

  it('no trae credenciales precargadas ni el acceso de demostración', () => {
    expect(input('email').value).toBe('');
    expect(input('password').value).toBe('');
    expect(el.textContent).not.toContain('cuenta de prueba');
  });

  it('tiene una región de alerta accesible siempre presente', () => {
    const region = el.querySelector('[role="alert"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('assertive');
  });

  it('valida campos sin llamar a la API', async () => {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectNone(LOGIN_URL);
    expect(el.querySelector('#email-error')).not.toBeNull();
    expect(input('email').getAttribute('aria-invalid')).toBe('true');
  });

  it('muestra estado de carga y deshabilita el envío mientras espera', async () => {
    await fillAndSubmit('paciente@example.test', 'ClaveSegura1');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Comprobando acceso');
    expect(el.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    http.expectOne(LOGIN_URL).flush(loginResponse(['USER']));
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(false);
  });

  it('USER: tras login correcto redirige a /inicio y guarda la sesión', async () => {
    await fillAndSubmit(' paciente@example.test ', 'ClaveSegura1');
    const req = http.expectOne(LOGIN_URL);
    expect(req.request.body).toEqual({ email: 'paciente@example.test', password: 'ClaveSegura1' });
    req.flush(loginResponse(['USER']));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(true);
  });

  it('ADMIN/PROFESSIONAL: redirige a /operacion', async () => {
    await fillAndSubmit('admin@example.test', 'ClaveSegura1');
    http.expectOne(LOGIN_URL).flush(loginResponse(['ADMIN']));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/operacion');
  });

  it('respeta un returnUrl interno y descarta uno externo', async () => {
    fixture.componentRef.setInput('returnUrl', '/mis-citas');
    await fillAndSubmit('paciente@example.test', 'ClaveSegura1');
    http.expectOne(LOGIN_URL).flush(loginResponse(['USER']));
    expect(router.navigateByUrl).toHaveBeenCalledWith('/mis-citas');

    fixture.componentRef.setInput('returnUrl', '//evil.test');
    await fillAndSubmit('paciente@example.test', 'ClaveSegura1');
    http.expectOne(LOGIN_URL).flush(loginResponse(['USER']));
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/inicio');
  });

  it('INVALID_CREDENTIALS muestra el mensaje genérico en la alerta y limpia la contraseña', async () => {
    await fillAndSubmit('paciente@example.test', 'mala');
    http.expectOne(LOGIN_URL).flush(
      { status: 401, code: 'INVALID_CREDENTIALS', title: 'Invalid credentials', detail: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Credenciales no reconocidas');
    expect(alert?.textContent).toContain(INVALID_CREDENTIALS_MESSAGE);
    expect(alert?.textContent).not.toContain('Invalid credentials');
    expect(input('password').value).toBe('');
    expect(submitButton().disabled).toBe(false);
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
  });

  it('error de red muestra un mensaje distinto y accesible', async () => {
    await fillAndSubmit('paciente@example.test', 'ClaveSegura1');
    http.expectOne(LOGIN_URL).error(new ProgressEvent('error'));
    await fixture.whenStable();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No fue posible iniciar sesión');
    expect(alert?.textContent).toContain('conectar con el servidor');
  });

  it('muestra el aviso de sesión expirada como estado accesible', async () => {
    fixture.componentRef.setInput('aviso', 'sesion-expirada');
    await fixture.whenStable();
    const notice = el.querySelector('[data-testid="login-notice"]');
    expect(notice?.getAttribute('role')).toBe('status');
    expect(notice?.textContent).toContain('Sesión expirada');
  });

  it('ignora avisos desconocidos', async () => {
    fixture.componentRef.setInput('aviso', '<script>');
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="login-notice"]')).toBeNull();
  });
});
