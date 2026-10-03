import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { EpsAdminComponent } from './eps-admin';
import { AppConfigService } from '../../../core/config/app-config.service';
import { TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';

const A = `${TEST_API_URL}/api/v1/admin`;
const EPS = [
  { id: 1, code: 'EPS_A', name: 'EPS Alfa', active: true },
  { id: 2, code: 'EPS_B', name: 'EPS Beta', active: false },
];

describe('EpsAdminComponent (HU-008)', () => {
  let fixture: ComponentFixture<EpsAdminComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(eps: object[] | 'error' = EPS) {
    fixture = TestBed.createComponent(EpsAdminComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(catalogsFixture());
    if (eps === 'error') http.expectOne(`${A}/eps`).flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    else http.expectOne(`${A}/eps`).flush(eps);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EpsAdminComponent],
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
  const buttonByText = (text: string, scope: ParentNode = el) =>
    Array.from(scope.querySelectorAll('button')).find((b) => b.textContent?.trim() === text) as HTMLButtonElement;

  it('lista EPS activas e inactivas', async () => {
    await create();
    expect(el.textContent).toContain('EPS Alfa');
    expect(el.textContent).toContain('EPS Beta');
    expect(el.textContent).toContain('Inactiva');
    expect(q('[data-testid="plans-no-eps"]')).not.toBeNull();
  });

  it('estado vacío', async () => {
    await create([]);
    expect(q('[data-testid="eps-empty"]')).not.toBeNull();
  });

  it('403 muestra un mensaje accesible', async () => {
    await create('error');
    expect(q('[data-testid="eps-error"]')?.closest('[role="alert"]')).not.toBeNull();
    expect(q('[data-testid="eps-error"]')?.textContent).toContain('No tienes permisos');
  });

  it('crea EPS (201) y muestra 409 DUPLICATE_CODE', async () => {
    await create();
    type('eps-code', ' EPS_C ');
    type('eps-name', 'EPS Gamma');
    (q('[data-testid="eps-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect((q('[data-testid="eps-create"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: `${A}/eps` });
    expect(req.request.body).toEqual({ code: 'EPS_C', name: 'EPS Gamma' });
    req.flush({ id: 3, code: 'EPS_C', name: 'EPS Gamma', active: true }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(el.textContent).toContain('EPS Gamma');

    type('eps-code', 'EPS_A');
    type('eps-name', 'Repetida');
    (q('[data-testid="eps-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne({ method: 'POST', url: `${A}/eps` }).flush({ code: 'DUPLICATE_CODE' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="eps-error"]')?.textContent).toContain('Ya existe un registro con ese código');
  });

  it('valida el formulario sin llamar a la API', async () => {
    await create();
    (q('[data-testid="eps-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectNone({ method: 'POST', url: `${A}/eps` });
    expect(q('#eps-code')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('desactiva y edita el nombre con PATCH (sin borrado)', async () => {
    await create();
    (q('[data-testid="eps-toggle-1"]') as HTMLButtonElement).click();
    const toggle = http.expectOne({ method: 'PATCH', url: `${A}/eps/1` });
    expect(toggle.request.body).toEqual({ name: 'EPS Alfa', active: false });
    toggle.flush({ ...EPS[0], active: false });
    await fixture.whenStable();
    expect(el.textContent).toContain('desactivada');

    buttonByText('Editar').click();
    await fixture.whenStable();
    type('eps-edit-1', 'EPS Alfa Renombrada');
    buttonByText('Guardar').click();
    const rename = http.expectOne({ method: 'PATCH', url: `${A}/eps/1` });
    expect(rename.request.body).toEqual({ name: 'EPS Alfa Renombrada', active: false });
    rename.flush({ id: 1, code: 'EPS_A', name: 'EPS Alfa Renombrada', active: false });
    await fixture.whenStable();
    expect(el.textContent).toContain('EPS Alfa Renombrada');
  });

  it('planes: carga por EPS, régimen del catálogo y creación', async () => {
    await create();
    buttonByText('Planes').click();
    await fixture.whenStable();
    http.expectOne((r) => r.url === `${A}/plans` && r.params.get('epsId') === '1').flush([
      { id: 10, code: 'P-C', name: 'Plan Contributivo', active: true, epsId: 1, regimeId: 1, regimeCode: 'CONTRIBUTIVO', regimeName: 'Contributivo' },
    ]);
    await fixture.whenStable();
    expect(el.textContent).toContain('Plan Contributivo');

    const options = Array.from(el.querySelectorAll('#plan-regime option')) as HTMLOptionElement[];
    expect(options.find((o) => o.value === 'CONTRIBUTIVO')?.disabled).toBe(false);
    // Sin `id` en el catálogo ni en planes conocidos no puede enviarse.
    expect(options.find((o) => o.value === 'SUBSIDIADO')?.disabled).toBe(true);

    type('plan-code', 'P-2');
    type('plan-name', 'Plan Dos');
    type('plan-regime', 'CONTRIBUTIVO');
    (q('[data-testid="plan-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const req = http.expectOne({ method: 'POST', url: `${A}/eps/1/plans` });
    expect(req.request.body).toEqual({ regimeId: 1, code: 'P-2', name: 'Plan Dos' });
    req.flush({ id: 11, code: 'P-2', name: 'Plan Dos', active: true, epsId: 1, regimeId: 1 }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Plan Dos');
  });

  it('usa el id de régimen del catálogo cuando el backend lo expone', async () => {
    fixture = TestBed.createComponent(EpsAdminComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    const cat = catalogsFixture();
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush({ ...cat, insuranceRegimes: [{ id: 2, code: 'SUBSIDIADO', name: 'Subsidiado' }] });
    http.expectOne(`${A}/eps`).flush(EPS);
    await fixture.whenStable();
    buttonByText('Planes').click();
    http.expectOne((r) => r.url === `${A}/plans`).flush([]);
    await fixture.whenStable();
    type('plan-code', 'P-S');
    type('plan-name', 'Plan S');
    type('plan-regime', 'SUBSIDIADO');
    (q('[data-testid="plan-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(http.expectOne({ method: 'POST', url: `${A}/eps/1/plans` }).request.body.regimeId).toBe(2);
  });

  it('planes: vacío y 404', async () => {
    await create();
    buttonByText('Planes').click();
    http.expectOne((r) => r.url === `${A}/plans`).flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="plans-empty"]')).not.toBeNull();

    type('plan-code', 'P-1');
    type('plan-name', 'Plan');
    (q('[data-testid="plan-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectNone({ method: 'POST', url: `${A}/eps/1/plans` });
    expect(q('[data-testid="plan-error"]')?.textContent).toContain('régimen');
  });

  it('desactivar un plan usa PATCH con 404 mapeado', async () => {
    await create();
    buttonByText('Planes').click();
    http.expectOne((r) => r.url === `${A}/plans`).flush([
      { id: 10, code: 'P-C', name: 'Plan C', active: true, epsId: 1, regimeId: 1, regimeCode: 'CONTRIBUTIVO' },
    ]);
    await fixture.whenStable();
    const planList = el.querySelector('[aria-label="Planes de la EPS"]') as HTMLElement;
    buttonByText('Desactivar', planList).click();
    http.expectOne({ method: 'PATCH', url: `${A}/plans/10` }).flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(q('[data-testid="plan-error"]')?.textContent).toContain('no existe');
  });
});
