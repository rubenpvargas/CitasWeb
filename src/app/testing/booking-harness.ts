import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BookingComponent } from '../components/booking/booking';
import { AppConfigService } from '../core/config/app-config.service';
import { ACTIVE_SPECIALTIES, TEST_API_URL, catalogsFixture } from './fixtures';

/** Arnés de pruebas de la pantalla de reserva (HU-015 a HU-017). */
export async function setupBooking() {
  TestBed.configureTestingModule({
    imports: [BookingComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  TestBed.inject(AppConfigService).set({ apiUrl: TEST_API_URL });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(BookingComponent);
  const el: HTMLElement = fixture.nativeElement;
  await fixture.whenStable();
  http.expectOne(`${TEST_API_URL}/api/v1/specialties`).flush(ACTIVE_SPECIALTIES);
  http.expectOne(`${TEST_API_URL}/api/v1/catalogs`).flush(catalogsFixture());
  await fixture.whenStable();
  const q = (s: string) => el.querySelector(s) as HTMLElement | null;
  const click = async (testId: string) => {
    (q(`[data-testid="${testId}"]`) as HTMLButtonElement).click();
    await fixture.whenStable();
  };
  const search = async () => {
    (q('[data-testid="availability-form"]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  return { http, fixture, el, q, click, search };
}
