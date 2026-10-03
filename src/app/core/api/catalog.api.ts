import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

/** Entrada de catálogo fijo (`GET /api/v1/catalogs`). `id` no está en el contrato actual. */
export interface CatalogEntryDto {
  code: string;
  name: string;
  id?: number;
}

export interface CatalogStatusDto extends CatalogEntryDto {
  terminal: boolean;
}

export interface CatalogLocationDto {
  code: string;
  name: string;
  address: string;
  city: string;
  department: string;
  active: boolean;
}

/** HU-007 `GET /api/v1/catalogs`. */
export interface FixedCatalogsDto {
  roles: CatalogEntryDto[];
  appointmentStatuses: CatalogStatusDto[];
  rescheduleRequestStatuses: CatalogStatusDto[];
  insuranceRegimes: CatalogEntryDto[];
  locations: CatalogLocationDto[];
}

/** Ola B `GET /api/v1/specialties`: especialidades activas para cualquier usuario autenticado. */
export interface ActiveSpecialtyDto {
  id: number;
  code: string;
  name: string;
  durationMinutes: number;
  general: boolean;
}

/** Lectura de catálogos para usuarios autenticados. Los catálogos fijos se cachean por sesión de app. */
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private catalogs$: Observable<FixedCatalogsDto> | null = null;

  getCatalogs(): Observable<FixedCatalogsDto> {
    if (!this.catalogs$) {
      this.catalogs$ = this.http
        .get<FixedCatalogsDto>(this.config.url('/api/v1/catalogs'))
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      // Si falla, el siguiente intento vuelve a pedirlos.
      this.catalogs$.subscribe({ error: () => (this.catalogs$ = null) });
    }
    return this.catalogs$;
  }

  listActiveSpecialties(): Observable<ActiveSpecialtyDto[]> {
    return this.http.get<ActiveSpecialtyDto[]>(this.config.url('/api/v1/specialties'));
  }
}
