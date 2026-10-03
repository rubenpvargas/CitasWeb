import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BlocksComponent, lockReason } from './blocks';
import { AppConfigService } from '../../../core/config/app-config.service';
import { BLOCKS, TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';

const CAL = `${TEST_API_URL}/api/v1/professional/calendar`;


describe('lockReason (HU-014)', () => {
  it('editable → sin motivo', () => expect(lockReason(BLOCKS[1], '2026-10-02T10:00')).toBeNull());
  it('pasado → PAST_BLOCK', () => expect(lockReason(BLOCKS[2], '2026-10-02T10:00')).toContain('pasado'));
  it('con cupos comprometidos → BLOCK_COMMITTED', () => expect(lockReason(BLOCKS[0], '2026-10-02T10:00')).toContain('reservadas o retenidas'));
});

describe('BlocksComponent — calendario (HU-014)', () => {
  let fixture: ComponentFixture<BlocksComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let initial: TestRequest;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [BlocksComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BlocksComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(catalogsFixture());
    initial = http.expectOne((r) => r.url === CAL);
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function set(id: string, value: string) {
    const input = q(`#${id}`) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event('change'));
  }
  const search = () => (q('[data-testid="calendar-filters"]') as HTMLFormElement).dispatchEvent(new Event('submit'));

  it('consulta un rango inicial de hoy a 13 días y muestra carga', async () => {
    await fixture.whenStable();
    expect(el.textContent).toContain('Cargando calendario');
    const from = initial.request.params.get('from') as string;
    const to = initial.request.params.get('to') as string;
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((Date.parse(to) - Date.parse(from)) / 86_400_000).toBe(13);
    expect(initial.request.params.has('locationCode')).toBe(false);
    initial.flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="calendar-empty"]')).not.toBeNull();
  });

  it('agrupa por fecha, muestra cupos y el motivo de los no editables', async () => {
    initial.flush(BLOCKS);
    await fixture.whenStable();
    const headings = Array.from(el.querySelectorAll('h3')).map((h) => h.textContent?.trim());
    expect(headings[0]).toContain('2020');
    expect(headings[1]).toContain('15 de enero de 2099');
    expect(q('[data-testid="block-1"]')?.textContent).toContain('0 de 4 cupos comprometidos');
    expect(q('[data-testid="block-1"]')?.textContent).toContain('Editable');
    expect(q('[data-testid="block-reason-1"]')).toBeNull();
    expect(q('[data-testid="block-reason-2"]')?.textContent).toContain('reservadas o retenidas');
    expect(q('[data-testid="block-reason-3"]')?.textContent).toContain('pasado');
    // Sin datos de pacientes.
    expect(el.textContent).not.toMatch(/paciente/i);
  });

  it('filtra por rango y sede', async () => {
    initial.flush([]);
    await fixture.whenStable();
    set('cal-from', '2099-01-01');
    set('cal-to', '2099-01-31');
    set('cal-location', 'HIC');
    search();
    const req = http.expectOne((r) => r.url === CAL);
    expect(req.request.params.get('from')).toBe('2099-01-01');
    expect(req.request.params.get('to')).toBe('2099-01-31');
    expect(req.request.params.get('locationCode')).toBe('HIC');
    req.flush([]);
  });

  it('rechaza rangos de más de 31 días o invertidos sin llamar a la API', async () => {
    initial.flush([]);
    await fixture.whenStable();
    set('cal-from', '2099-01-01');
    set('cal-to', '2099-02-15');
    search();
    await fixture.whenStable();
    http.expectNone((r) => r.url === CAL);
    expect(q('[data-testid="calendar-error"]')?.textContent).toContain('31 días');

    set('cal-to', '2098-12-01');
    search();
    await fixture.whenStable();
    http.expectNone((r) => r.url === CAL);
    expect(q('[data-testid="calendar-error"]')?.textContent).toContain('anterior o igual');
  });

  it('error del servidor se muestra en role="alert"', async () => {
    initial.flush({ code: 'INVALID_REQUEST' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(q('[data-testid="calendar-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });
});
