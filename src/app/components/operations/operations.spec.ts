import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OperationsComponent } from './operations';
import { operationsHome } from './operations-links';
import { SessionStore } from '../../core/auth/session.store';
import { AppConfigService } from '../../core/config/app-config.service';
import { TEST_API_URL, loginResponse } from '../../testing/fixtures';
import { routes } from '../../app.routes';

describe('OperationsComponent (shell)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [OperationsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
  });

  afterEach(() => sessionStorage.clear());

  async function linksFor(roles: string[]): Promise<string[]> {
    TestBed.inject(SessionStore).start(loginResponse(roles));
    const fixture = TestBed.createComponent(OperationsComponent);
    await fixture.whenStable();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a')).map((a) => a.getAttribute('href') ?? '');
  }

  it('ADMIN ve solo secciones administrativas', async () => {
    const links = await linksFor(['ADMIN']);
    expect(links).toContain('/bandeja');
    expect(links).not.toContain('/agenda');
  });

  it('PROFESSIONAL ve solo secciones profesionales', async () => {
    const links = await linksFor(['PROFESSIONAL']);
    expect(links).toContain('/agenda');
    expect(links).not.toContain('/bandeja');
  });

  it('operationsHome elige la sección inicial por rol', () => {
    expect(operationsHome(['ADMIN'])).toBe('bandeja');
    expect(operationsHome(['PROFESSIONAL'])).not.toBe('bandeja');
  });

  it('las rutas hijas de /operacion exigen rol', () => {
    const children = routes.find((r) => r.path === 'operacion')?.children ?? [];
    for (const child of children.filter((c) => c.path)) {
      expect(child.canActivate?.length).toBe(1);
      expect((child.data?.['roles'] as string[]).length).toBeGreaterThan(0);
    }
  });
});
