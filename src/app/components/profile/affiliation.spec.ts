import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AffiliationComponent } from './affiliation';
import { AppConfigService } from '../../core/config/app-config.service';
import { AffiliationDto, InsuranceEpsDto } from '../../core/api/profile.api';
import { TEST_API_URL } from '../../testing/fixtures';

const AFF = `${TEST_API_URL}/api/v1/me/affiliations`;
const EPS = `${TEST_API_URL}/api/v1/insurance/eps`;

const EPS_LIST: InsuranceEpsDto[] = [
  { id: 1, code: 'EPS_A', name: 'EPS Alfa', plans: [
    { id: 11, code: 'A-C', name: 'Alfa Contributivo', regime: { code: 'CONTRIBUTIVO', name: 'Contributivo' } },
    { id: 12, code: 'A-S', name: 'Alfa Subsidiado', regime: { code: 'SUBSIDIADO', name: 'Subsidiado' } },
  ] },
  { id: 2, code: 'EPS_B', name: 'EPS Beta', plans: [] },
];

const CURRENT: AffiliationDto = {
  id: 5, membershipNumber: 'SYN-1', current: true, planId: 11, planCode: 'A-C', planName: 'Alfa Contributivo',
  epsId: 1, epsCode: 'EPS_A', epsName: 'EPS Alfa', regimeCode: 'CONTRIBUTIVO', regimeName: 'Contributivo',
};

describe('AffiliationComponent (HU-006)', () => {
  let fixture: ComponentFixture<AffiliationComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

  async function create(affiliations: AffiliationDto[] = [], eps: InsuranceEpsDto[] = EPS_LIST) {
    fixture = TestBed.createComponent(AffiliationComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="affiliation-loading"]')).not.toBeNull();
    http.expectOne(AFF).flush(affiliations);
    http.expectOne(EPS).flush(eps);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AffiliationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function select(id: string, index: number) {
    const sel = el.querySelector(`#${id}`) as HTMLSelectElement;
    sel.selectedIndex = index;
    sel.dispatchEvent(new Event('change'));
  }
  function type(id: string, value: string) {
    const input = el.querySelector(`#${id}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }
  const submit = () => (q('[data-testid="affiliation-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
  const options = (id: string) => Array.from(el.querySelectorAll(`#${id} option`)).map((o) => o.textContent?.trim());

  it('sin afiliación muestra el estado vacío y el selector de EPS', async () => {
    await create();
    expect(q('[data-testid="affiliation-none"]')).not.toBeNull();
    expect(options('aff-eps')).toEqual(['Selecciona tu EPS…', 'EPS Alfa', 'EPS Beta']);
    expect(options('aff-plan')).toEqual(['Primero elige una EPS']);
  });

  it('sin EPS activas muestra el estado vacío del catálogo', async () => {
    await create([], []);
    expect(q('[data-testid="affiliation-no-eps"]')).not.toBeNull();
  });

  it('error de carga es accesible', async () => {
    fixture = TestBed.createComponent(AffiliationComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(AFF).flush(null, { status: 500, statusText: 'x' });
    http.expectOne(EPS);
    await fixture.whenStable();
    expect(q('[data-testid="affiliation-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });

  it('filtra los planes por EPS seleccionada', async () => {
    await create();
    select('aff-eps', 1);
    await fixture.whenStable();
    expect(options('aff-plan')).toEqual(['Selecciona el plan…', 'Alfa Contributivo (Contributivo)', 'Alfa Subsidiado (Subsidiado)']);
    select('aff-eps', 2);
    await fixture.whenStable();
    expect(options('aff-plan')).toEqual(['Selecciona el plan…']);
    expect(el.textContent).toContain('no tiene planes activos');
  });

  it('muestra y precarga la afiliación vigente', async () => {
    await create([CURRENT]);
    expect(q('[data-testid="affiliation-current"]')?.textContent).toContain('EPS Alfa · Alfa Contributivo');
    expect((q('#aff-number') as HTMLInputElement).value).toBe('SYN-1');
  });

  it('valida sin llamar a la API', async () => {
    await create();
    submit();
    await fixture.whenStable();
    http.expectNone({ method: 'PUT', url: AFF });
    expect(q('#aff-eps')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('guarda con PUT {planId, membershipNumber} y muestra éxito', async () => {
    await create();
    select('aff-eps', 1);
    await fixture.whenStable();
    select('aff-plan', 2);
    type('aff-number', ' SYN-77 ');
    submit();
    await fixture.whenStable();
    expect((q('[data-testid="affiliation-save"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'PUT', url: AFF });
    expect(req.request.body).toEqual({ planId: 12, membershipNumber: 'SYN-77' });
    req.flush({ ...CURRENT, id: 6, planId: 12, planName: 'Alfa Subsidiado', regimeName: 'Subsidiado', membershipNumber: 'SYN-77' });
    await fixture.whenStable();
    expect(q('[data-testid="affiliation-success"]')?.closest('[role="status"]')).not.toBeNull();
    expect(q('[data-testid="affiliation-current"]')?.textContent).toContain('Alfa Subsidiado');
  });

  it('409 CATALOG_INACTIVE conserva la afiliación previa y recarga las EPS', async () => {
    await create([CURRENT]);
    select('aff-plan', 2);
    submit();
    http.expectOne({ method: 'PUT', url: AFF }).flush({ code: 'CATALOG_INACTIVE' }, { status: 409, statusText: 'Conflict' });
    http.expectOne(EPS).flush(EPS_LIST);
    await fixture.whenStable();
    expect(q('[data-testid="affiliation-error"]')?.textContent).toContain('ya no están activos');
    expect(q('[data-testid="affiliation-current"]')?.textContent).toContain('Alfa Contributivo');
  });

  it('404 de plan inexistente se muestra', async () => {
    await create([CURRENT]);
    submit();
    http.expectOne({ method: 'PUT', url: AFF }).flush({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    expect(q('[data-testid="affiliation-error"]')?.textContent).toContain('no existe');
  });
});
