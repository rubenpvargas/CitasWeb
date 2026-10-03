import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BlocksComponent } from './blocks';
import { validate } from './block-form';
import { AppConfigService } from '../../../core/config/app-config.service';
import { TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';

const P = `${TEST_API_URL}/api/v1/professional`;

/** Responde las peticiones de calendario (si las hay) para aislar cada HU. */
export function flushCalendar(http: HttpTestingController, blocks: object[] = []) {
  http.match((r) => r.url === `${P}/calendar`).forEach((r) => r.flush(blocks));
}

describe('validate (reglas de UX de HU-012)', () => {
  const base = { date: '2099-01-15', startTime: '08:00', endTime: '10:00', locationCode: 'HIC' };
  it('acepta un bloque futuro alineado', () => expect(validate(base, '2026-10-02T10:00')).toBeNull());
  it('exige :00/:30', () => expect(validate({ ...base, startTime: '08:15' }, '2026-10-02T10:00')).toContain(':00 o :30'));
  it('exige fin posterior al inicio', () => expect(validate({ ...base, endTime: '08:00' }, '2026-10-02T10:00')).toContain('posterior'));
  it('exige inicio futuro (hora de Bogotá)', () =>
    expect(validate({ ...base, date: '2026-10-02', startTime: '09:30', endTime: '11:00' }, '2026-10-02T10:00')).toContain('futuro'));
  it('exige sede', () => expect(validate({ ...base, locationCode: '' }, '2026-10-02T10:00')).toContain('sede'));
});

describe('BlocksComponent — publicar bloque (HU-012)', () => {
  let fixture: ComponentFixture<BlocksComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;

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
    flushCalendar(http);
    await fixture.whenStable();
    flushCalendar(http);
  });

  afterEach(() => {
    flushCalendar(http);
    http.verify();
  });

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  function set(testId: string, value: string) {
    const input = q(`[data-testid="block-create-form"] [data-testid="${testId}"], [data-testid="${testId}"]`) as HTMLInputElement | HTMLSelectElement;
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
  }
  const submit = () => (q('[data-testid="block-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));

  it('ofrece solo sedes activas del catálogo y horas en :00/:30', () => {
    const locs = Array.from(el.querySelectorAll('[data-testid="block-location"] option')).map((o) => (o as HTMLOptionElement).value);
    expect(locs).toEqual(['', 'HIC', 'ICV']);
    const starts = Array.from(el.querySelectorAll('[data-testid="block-start"] option')).map((o) => (o as HTMLOptionElement).value);
    expect(starts.every((t) => /:(00|30)$/.test(t))).toBe(true);
  });

  it('no envía si la validación del cliente falla y lo anuncia', async () => {
    submit();
    await fixture.whenStable();
    http.expectNone({ method: 'POST', url: `${P}/blocks` });
    expect(q('[data-testid="block-client-error"]')?.getAttribute('role')).toBe('alert');
  });

  it('publica con POST {date,startTime,endTime,locationCode} y muestra éxito', async () => {
    set('block-date', '2099-01-15');
    set('block-location', 'ICV');
    set('block-start', '09:00');
    set('block-end', '11:30');
    await fixture.whenStable();
    expect(el.textContent).toContain('150 minutos (5 cupos de 30 min)');
    submit();
    await fixture.whenStable();
    expect((q('[data-testid="block-submit"]') as HTMLButtonElement).disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: `${P}/blocks` });
    expect(req.request.body).toEqual({ date: '2099-01-15', startTime: '09:00', endTime: '11:30', locationCode: 'ICV' });
    req.flush({ id: 1 }, { status: 201, statusText: 'Created' });
    await fixture.whenStable();
    expect(q('[data-testid="block-created"]')?.closest('[role="status"]')).not.toBeNull();
  });

  for (const [code, text] of [
    ['PAST_BLOCK', 'pasado'],
    ['BLOCK_OVERLAP', 'se cruza'],
    ['LOCATION_NOT_ASSIGNED', 'No tienes asignada esa sede'],
    ['PROFESSIONAL_INACTIVE', 'inactivo'],
  ]) {
    it(`409 ${code} se muestra de forma accesible`, async () => {
      set('block-date', '2099-01-15');
      set('block-location', 'HIC');
      submit();
      http.expectOne({ method: 'POST', url: `${P}/blocks` }).flush({ code }, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();
      const err = q('[data-testid="block-create-error"]');
      expect(err?.closest('[role="alert"]')).not.toBeNull();
      expect(err?.textContent).toContain(text);
    });
  }
});
