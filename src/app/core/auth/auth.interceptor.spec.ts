import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor, isPublicAuthEndpoint } from './auth.interceptor';
import { SessionStore } from './session.store';
import { AppConfigService } from '../config/app-config.service';
import { TEST_API_URL, loginResponse, tokenResponse } from '../../testing/fixtures';

const ME = `${TEST_API_URL}/api/v1/me`;
const REFRESH = `${TEST_API_URL}/api/v1/auth/refresh`;

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let session: SessionStore;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('adjunta el Bearer a las peticiones de la API', () => {
    session.start(loginResponse());
    client.get(ME).subscribe();
    expect(http.expectOne(ME).request.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('no adjunta el Bearer a endpoints públicos de auth ni a otros orígenes', () => {
    session.start(loginResponse());
    for (const path of ['login', 'register', 'refresh', 'logout', 'password-reset/request', 'password-reset/confirm']) {
      client.post(`${TEST_API_URL}/api/v1/auth/${path}`, {}).subscribe();
      expect(http.expectOne(`${TEST_API_URL}/api/v1/auth/${path}`).request.headers.has('Authorization')).toBe(false);
    }
    client.get('assets/runtime-config.json').subscribe();
    expect(http.expectOne('assets/runtime-config.json').request.headers.has('Authorization')).toBe(false);
    client.get('https://otro.example.test/x').subscribe();
    expect(http.expectOne('https://otro.example.test/x').request.headers.has('Authorization')).toBe(false);
  });

  it('isPublicAuthEndpoint reconoce las rutas /api/v1/auth/', () => {
    expect(isPublicAuthEndpoint(`${TEST_API_URL}/api/v1/auth/login`)).toBe(true);
    expect(isPublicAuthEndpoint(`${TEST_API_URL}/api/v1/appointments`)).toBe(false);
  });

  it('ante 401 renueva y reintenta la petición original con el nuevo token', () => {
    session.start(loginResponse());
    let body: unknown;
    client.get(ME).subscribe((b) => (body = b));

    http.expectOne(ME).flush({ code: 'UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });
    const refresh = http.expectOne(REFRESH);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush(tokenResponse('2'));

    const retry = http.expectOne(ME);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('si la renovación falla limpia la sesión y vuelve a login con aviso', () => {
    session.start(loginResponse());
    let status = 0;
    client.get(ME).subscribe({ error: (e) => (status = e.status) });

    http.expectOne(ME).flush({ code: 'UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(REFRESH).flush({ code: 'INVALID_REFRESH_TOKEN' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(session.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { aviso: 'sesion-expirada' } });
  });

  it('peticiones concurrentes con 401 comparten un único refresh', () => {
    session.start(loginResponse());
    const done: string[] = [];
    client.get(`${ME}?a`).subscribe(() => done.push('a'));
    client.get(`${ME}?b`).subscribe(() => done.push('b'));

    http.expectOne(`${ME}?a`).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${ME}?b`).flush(null, { status: 401, statusText: 'Unauthorized' });

    const refreshes = http.match(REFRESH);
    expect(refreshes.length).toBe(1);
    refreshes[0].flush(tokenResponse('2'));

    const retries = http.match((req) => req.url.startsWith(ME));
    expect(retries.length).toBe(2);
    retries.forEach((r) => {
      expect(r.request.headers.get('Authorization')).toBe('Bearer access-2');
      r.flush({});
    });
    expect(done.sort()).toEqual(['a', 'b']);
  });

  it('si otra petición ya renovó el token, reintenta sin volver a renovar', () => {
    session.start(loginResponse());
    client.get(ME).subscribe();
    const first = http.expectOne(ME);
    session.updateTokens(tokenResponse('2'));
    first.flush(null, { status: 401, statusText: 'Unauthorized' });

    http.expectNone(REFRESH);
    const retry = http.expectOne(ME);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({});
  });

  it('no intenta renovar un 401 sin sesión', () => {
    let status = 0;
    client.get(ME).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(ME).flush(null, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(REFRESH);
    expect(status).toBe(401);
  });

  it('ante 403 muestra el estado no autorizado y propaga el error', () => {
    session.start(loginResponse());
    let status = 0;
    client.get(ME).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(ME).flush({ code: 'FORBIDDEN' }, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
    expect(router.navigate).toHaveBeenCalledWith(['/no-autorizado'], { skipLocationChange: true });
    expect(session.isAuthenticated()).toBe(true);
  });
});
