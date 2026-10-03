import { TestBed } from '@angular/core/testing';
import { SESSION_STORAGE_KEY, SessionStore } from './session.store';
import { loginResponse, tokenResponse } from '../../testing/fixtures';

describe('SessionStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('inicia sesión con tokens y usuario, y la persiste en sessionStorage', () => {
    const store = TestBed.inject(SessionStore);
    store.start(loginResponse(['USER']));

    expect(store.isAuthenticated()).toBe(true);
    expect(store.accessToken()).toBe('access-1');
    expect(store.refreshToken()).toBe('refresh-1');
    expect(store.user()?.firstName).toBe('Paciente');
    expect(store.roles()).toEqual(['USER']);
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? '{}').user.email).toBe('paciente@example.test');
  });

  it('restaura la sesión al recargar', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(loginResponse(['ADMIN'])));
    const store = TestBed.inject(SessionStore);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.hasAnyRole(['ADMIN'])).toBe(true);
    expect(store.hasAnyRole(['USER'])).toBe(false);
  });

  it('descarta una sesión guardada con refresh expirado o corrupta', () => {
    const expired = { ...loginResponse(), refreshExpiresAt: new Date(Date.now() - 1000).toISOString() };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(expired));
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();

    TestBed.resetTestingModule();
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{no-json');
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
  });

  it('actualiza tokens tras refresh conservando el usuario', () => {
    const store = TestBed.inject(SessionStore);
    store.start(loginResponse());
    store.updateTokens(tokenResponse('2'));
    expect(store.accessToken()).toBe('access-2');
    expect(store.refreshToken()).toBe('refresh-2');
    expect(store.user()?.id).toBe(7);
  });

  it('clear elimina la sesión y las claves heredadas', () => {
    sessionStorage.setItem('fcv.access-token', 'legacy');
    const store = TestBed.inject(SessionStore);
    store.start(loginResponse());
    store.clear();
    expect(store.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem('fcv.access-token')).toBeNull();
  });

  it('hasValidSession limpia la sesión cuando el refresh ya expiró', () => {
    const store = TestBed.inject(SessionStore);
    store.start(loginResponse());
    const later = Date.parse(store.session()!.refreshExpiresAt) + 1;
    expect(store.hasValidSession(later)).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('notifica la expiración cuando vence el refresh con la app abierta', () => {
    vi.useFakeTimers();
    const store = TestBed.inject(SessionStore);
    const listener = vi.fn();
    store.onExpired(listener);
    store.start(loginResponse());

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 10);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated()).toBe(false);
  });
});
