import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { ResetPasswordComponent } from './reset-password';
import { AppConfigService } from '../../core/config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

const CONFIRM_URL = `${TEST_API_URL}/api/v1/auth/password-reset/confirm`;

describe('ResetPasswordComponent (HU-004)', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  async function create(token?: string) {
    fixture = TestBed.createComponent(ResetPasswordComponent);
    if (token !== undefined) fixture.componentRef.setInput('token', token);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function type(id: string, value: string) {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(password: string, confirm = password) {
    type('new-password', password);
    type('confirm-password', confirm);
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const submitButton = () => el.querySelector('[data-testid="reset-submit"]') as HTMLButtonElement;

  it('sin token muestra el estado de enlace no válido con opción de solicitar otro', async () => {
    await create();
    const banner = el.querySelector('[data-testid="reset-invalid-token"]');
    expect(banner?.closest('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="request-new-link"]')?.getAttribute('href')).toBe('/recuperar');
    expect(submitButton().disabled).toBe(true);
  });

  it('ignora el token heredado en sessionStorage', async () => {
    sessionStorage.setItem('fcv.reset-token', 'legacy');
    await create();
    await submit('NuevaClave1');
    http.expectNone(CONFIRM_URL);
  });

  it('no incluye la barra de demostración de estados', async () => {
    await create('tok');
    expect(el.textContent).not.toContain('Demo de Estados UX');
  });

  it('valida requisitos y coincidencia en cliente', async () => {
    await create('tok');
    await submit('corta');
    http.expectNone(CONFIRM_URL);
    expect(el.querySelector('[role="alert"] [data-testid="reset-error"]')?.textContent).toContain('requisitos de seguridad');

    await submit('NuevaClave1', 'NuevaClave2');
    http.expectNone(CONFIRM_URL);
    expect(el.querySelector('[data-testid="reset-error"]')?.textContent).toContain('no coinciden');
  });

  it('usa el token del query param, muestra carga y luego el diálogo de éxito', async () => {
    await create('tok-123');
    expect(el.querySelector('[data-testid="reset-invalid-token"]')).toBeNull();
    await submit('NuevaClave1');
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Actualizando seguridad');

    const req = http.expectOne(CONFIRM_URL);
    expect(req.request.body).toEqual({ token: 'tok-123', newPassword: 'NuevaClave1' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    const dialog = el.querySelector('[data-testid="reset-success"]');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');

    (el.querySelector('[data-testid="reset-go-login"]') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { aviso: 'contrasena-actualizada' } });
  });

  it('409 INVALID_RESET_TOKEN muestra el error accesible con enlace para pedir otro', async () => {
    await create('usado');
    await submit('NuevaClave1');
    http.expectOne(CONFIRM_URL).flush({ status: 409, code: 'INVALID_RESET_TOKEN' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    const banner = el.querySelector('[data-testid="reset-invalid-token"]');
    expect(banner).not.toBeNull();
    expect(banner?.closest('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="request-new-link"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="reset-success"]')).toBeNull();
  });

  it('errores de red se muestran en la alerta del formulario', async () => {
    await create('tok');
    await submit('NuevaClave1');
    http.expectOne(CONFIRM_URL).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="reset-error"]')?.textContent).toContain('conectar con el servidor');
    expect(submitButton().disabled).toBe(false);
  });
});
