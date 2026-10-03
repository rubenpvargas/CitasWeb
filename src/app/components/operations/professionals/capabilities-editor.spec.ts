import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfessionalsAdminComponent } from './professionals-admin';
import { AppConfigService } from '../../../core/config/app-config.service';
import { TEST_API_URL } from '../../../testing/fixtures';

const A = `${TEST_API_URL}/api/v1/admin`;
const PROS = [
  { id: 1, userId: 10, firstName: 'Prof', lastName: 'Uno', email: 'uno@example.test', professionalCode: 'PRO-1', licenseNumber: 'RM-1', active: true, specialtyCodes: 'CARD', locationCodes: 'HIC' },
];
const SPECS = [
  { id: 1, code: 'GEN', name: 'Medicina General', durationMinutes: 30, general: true, active: true },
  { id: 2, code: 'CARD', name: 'Cardiología', durationMinutes: 60, general: false, active: true },
  { id: 3, code: 'OLD', name: 'Retirada', durationMinutes: 30, general: false, active: false },
];
const LOCS = [
  { id: 5, code: 'HIC', name: 'HIC', active: true },
  { id: 6, code: 'ICV', name: 'ICV', active: true },
];

describe('Capacidades del profesional (HU-011)', () => {
  let fixture: ComponentFixture<ProfessionalsAdminComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProfessionalsAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProfessionalsAdminComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(`${A}/professionals`).flush(PROS);
    await fixture.whenStable();
    (el.querySelector('[data-testid="cap-open-1"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Cargando especialidades y sedes');
    http.expectOne(`${A}/specialties`).flush(SPECS);
    http.expectOne(`${A}/locations`).flush(LOCS);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const check = (id: string) => (q(`[data-testid="${id}"]`) as HTMLInputElement);
  const primaryOptions = () => Array.from(el.querySelectorAll('[data-testid="cap-primary"] option')).map((o) => o.textContent?.trim());
  async function setPrimary(value: string) {
    const sel = q('[data-testid="cap-primary"]') as HTMLSelectElement;
    sel.value = value;
    sel.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }
  const submit = () => (q('[data-testid="cap-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));

  it('preselecciona las capacidades actuales a partir de los códigos', () => {
    expect(check('cap-spec-2').checked).toBe(true);
    expect(check('cap-spec-1').checked).toBe(false);
    expect(check('cap-loc-5').checked).toBe(true);
    expect(check('cap-spec-3').disabled).toBe(true);
    expect(check('cap-active').checked).toBe(true);
  });

  it('el selector de principal solo ofrece especialidades asignadas', async () => {
    expect(primaryOptions()).toEqual(['Selecciona la principal…', 'Cardiología']);
    check('cap-spec-1').click();
    await fixture.whenStable();
    expect(primaryOptions()).toEqual(['Selecciona la principal…', 'Medicina General', 'Cardiología']);
    await setPrimary('2');
    check('cap-spec-2').click();
    await fixture.whenStable();
    expect(primaryOptions()).toEqual(['Selecciona la principal…', 'Medicina General']);
  });

  it('valida mínimos y principal sin llamar a la API', async () => {
    submit();
    await fixture.whenStable();
    http.expectNone({ method: 'PUT' });
    expect(q('[data-testid="cap-error"]')?.textContent).toContain('especialidad principal');
  });

  it('guarda con PUT y recarga la lista', async () => {
    check('cap-spec-1').click();
    check('cap-loc-6').click();
    await fixture.whenStable();
    await setPrimary('2');
    check('cap-active').click();
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
    expect((q('[data-testid="cap-save"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'PUT', url: `${A}/professionals/1/capabilities` });
    expect(req.request.body).toEqual({ specialtyIds: [2, 1], primarySpecialtyId: 2, locationIds: [5, 6], active: false });
    req.flush({ id: 1 });
    http.expectOne(`${A}/professionals`).flush(PROS);
    await fixture.whenStable();
    expect(q('[data-testid="cap-success"]')?.textContent).toContain('Capacidades de Prof Uno actualizadas');
    expect(q('[data-testid="cap-form"]')).toBeNull();
  });

  it('409 PRIMARY_NOT_ASSIGNED muestra el mensaje accesible', async () => {
    await setPrimary('2');
    submit();
    http.expectOne({ method: 'PUT', url: `${A}/professionals/1/capabilities` }).flush({ code: 'PRIMARY_NOT_ASSIGNED' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    const err = q('[data-testid="cap-error"]');
    expect(err?.closest('[role="alert"]')).not.toBeNull();
    expect(err?.textContent).toContain('La especialidad principal debe estar entre las especialidades asignadas');
  });

  it('409 CATALOG_INACTIVE se muestra', async () => {
    await setPrimary('2');
    submit();
    http.expectOne({ method: 'PUT', url: `${A}/professionals/1/capabilities` }).flush({ code: 'CATALOG_INACTIVE' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="cap-error"]')?.textContent).toContain('ya no está activa');
  });
});
