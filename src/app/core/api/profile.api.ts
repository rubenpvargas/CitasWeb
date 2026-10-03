import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

/** HU-005 `GET /api/v1/me` → perfil propio (nunca hash ni tokens). */
export interface ProfileDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  roles?: string[];
}

/** HU-005 `PATCH /api/v1/me`: email y documento no son editables en v1. */
export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  phone: string;
}

/**
 * HU-006 afiliación vigente. Campos según el controlador actual
 * (`SchedulingService.affiliations`): EPS, plan y régimen por referencia.
 */
export interface AffiliationDto {
  id: number;
  membershipNumber: string;
  current: boolean;
  planId: number;
  planCode: string;
  planName: string;
  epsId: number;
  epsCode: string;
  epsName: string;
  regimeCode: string;
  regimeName: string;
}

/** HU-006 `PUT /api/v1/me/affiliations`. */
export interface AffiliationRequest {
  planId: number;
  membershipNumber: string;
}

/** `GET /api/v1/insurance/eps`: EPS activas con planes activos. */
export interface InsurancePlanDto {
  id: number;
  code: string;
  name: string;
  regime: { code: string; name: string };
}

export interface InsuranceEpsDto {
  id: number;
  code: string;
  name: string;
  plans: InsurancePlanDto[];
}

/** Cliente REST de perfil y afiliación del usuario autenticado (ownership por `sub`). */
@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  getMe(): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(this.config.url('/api/v1/me'));
  }

  updateMe(request: ProfileUpdateRequest): Observable<ProfileDto> {
    return this.http.patch<ProfileDto>(this.config.url('/api/v1/me'), request);
  }

  getAffiliations(): Observable<AffiliationDto[]> {
    return this.http.get<AffiliationDto[]>(this.config.url('/api/v1/me/affiliations'));
  }

  saveAffiliation(request: AffiliationRequest): Observable<AffiliationDto> {
    return this.http.put<AffiliationDto>(this.config.url('/api/v1/me/affiliations'), request);
  }

  listInsuranceEps(): Observable<InsuranceEpsDto[]> {
    return this.http.get<InsuranceEpsDto[]>(this.config.url('/api/v1/insurance/eps'));
  }
}
