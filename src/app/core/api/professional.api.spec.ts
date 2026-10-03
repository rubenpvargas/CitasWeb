import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfessionalApi, CalendarBlockDto } from './professional.api';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

const P = `${TEST_API_URL}/api/v1/professional`;

describe('ProfessionalApi', () => {
  let api: ProfessionalApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    api = TestBed.inject(ProfessionalApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crea, actualiza y elimina bloques sin enviar el profesional', () => {
    const body = { date: '2026-10-10', startTime: '08:00', endTime: '12:00', locationCode: 'HIC' };
    api.createBlock(body).subscribe();
    const create = http.expectOne({ method: 'POST', url: `${P}/blocks` });
    expect(create.request.body).toEqual(body);
    create.flush({}, { status: 201, statusText: 'Created' });

    api.updateBlock(5, body).subscribe();
    expect(http.expectOne({ method: 'PATCH', url: `${P}/blocks/5` }).request.body).toEqual(body);

    api.deleteBlock(5).subscribe();
    http.expectOne({ method: 'DELETE', url: `${P}/blocks/5` }).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('calendar envía from/to y locationCode opcional', () => {
    let result: CalendarBlockDto[] = [];
    api.calendar('2026-10-01', '2026-10-31', 'HIC').subscribe((r) => (result = r));
    const req = http.expectOne((r) => r.url === `${P}/calendar`);
    expect(req.request.params.get('from')).toBe('2026-10-01');
    expect(req.request.params.get('to')).toBe('2026-10-31');
    expect(req.request.params.get('locationCode')).toBe('HIC');
    req.flush([{ id: 1, date: '2026-10-10', startTime: '08:00', endTime: '09:00', locationCode: 'HIC', locationName: 'HIC', totalSlots: 2, committedSlots: 0, editable: true }]);
    expect(result[0].editable).toBe(true);

    api.calendar('2026-10-01', '2026-10-31').subscribe((r) => (result = r));
    const legacy = http.expectOne((r) => r.url === `${P}/calendar`);
    expect(legacy.request.params.has('locationCode')).toBe(false);
    legacy.flush([{ id: 2, availableDate: '2026-10-11', startTime: '08:00:00', endTime: '09:00:00', locationCode: 'HIC', locationName: 'HIC' }]);
    expect(result[0]).toEqual(expect.objectContaining({ date: '2026-10-11', editable: false, totalSlots: 0 }));
  });

  it('agenda', () => {
    api.agenda('2026-10-01', '2026-10-31').subscribe();
    http.expectOne((r) => r.url === `${P}/agenda` && r.params.get('from') === '2026-10-01').flush([]);
  });
});
