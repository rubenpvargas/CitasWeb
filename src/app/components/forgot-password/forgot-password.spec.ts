import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password';
import { AppConfigService } from '../../core/config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

const REQUEST_URL = `${TEST_API_URL}/api/v1/auth/password-reset/request`;
const NEUTRAL = 'Si existe una cuenta asociada a este correo';

describe('ForgotPasswordComponent (HU-004)', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  async function submit(email: string) {
    const input = el.querySelector('#patient-email') as HTMLInputElement;
    input.value = email;
    input.dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('no trae un correo precargado', () => {
    expect((el.querySelector('#patient-email') as HTMLInputElement).value).toBe('');
  });

  it('valida el correo sin llamar a la API', async () => {
    await submit('no-es-correo');
    http.expectNone(REQUEST_URL);
    expect(el.querySelector('#patient-email-error')).not.toBeNull();
    expect(el.querySelector('#patient-email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('muestra estado de carga y luego el mensaje neutro (cuenta existente)', async () => {
    await submit('ana@example.test');
    const button = el.querySelector('[data-testid="forgot-submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Enviando enlace');

    const req = http.expectOne(REQUEST_URL);
    expect(req.request.body).toEqual({ email: 'ana@example.test' });
    req.flush({ message: 'If the account exists, a recovery token was generated' }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();

    const status = el.querySelector('[role="status"]');
    expect(status?.textContent).toContain(NEUTRAL);
    expect(el.querySelector('[data-testid="dev-link"]')).toBeNull();
  });

  it('muestra el mismo mensaje neutro para una cuenta inexistente', async () => {
    await submit('nadie@example.test');
    http.expectOne(REQUEST_URL).flush({ message: 'If the account exists, a recovery token was generated', developmentToken: null }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();
    expect(el.querySelector('[role="status"]')?.textContent).toContain(NEUTRAL);
    expect(el.querySelector('[data-testid="dev-link"]')).toBeNull();
  });

  it('en desarrollo ofrece el enlace etiquetado a /restablecer?token=... sin usar sessionStorage', async () => {
    await submit('ana@example.test');
    http.expectOne(REQUEST_URL).flush({ message: 'ok', developmentToken: 'abc123' }, { status: 202, statusText: 'Accepted' });
    await fixture.whenStable();
    const devLink = el.querySelector('[data-testid="dev-link"]');
    expect(devLink?.textContent).toContain('Enlace de desarrollo');
    expect(devLink?.querySelector('a')?.getAttribute('href')).toBe('/restablecer?token=abc123');
    expect(sessionStorage.getItem('fcv.reset-token')).toBeNull();
  });

  it('muestra errores de red/servidor de forma accesible en lugar de ocultarlos', async () => {
    await submit('ana@example.test');
    http.expectOne(REQUEST_URL).flush('boom', { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('error inesperado');
    expect(el.querySelector('[data-testid="forgot-success"]')).toBeNull();
    expect((el.querySelector('[data-testid="forgot-submit"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('reenviar vuelve a llamar a la API (sin contador simulado)', async () => {
    await submit('ana@example.test');
    http.expectOne(REQUEST_URL).flush({ message: 'ok' });
    await fixture.whenStable();
    expect(el.textContent).not.toMatch(/Reenviar en \d+s/);

    (el.querySelector('[data-testid="forgot-resend"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    const again = http.expectOne(REQUEST_URL);
    expect(again.request.body).toEqual({ email: 'ana@example.test' });
    again.flush({ message: 'ok' });
  });
});
