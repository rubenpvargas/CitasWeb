import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfessionalsAdminComponent } from './professionals-admin';
import { AppConfigService } from '../../../core/config/app-config.service';
import { TEST_API_URL } from '../../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/admin/professionals`;
export const PROFESSIONALS = [
  {
    id: 1, userId: 10, firstName: 'Prof', lastName: 'Uno', email: 'uno@example.test', professionalCode: 'PRO-1',
    licenseNumber: 'RM-1', active: true, specialtyCodes: 'CARD,GEN', locationCodes: 'HIC',
  },
];

describe('ProfessionalsAdminComponent (HU-010)', () => {
  let fixture: ComponentFixture<ProfessionalsAdminComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(list: object[] | 'error' = PROFESSIONALS) {
    fixture = TestBed.createComponent(ProfessionalsAdminComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.match((r) => r.url !== URL).forEach((r) => r.flush([]));
    if (list === 'error') http.expectOne(URL).flush(null, { status: 403, statusText: 'Forbidden' });
    else http.expectOne(URL).flush(list);
    await fixture.whenStable();
    http.match((r) => r.url !== URL).forEach((r) => r.flush([]));
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProfessionalsAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function type(id: string, value: string) {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  function fill(password = 'ClaveSegura1') {
    type('pro-firstName', 'Prof');
    type('pro-lastName', 'Sintético');
    type('pro-documentNumber', '900000002');
    type('pro-email', ' Nuevo@Example.Test ');
    type('pro-phone', '3000000000');
    type('pro-professionalCode', 'PRO-2');
    type('pro-licenseNumber', 'RM-2');
    type('pro-password', password);
  }
  const submit = () => (q('[data-testid="pro-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));

  it('lista profesionales con capacidades', async () => {
    await create();
    expect(el.textContent).toContain('Prof Uno');
    expect(el.textContent).toContain('CARD, GEN');
    expect(el.textContent).toContain('Activo');
  });

  it('estado vacío', async () => {
    await create([]);
    expect(q('[data-testid="pro-empty"]')).not.toBeNull();
  });

  it('error al listar es accesible', async () => {
    await create('error');
    expect(q('[data-testid="pro-list-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });

  it('no trae datos precargados y usa placeholders sintéticos', async () => {
    await create();
    expect((q('#pro-email') as HTMLInputElement).value).toBe('');
    expect((q('#pro-email') as HTMLInputElement).placeholder).toContain('example.test');
  });

  it('aplica la política de contraseña sin llamar a la API', async () => {
    await create();
    fill('debil');
    submit();
    await fixture.whenStable();
    http.expectNone({ method: 'POST', url: URL });
    expect(q('#pro-password')?.getAttribute('aria-invalid')).toBe('true');
    expect(q('[data-testid="pro-error"]')).not.toBeNull();
  });

  it('crea (201) con email normalizado y sin exponer la contraseña en pantalla', async () => {
    await create();
    fill();
    submit();
    await fixture.whenStable();
    expect((q('[data-testid="pro-create"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: URL });
    expect(req.request.body).toEqual({
      firstName: 'Prof', lastName: 'Sintético', documentType: 'CC', documentNumber: '900000002',
      email: 'nuevo@example.test', phone: '3000000000', password: 'ClaveSegura1', professionalCode: 'PRO-2', licenseNumber: 'RM-2',
    });
    req.flush({ id: 2, userId: 11, firstName: 'Prof', lastName: 'Sintético', email: 'nuevo@example.test', professionalCode: 'PRO-2', licenseNumber: 'RM-2', active: true }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(q('[data-testid="pro-success"]')?.closest('[role="status"]')).not.toBeNull();
    expect(el.textContent).not.toContain('ClaveSegura1');
    expect((q('#pro-password') as HTMLInputElement).value).toBe('');
  });

  for (const [code, field] of [
    ['DUPLICATE_EMAIL', 'pro-email'],
    ['DUPLICATE_DOCUMENT', 'pro-documentNumber'],
    ['DUPLICATE_PROFESSIONAL_CODE', 'pro-professionalCode'],
    ['DUPLICATE_LICENSE', 'pro-licenseNumber'],
  ]) {
    it(`409 ${code} marca el campo`, async () => {
      await create();
      fill();
      submit();
      http.expectOne({ method: 'POST', url: URL }).flush({ code }, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();
      expect(q(`#${field}`)?.getAttribute('aria-invalid')).toBe('true');
      expect(q(`#${field}-error`)?.textContent).toContain('Ya existe');
    });
  }
});
