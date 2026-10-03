import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileApi } from './profile.api';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

describe('ProfileApi', () => {
  let api: ProfileApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    api = TestBed.inject(ProfileApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /me', () => {
    api.getMe().subscribe();
    const req = http.expectOne(`${TEST_API_URL}/api/v1/me`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('PATCH /me envía solo firstName, lastName y phone', () => {
    api.updateMe({ firstName: 'Ana', lastName: 'Prueba', phone: '3000000000' }).subscribe();
    const req = http.expectOne(`${TEST_API_URL}/api/v1/me`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ firstName: 'Ana', lastName: 'Prueba', phone: '3000000000' });
    req.flush({});
  });

  it('GET/PUT /me/affiliations', () => {
    api.getAffiliations().subscribe();
    http.expectOne({ method: 'GET', url: `${TEST_API_URL}/api/v1/me/affiliations` }).flush([]);
    api.saveAffiliation({ planId: 3, membershipNumber: 'SYN-001' }).subscribe();
    const req = http.expectOne({ method: 'PUT', url: `${TEST_API_URL}/api/v1/me/affiliations` });
    expect(req.request.body).toEqual({ planId: 3, membershipNumber: 'SYN-001' });
    req.flush({});
  });

  it('GET /insurance/eps', () => {
    api.listInsuranceEps().subscribe();
    http.expectOne({ method: 'GET', url: `${TEST_API_URL}/api/v1/insurance/eps` }).flush([]);
  });
});
