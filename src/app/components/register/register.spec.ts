import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RegisterComponent } from './register';
import { AppConfigService } from '../../core/config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

const REGISTER_URL = `${TEST_API_URL}/api/v1/auth/register`;

describe('RegisterComponent (HU-001)', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(id: string, value: string) {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function fillValid() {
    type('first-name', ' Ana ');
    type('last-name', 'Prueba Sintética');
    type('doc-number', '100200300');
    type('email', 'ana@example.test');
    type('phone', '3000000000');
    type('password', 'ClaveSegura1');
    type('confirm-password', 'ClaveSegura1');
    const terms = el.querySelector('#terms') as HTMLInputElement;
    terms.click();
  }

  async function submit() {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const submitButton = () => el.querySelector('[data-testid="register-submit"]') as HTMLButtonElement;
  const alertRegion = () => el.querySelector('[role="alert"]') as HTMLElement;

  it('no trae datos precargados', () => {
    expect((el.querySelector('#first-name') as HTMLInputElement).value).toBe('');
    expect((el.querySelector('#email') as HTMLInputElement).value).toBe('');
    expect((el.querySelector('#password') as HTMLInputElement).value).toBe('');
  });

  it('valida en cliente y marca campos con aria-invalid sin llamar a la API', async () => {
    await submit();
    http.expectNone(REGISTER_URL);
    expect(el.querySelector('#firstName-error')?.textContent).toContain('Ingresa tus nombres');
    expect(el.querySelector('#first-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#first-name')?.getAttribute('aria-describedby')).toBe('firstName-error');
    expect(alertRegion().textContent).toContain('Revisa los campos marcados');
  });

  it('detecta contraseñas que no coinciden', async () => {
    fillValid();
    type('confirm-password', 'OtraClave1');
    await submit();
    http.expectNone(REGISTER_URL);
    expect(el.querySelector('#confirmPassword-error')?.textContent).toContain('no coinciden');
  });

  it('envía exactamente RegisterRequest, muestra carga y redirige a login con aviso', async () => {
    fillValid();
    await submit();
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Creando cuenta');

    const req = http.expectOne(REGISTER_URL);
    expect(req.request.body).toEqual({
      firstName: 'Ana',
      lastName: 'Prueba Sintética',
      documentType: 'CC',
      documentNumber: '100200300',
      email: 'ana@example.test',
      phone: '3000000000',
      password: 'ClaveSegura1',
    });
    req.flush({ id: 1, firstName: 'Ana', lastName: 'Prueba Sintética', documentType: 'CC', documentNumber: '100200300', email: 'ana@example.test', phone: '3000000000', roles: ['USER'] }, { status: 201, statusText: 'Created' });

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { aviso: 'registro-exitoso' } });
    // No inicia sesión automáticamente.
    http.expectNone(`${TEST_API_URL}/api/v1/auth/login`);
  });

  it('409 IDENTIFIER_ALREADY_REGISTERED muestra un error global accesible', async () => {
    fillValid();
    await submit();
    http.expectOne(REGISTER_URL).flush(
      { status: 409, code: 'IDENTIFIER_ALREADY_REGISTERED', detail: 'An account with the supplied identifier already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    expect(alertRegion().textContent).toContain('Ya existe una cuenta registrada con el correo electrónico o el documento');
    expect(alertRegion().textContent).not.toContain('supplied identifier');
    expect(submitButton().disabled).toBe(false);
  });

  it('409 EMAIL_ALREADY_REGISTERED marca el campo de correo', async () => {
    fillValid();
    await submit();
    http.expectOne(REGISTER_URL).flush({ status: 409, code: 'EMAIL_ALREADY_REGISTERED' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(el.querySelector('#email-error')?.textContent).toContain('correo electrónico');
    expect(el.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('409 DOCUMENT_ALREADY_REGISTERED marca el campo de documento', async () => {
    fillValid();
    await submit();
    http.expectOne(REGISTER_URL).flush({ status: 409, code: 'DOCUMENT_ALREADY_REGISTERED' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(el.querySelector('#docNumber-error')?.textContent).toContain('documento');
  });

  it('400 VALIDATION_ERROR marca los campos indicados por la API', async () => {
    fillValid();
    await submit();
    http.expectOne(REGISTER_URL).flush(
      { status: 400, code: 'VALIDATION_ERROR', errors: [{ field: 'documentNumber', message: 'size must be between 0 and 64' }] },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    expect(el.querySelector('#docNumber-error')).not.toBeNull();
    expect(alertRegion().textContent).toContain('Algunos datos no son válidos');
  });

  it('error de red se muestra en la alerta', async () => {
    fillValid();
    await submit();
    http.expectOne(REGISTER_URL).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(alertRegion().textContent).toContain('conectar con el servidor');
  });
});
