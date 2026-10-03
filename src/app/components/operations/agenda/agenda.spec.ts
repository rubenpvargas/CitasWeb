import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AgendaComponent } from './agenda';
import { AppConfigService } from '../../../core/config/app-config.service';
import { AGENDA, TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';
import { addDays, todayInBogota } from '../../../core/time/bogota-time';

const AG = `${TEST_API_URL}/api/v1/professional/agenda`;

describe('AgendaComponent — agenda profesional (HU-023)', () => {
  let fixture: ComponentFixture<AgendaComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  const today = todayInBogota();

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AgendaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AgendaComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(catalogsFixture());
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;

  it('por defecto consulta el día de hoy (Bogotá) y muestra carga y vacío', async () => {
    const req = http.expectOne((r) => r.url === AG);
    expect(req.request.params.get('from')).toBe(today);
    expect(req.request.params.get('to')).toBe(today);
    expect(req.request.params.has('locationCode')).toBe(false);
    await fixture.whenStable();
    expect(q('[data-testid="agenda-loading"]')).not.toBeNull();
    req.flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="agenda-empty"]')).not.toBeNull();
  });

  it('muestra solo el nombre del paciente, agrupado por día', async () => {
    http.expectOne((r) => r.url === AG).flush(AGENDA);
    await fixture.whenStable();
    expect(q('[data-testid="agenda-1"]')?.textContent).toContain('Paciente Sintético Uno');
    expect(el.textContent).not.toMatch(/@|documento|CC \d/i);
    expect(el.querySelectorAll('h3').length).toBe(2);
  });

  it('preset semana consulta 7 días', async () => {
    http.expectOne((r) => r.url === AG).flush([]);
    await fixture.whenStable();
    (q('[data-testid="preset-week"]') as HTMLButtonElement).click();
    const req = http.expectOne((r) => r.url === AG);
    expect(req.request.params.get('from')).toBe(today);
    expect(req.request.params.get('to')).toBe(addDays(today, 6));
    req.flush([]);
    await fixture.whenStable();
    expect(q('[data-testid="preset-week"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('filtra por sede', async () => {
    http.expectOne((r) => r.url === AG).flush([]);
    await fixture.whenStable();
    const sel = q('#ag-location') as HTMLSelectElement;
    sel.value = 'ICV';
    sel.dispatchEvent(new Event('change'));
    expect(http.expectOne((r) => r.url === AG).request.params.get('locationCode')).toBe('ICV');
  });

  it('rango personalizado inválido no consulta', async () => {
    http.expectOne((r) => r.url === AG).flush([]);
    await fixture.whenStable();
    const from = q('#ag-from') as HTMLInputElement;
    from.value = addDays(today, 5);
    from.dispatchEvent(new Event('change'));
    (q('[data-testid="agenda-filters"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    http.expectNone((r) => r.url === AG);
    expect(q('[data-testid="agenda-error"]')?.textContent).toContain('anterior o igual');
  });

  it('error de carga accesible', async () => {
    http.expectOne((r) => r.url === AG).flush({ code: 'PROFESSIONAL_REQUIRED' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="agenda-error"]')?.closest('[role="alert"]')).not.toBeNull();
  });
});
