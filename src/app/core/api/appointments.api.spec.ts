import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppointmentsApi } from './appointments.api';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

const URL = `${TEST_API_URL}/api/v1/appointments`;

describe('AppointmentsApi', () => {
  let api: AppointmentsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    api = TestBed.inject(AppointmentsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list envía solo los filtros presentes', () => {
    api.list().subscribe();
    expect(http.expectOne((r) => r.url === URL).request.params.keys()).toEqual([]);
    api.list({ status: 'APPROVED', from: '2099-01-01', to: '2099-01-31' }).subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('status')).toBe('APPROVED');
    expect(req.request.params.get('from')).toBe('2099-01-01');
    expect(req.request.params.get('to')).toBe('2099-01-31');
  });

  it('get, cancel y reschedule', () => {
    api.get(4).subscribe();
    http.expectOne({ method: 'GET', url: `${URL}/4` });
    api.cancel(4).subscribe();
    http.expectOne({ method: 'POST', url: `${URL}/4/cancel` });
    api.reschedule(4, { startAt: '2099-01-02T08:00:00', locationCode: 'HIC' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${URL}/4/reschedule` }).request.body).toEqual({ startAt: '2099-01-02T08:00:00', locationCode: 'HIC' });
  });
});
