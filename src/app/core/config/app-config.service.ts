import { HttpBackend, HttpClient } from '@angular/common/http';
import { EnvironmentProviders, Injectable, inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Configuración de ejecución servida en `assets/runtime-config.json`. */
export interface RuntimeConfig {
  apiUrl: string;
}

export const RUNTIME_CONFIG_PATH = 'assets/runtime-config.json';

/**
 * Carga una sola vez la configuración de ejecución (generada en Docker a partir
 * de `API_URL`) y la expone al resto de la aplicación. Usa `HttpBackend` para
 * no pasar por los interceptores.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private config: RuntimeConfig | null = null;

  async load(path: string = RUNTIME_CONFIG_PATH): Promise<void> {
    const raw = await firstValueFrom(this.http.get<Partial<RuntimeConfig>>(path));
    const apiUrl = typeof raw?.apiUrl === 'string' ? raw.apiUrl.trim() : '';
    if (!apiUrl) {
      throw new Error(`La configuración de ejecución (${path}) no define apiUrl.`);
    }
    this.config = { apiUrl: apiUrl.replace(/\/+$/, '') };
  }

  /** Permite fijar la configuración en pruebas sin solicitudes HTTP. */
  set(config: RuntimeConfig): void {
    this.config = { apiUrl: config.apiUrl.replace(/\/+$/, '') };
  }

  get isLoaded(): boolean {
    return this.config !== null;
  }

  get apiUrl(): string {
    if (!this.config) {
      throw new Error('La configuración de ejecución no se ha cargado.');
    }
    return this.config.apiUrl;
  }

  /** Construye una URL absoluta de la API a partir de una ruta como `/api/v1/...`. */
  url(path: string): string {
    return `${this.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Indica si una URL de petición apunta a la API configurada. */
  isApiUrl(requestUrl: string): boolean {
    return this.config !== null && requestUrl.startsWith(`${this.config.apiUrl}/`);
  }
}

export function provideRuntimeConfig(): EnvironmentProviders {
  return provideAppInitializer(() => inject(AppConfigService).load());
}
