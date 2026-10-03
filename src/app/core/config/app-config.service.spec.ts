import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpInterceptorFn } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppConfigService, RUNTIME_CONFIG_PATH } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let http: HttpTestingController;
  const interceptorCalls: string[] = [];
  const spyInterceptor: HttpInterceptorFn = (req, next) => {
    interceptorCalls.push(req.url);
    return next(req);
  };

  beforeEach(() => {
    interceptorCalls.length = 0;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([spyInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga apiUrl una vez desde runtime-config.json y elimina la barra final', async () => {
    const loading = service.load();
    http.expectOne(RUNTIME_CONFIG_PATH).flush({ apiUrl: 'http://localhost:8080/' });
    await loading;

    expect(service.apiUrl).toBe('http://localhost:8080');
    expect(service.url('/api/v1/auth/login')).toBe('http://localhost:8080/api/v1/auth/login');
    expect(service.url('api/v1/me')).toBe('http://localhost:8080/api/v1/me');
  });

  it('no pasa por los interceptores HTTP', async () => {
    const loading = service.load();
    http.expectOne(RUNTIME_CONFIG_PATH).flush({ apiUrl: 'http://localhost:8080' });
    await loading;
    expect(interceptorCalls).toEqual([]);
  });

  it('falla si la configuración no define apiUrl', async () => {
    const loading = service.load();
    http.expectOne(RUNTIME_CONFIG_PATH).flush({});
    await expect(loading).rejects.toThrow(/apiUrl/);
    expect(service.isLoaded).toBe(false);
  });

  it('lanza error si se usa antes de cargar', () => {
    expect(() => service.apiUrl).toThrow();
  });

  it('identifica las URL que pertenecen a la API', () => {
    service.set({ apiUrl: 'http://api.test' });
    expect(service.isApiUrl('http://api.test/api/v1/me')).toBe(true);
    expect(service.isApiUrl('assets/runtime-config.json')).toBe(false);
    expect(service.isApiUrl('http://api.test.evil/api')).toBe(false);
  });
});
