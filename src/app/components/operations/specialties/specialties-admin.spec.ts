import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SpecialtiesAdminComponent } from './specialties-admin';
import { AppConfigService } from '../../../core/config/app-config.service';
import { TEST_API_URL } from '../../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/admin/specialties`;
const LIST = [
  { id: 1, code: 'GEN', name: 'Medicina General', durationMinutes: 30, general: true, active: true },
  { id: 2, code: 'CARD', name: 'Cardiología', durationMinutes: 60, general: false, active: false },
];

describe('SpecialtiesAdminComponent (HU-009)', () => {
  let fixture: ComponentFixture<SpecialtiesAdminComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(list: object[] | 'error' = LIST) {
    fixture = TestBed.createComponent(SpecialtiesAdminComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.textContent).toContain('Cargando especialidades');
    if (list === 'error') http.expectOne(URL).error(new ProgressEvent('error'));
    else http.expectOne(URL).flush(list);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SpecialtiesAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function type(id: string, value: string) {
    const input = el.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
  }
  const buttonByText = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) as HTMLButtonElement;

  it('lista con general, duración e inactivas', async () => {
    await create();
    expect(el.textContent).toContain('Medicina General');
    expect(el.textContent).toContain('General');
    expect(el.textContent).toContain('60 min');
    expect(el.textContent).toContain('Inactiva');
  });

  it('estados vacío y error', async () => {
    await create([]);
    expect(q('[data-testid="spec-empty"]')).not.toBeNull();
    buttonByText('Actualizar').click();
    http.expectOne(URL).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(q('[data-testid="spec-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });

  it('la duración solo ofrece 30 o 60 minutos', async () => {
    await create();
    const options = Array.from(el.querySelectorAll('#spec-duration option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['30 minutos', '60 minutos']);
  });

  it('crea con duración y bandera general (201)', async () => {
    await create();
    type('spec-code', 'NEURO');
    type('spec-name', 'Neurología');
    type('spec-duration', '1: 60');
    (q('[data-testid="spec-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect((q('[data-testid="spec-create"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: URL });
    expect(req.request.body).toEqual({ code: 'NEURO', name: 'Neurología', durationMinutes: 60, general: false });
    req.flush({ id: 3, code: 'NEURO', name: 'Neurología', durationMinutes: 60, general: false, active: true }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Neurología');
  });

  it('409 GENERAL_SPECIALTY_CONFLICT al activar otra general', async () => {
    await create([...LIST, { id: 4, code: 'GEN2', name: 'General Dos', durationMinutes: 30, general: true, active: false }]);
    (q('[data-testid="spec-toggle-4"]') as HTMLButtonElement).click();
    const req = http.expectOne({ method: 'PATCH', url: `${URL}/4` });
    expect(req.request.body).toEqual({ name: 'General Dos', durationMinutes: 30, active: true });
    req.flush({ code: 'GENERAL_SPECIALTY_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="spec-error"]')?.textContent).toContain('Ya existe una especialidad general activa');
  });

  it('edita nombre y duración', async () => {
    await create();
    buttonByText('Editar').click();
    await fixture.whenStable();
    type('spec-edit-name-1', 'Medicina Familiar');
    type('spec-edit-duration-1', '60');
    buttonByText('Guardar').click();
    const req = http.expectOne({ method: 'PATCH', url: `${URL}/1` });
    expect(req.request.body).toEqual({ name: 'Medicina Familiar', durationMinutes: 60, active: true });
    req.flush({ ...LIST[0], name: 'Medicina Familiar', durationMinutes: 60 });
    await fixture.whenStable();
    expect(el.textContent).toContain('Medicina Familiar');
  });

  it('400 VALIDATION_ERROR del servidor se muestra', async () => {
    await create();
    type('spec-code', 'X');
    type('spec-name', 'X');
    (q('[data-testid="spec-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne({ method: 'POST', url: URL }).flush({ code: 'VALIDATION_ERROR' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(q('[data-testid="spec-error"]')?.textContent).toContain('Algunos datos no son válidos');
  });
});
