import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BlocksComponent } from './blocks';
import { AppConfigService } from '../../../core/config/app-config.service';
import { BLOCKS, TEST_API_URL, catalogsFixture } from '../../../testing/fixtures';

const P = `${TEST_API_URL}/api/v1/professional`;
const CAL = `${P}/calendar`;

describe('BlocksComponent — editar/eliminar (HU-013)', () => {
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
    http.expectOne((r) => r.url === CAL).flush(BLOCKS);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  it('solo los bloques editables ofrecen Editar/Eliminar; los demás muestran el motivo', () => {
    expect(q('[data-testid="block-edit-1"]')).not.toBeNull();
    expect(q('[data-testid="block-delete-1"]')?.getAttribute('aria-label')).toContain('Eliminar bloque');
    expect(q('[data-testid="block-edit-2"]')).toBeNull();
    expect(q('[data-testid="block-delete-3"]')).toBeNull();
    expect(q('[data-testid="block-reason-2"]')).not.toBeNull();
  });

  it('edita con PATCH (mismo cuerpo) y refresca el calendario', async () => {
    await click('block-edit-1');
    const row = q('[data-testid="block-1"]') as HTMLElement;
    const end = row.querySelector('[data-testid="block-end"]') as HTMLSelectElement;
    expect((row.querySelector('[data-testid="block-start"]') as HTMLSelectElement).value).toBe('08:00');
    end.value = '11:00';
    end.dispatchEvent(new Event('change'));
    (row.querySelector('[data-testid="block-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    const req = http.expectOne({ method: 'PATCH', url: `${P}/blocks/1` });
    expect(req.request.body).toEqual({ date: '2099-01-15', startTime: '08:00', endTime: '11:00', locationCode: 'HIC' });
    req.flush({});
    http.expectOne((r) => r.url === CAL).flush(BLOCKS);
    await fixture.whenStable();
    expect(q('[data-testid="block-row-message"]')?.textContent).toContain('Bloque actualizado');
  });

  it('cancelar la edición no llama a la API', async () => {
    await click('block-edit-1');
    const cancel = Array.from((q('[data-testid="block-1"]') as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar') as HTMLButtonElement;
    cancel.click();
    await fixture.whenStable();
    expect(q('[data-testid="block-1"] [data-testid="block-form"]')).toBeNull();
  });

  it('elimina tras confirmar (DELETE 204)', async () => {
    await click('block-delete-1');
    expect(q('[data-testid="block-1"] [role="group"]')).not.toBeNull();
    await click('block-delete-confirm-1');
    http.expectOne({ method: 'DELETE', url: `${P}/blocks/1` }).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne((r) => r.url === CAL).flush(BLOCKS.slice(0, 1));
    await fixture.whenStable();
    expect(q('[data-testid="block-row-message"]')?.textContent).toContain('Bloque eliminado');
    expect(q('[data-testid="block-1"]')).toBeNull();
  });

  it('409 BLOCK_COMMITTED muestra el motivo y refresca el estado', async () => {
    await click('block-delete-1');
    await click('block-delete-confirm-1');
    http.expectOne({ method: 'DELETE', url: `${P}/blocks/1` }).flush({ code: 'BLOCK_COMMITTED' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="block-row-error-1"]')?.getAttribute('role')).toBe('alert');
    expect(q('[data-testid="block-row-error-1"]')?.textContent).toContain('reservadas o retenidas');
    http.expectOne((r) => r.url === CAL).flush(BLOCKS.map((b) => (b.id === 1 ? { ...b, committedSlots: 1, editable: false } : b)));
    await fixture.whenStable();
    expect(q('[data-testid="block-edit-1"]')).toBeNull();
    expect(q('[data-testid="block-reason-1"]')).not.toBeNull();
  });

  it('409 PAST_BLOCK al editar se muestra', async () => {
    await click('block-edit-1');
    (q('[data-testid="block-1"] [data-testid="block-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectOne({ method: 'PATCH', url: `${P}/blocks/1` }).flush({ code: 'PAST_BLOCK' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(q('[data-testid="block-row-error-1"]')?.textContent).toContain('pasado');
    http.expectOne((r) => r.url === CAL).flush(BLOCKS);
  });
});
