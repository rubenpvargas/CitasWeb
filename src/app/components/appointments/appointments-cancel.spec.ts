import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppointmentsComponent } from './appointments';
import { AppConfigService } from '../../core/config/app-config.service';
import { MIXED, TEST_API_URL } from '../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/appointments`;

describe('AppointmentsComponent — cancelar (HU-020)', () => {
  let fixture: ComponentFixture<AppointmentsComponent>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    confirmSpy = vi.spyOn(window, 'confirm');
    TestBed.configureTestingModule({
      imports: [AppointmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppointmentsComponent);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL).flush(MIXED);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    confirmSpy.mockRestore();
  });

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  it('solo ofrece cancelar cuando el backend marca cancellable', () => {
    expect(q('[data-testid="cancel-1"]')).not.toBeNull();
    expect(q('[data-testid="cancel-2"]')).not.toBeNull();
    expect(q('[data-testid="cancel-3"]')).toBeNull();
    expect(q('[data-testid="cancel-5"]')).toBeNull();
  });

  it('abre un diálogo accesible (no confirm nativo) y se cierra con Escape', async () => {
    await click('cancel-2');
    const dialog = q('[data-testid="cancel-dialog"]');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('cancel-title');
    expect(confirmSpy).not.toHaveBeenCalled();
    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(q('[data-testid="cancel-dialog"]')).toBeNull();
    http.expectNone({ method: 'POST' });
  });

  it('confirma con POST /appointments/{id}/cancel y recarga', async () => {
    await click('cancel-2');
    await click('cancel-confirm');
    expect((q('[data-testid="cancel-confirm"]') as HTMLButtonElement).disabled).toBe(true);
    http.expectOne({ method: 'POST', url: `${URL}/2/cancel` }).flush({ ...MIXED[1], status: 'CANCELLED' });
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL).flush(MIXED.map((a) => (a.id === 2 ? { ...a, status: 'CANCELLED', cancellable: false } : a)));
    await fixture.whenStable();
    expect(q('[data-testid="cancel-dialog"]')).toBeNull();
    expect(q('[data-testid="appointments-message"]')?.textContent).toContain('Cita N.º 2 cancelada');
    expect(q('[data-testid="status-2"]')?.textContent?.trim()).toBe('Cancelada');
  });

  it('409 INVALID_TRANSITION se muestra en el diálogo y refresca la lista', async () => {
    await click('cancel-1');
    await click('cancel-confirm');
    http.expectOne({ method: 'POST', url: `${URL}/1/cancel` }).flush({ code: 'INVALID_TRANSITION' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="cancel-error"]')?.getAttribute('role')).toBe('alert');
    http.expectOne((r) => r.url === URL).flush(MIXED);
  });

  it('error de red permite reintentar', async () => {
    await click('cancel-2');
    await click('cancel-confirm');
    http.expectOne({ method: 'POST', url: `${URL}/2/cancel` }).error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(q('[data-testid="cancel-error"]')?.textContent).toContain('conectar con el servidor');
    expect((q('[data-testid="cancel-confirm"]') as HTMLButtonElement).disabled).toBe(false);
  });
});
