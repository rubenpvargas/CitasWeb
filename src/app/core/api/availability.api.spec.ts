import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AvailabilityApi } from './availability.api';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

describe('AvailabilityApi', () => {
  let api: AvailabilityApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    api = TestBed.inject(AvailabilityApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /availability con parámetros obligatorios y opcionales', () => {
    api.search({ specialtyId: 2, from: '2099-01-01', to: '2099-01-07' }).subscribe();
    const r1 = http.expectOne((r) => r.url === `${TEST_API_URL}/api/v1/availability`);
    expect(r1.request.params.keys().sort()).toEqual(['from', 'specialtyId', 'to']);
    expect(r1.request.params.get('specialtyId')).toBe('2');
    r1.flush([]);

    api.search({ specialtyId: 2, from: '2099-01-01', to: '2099-01-07', locationCode: 'HIC', professionalId: 9 }).subscribe();
    const r2 = http.expectOne((r) => r.url === `${TEST_API_URL}/api/v1/availability`);
    expect(r2.request.params.get('locationCode')).toBe('HIC');
    expect(r2.request.params.get('professionalId')).toBe('9');
    r2.flush([]);
  });

  it('POST /appointments/general y /specialized', () => {
    api.bookGeneral({ professionalId: 1, locationCode: 'HIC', startAt: '2099-01-02T08:00:00' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${TEST_API_URL}/api/v1/appointments/general` }).request.body)
      .toEqual({ professionalId: 1, locationCode: 'HIC', startAt: '2099-01-02T08:00:00' });
    api.bookSpecialized({ specialtyId: 3, professionalId: 1, locationCode: 'HIC', startAt: '2099-01-02T08:00:00', reason: 'Control' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${TEST_API_URL}/api/v1/appointments/specialized` }).request.body)
      .toEqual({ specialtyId: 3, professionalId: 1, locationCode: 'HIC', startAt: '2099-01-02T08:00:00', reason: 'Control' });
  });
});
