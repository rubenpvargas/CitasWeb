import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminApi, codeList } from './admin.api';
import { CatalogApi } from './catalog.api';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL } from '../../testing/fixtures';

const A = `${TEST_API_URL}/api/v1/admin`;

describe('AdminApi', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('EPS: listar, crear y actualizar (sin borrado)', () => {
    api.listEps().subscribe();
    http.expectOne({ method: 'GET', url: `${A}/eps` }).flush([]);
    api.createEps({ code: 'EPS_SYN', name: 'EPS Sintética' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${A}/eps` }).request.body).toEqual({ code: 'EPS_SYN', name: 'EPS Sintética' });
    api.updateEps(4, { name: 'Nueva', active: false }).subscribe();
    expect(http.expectOne({ method: 'PATCH', url: `${A}/eps/4` }).request.body).toEqual({ name: 'Nueva', active: false });
  });

  it('planes por EPS', () => {
    api.listPlans(4).subscribe();
    http.expectOne((r) => r.method === 'GET' && r.url === `${A}/plans` && r.params.get('epsId') === '4').flush([]);
    api.createPlan(4, { regimeId: 1, code: 'P1', name: 'Plan 1' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${A}/eps/4/plans` }).request.body).toEqual({ regimeId: 1, code: 'P1', name: 'Plan 1' });
    api.updatePlan(9, { name: 'Plan', active: true }).subscribe();
    http.expectOne({ method: 'PATCH', url: `${A}/plans/9` });
  });

  it('especialidades', () => {
    api.listSpecialties().subscribe();
    http.expectOne({ method: 'GET', url: `${A}/specialties` });
    api.createSpecialty({ code: 'CARD', name: 'Cardiología', durationMinutes: 60, general: false }).subscribe();
    expect(http.expectOne({ method: 'POST', url: `${A}/specialties` }).request.body.durationMinutes).toBe(60);
    api.updateSpecialty(2, { name: 'Cardio', durationMinutes: 30, active: true }).subscribe();
    http.expectOne({ method: 'PATCH', url: `${A}/specialties/2` });
  });

  it('profesionales, capacidades y sedes', () => {
    api.listLocations().subscribe();
    http.expectOne({ method: 'GET', url: `${A}/locations` });
    api.listProfessionals().subscribe();
    http.expectOne({ method: 'GET', url: `${A}/professionals` });
    api.createProfessional({
      firstName: 'A', lastName: 'B', documentType: 'CC', documentNumber: '1', email: 'a@example.test',
      phone: '1', password: 'ClaveSegura1', professionalCode: 'PRO-1', licenseNumber: 'RM-1',
    }).subscribe();
    http.expectOne({ method: 'POST', url: `${A}/professionals` });
    api.updateCapabilities(3, { specialtyIds: [1, 2], primarySpecialtyId: 1, locationIds: [5], active: true }).subscribe();
    expect(http.expectOne({ method: 'PUT', url: `${A}/professionals/3/capabilities` }).request.body).toEqual({
      specialtyIds: [1, 2], primarySpecialtyId: 1, locationIds: [5], active: true,
    });
  });

  it('codeList acepta arreglos y cadenas separadas por comas', () => {
    expect(codeList('CARD,GEN')).toEqual(['CARD', 'GEN']);
    expect(codeList(['HIC'])).toEqual(['HIC']);
    expect(codeList(null)).toEqual([]);
  });
});

describe('CatalogApi', () => {
  let api: CatalogApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    api = TestBed.inject(CatalogApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cachea GET /catalogs y reintenta tras un error', () => {
    api.getCatalogs().subscribe({ error: () => undefined });
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(null, { status: 500, statusText: 'x' });
    api.getCatalogs().subscribe();
    api.getCatalogs().subscribe();
    http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush({ roles: [], appointmentStatuses: [], rescheduleRequestStatuses: [], insuranceRegimes: [], locations: [] });
  });

  it('GET /specialties (activas, para USER)', () => {
    api.listActiveSpecialties().subscribe();
    http.expectOne({ method: 'GET', url: `${TEST_API_URL}/api/v1/specialties` }).flush([]);
  });
});
