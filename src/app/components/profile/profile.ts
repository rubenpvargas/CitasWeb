import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/auth/session.store';
import { ProfileApi, ProfileDto } from '../../core/api/profile.api';
import { AffiliationComponent } from './affiliation';
import { errorCode, errorMessage, fieldErrors } from '../../core/api/api-errors';

type EditableField = 'firstName' | 'lastName' | 'phone';
const FIELD_MESSAGES: Record<EditableField, string> = {
  firstName: 'Ingresa tus nombres (máximo 100 caracteres).',
  lastName: 'Ingresa tus apellidos (máximo 100 caracteres).',
  phone: 'Ingresa un teléfono de contacto (máximo 32 caracteres).',
};

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AffiliationComponent],
  template: `
    <header class="sticky top-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-xs border-b border-outline-variant/30">
      <div class="h-16 px-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-primary-container text-white flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px]">person</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[15px] font-semibold text-primary tracking-tight leading-none">Mi Perfil Clínico</span>
            <span class="text-[11px] text-on-surface-variant leading-none mt-1 font-medium">Datos del Paciente</span>
          </div>
        </div>
        <button
          type="button"
          (click)="logout()"
          [disabled]="loggingOut()"
          class="disabled:opacity-75 text-[12px] font-semibold text-error hover:bg-error-container/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          Cerrar sesión
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col relative w-full max-w-lg mx-auto px-4 pt-4 pb-28 bg-surface">
      <div class="flex flex-col w-full gap-5">

        <!-- Estado de carga / error del perfil -->
        @if (loadState() === 'loading') {
          <p role="status" aria-live="polite" data-testid="profile-loading" class="ui-empty flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
            Cargando tu perfil...
          </p>
        }
        @if (loadState() === 'error') {
          <div role="alert" data-testid="profile-load-error" class="ui-alert-error">
            <span class="material-symbols-outlined text-error text-[20px]" aria-hidden="true">error</span>
            <div class="flex-1">
              <p>{{ loadError() }}</p>
              <button type="button" (click)="load()" class="ui-btn-ghost mt-1 px-0">Reintentar</button>
            </div>
          </div>
        }

        <!-- Tarjeta de Identidad del Paciente -->
        <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/40 flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-surface-container-high text-primary flex items-center justify-center border-2 border-secondary/40 shadow-xs shrink-0" aria-hidden="true">
            <span class="material-symbols-outlined text-[32px]">person</span>
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <div class="inline-flex items-center gap-1 text-[11px] font-semibold text-secondary mb-0.5">
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">verified</span>
              <span>Paciente Titular Verificado</span>
            </div>
            <h2 class="text-lg font-bold text-primary truncate" data-testid="profile-name">{{ fullName() }}</h2>
            @if (profile(); as p) {
              <p class="text-[13px] text-on-surface-variant">{{ p.documentType }} {{ p.documentNumber }}</p>
            }
          </div>
        </div>

        <!-- Información Personal y de Contacto -->
        @if (profile(); as p) {
          <section class="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/40 flex flex-col gap-3" aria-labelledby="contact-title">
            <div class="flex items-center justify-between">
              <h3 id="contact-title" class="ui-section-title">Datos de Contacto</h3>
              @if (!editing()) {
                <button type="button" data-testid="profile-edit" (click)="startEdit()" class="ui-btn-ghost inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                  Editar datos
                </button>
              }
            </div>

            <div role="status" aria-live="polite">
              @if (saveSuccess()) {
                <p data-testid="profile-success" class="ui-alert-success">
                  <span class="material-symbols-outlined text-secondary text-[18px]" aria-hidden="true">check_circle</span>
                  Tus datos se actualizaron correctamente.
                </p>
              }
            </div>

            @if (!editing()) {
              <div class="ui-row">
                <span class="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">mail</span>
                <div class="flex flex-col min-w-0">
                  <span class="text-[11px] text-on-surface-variant">Correo electrónico</span>
                  <span class="text-[13px] font-medium text-on-surface truncate">{{ p.email }}</span>
                </div>
              </div>

              <div class="ui-row">
                <span class="material-symbols-outlined text-secondary text-[20px]" aria-hidden="true">call</span>
                <div class="flex flex-col min-w-0">
                  <span class="text-[11px] text-on-surface-variant">Teléfono celular</span>
                  <span class="text-[13px] font-medium text-on-surface">+57 {{ p.phone }}</span>
                </div>
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="save()" [attr.aria-busy]="saving()" novalidate class="flex flex-col gap-3" data-testid="profile-form">
                <div role="alert" aria-live="assertive" aria-atomic="true">
                  @if (saveError()) {
                    <p data-testid="profile-save-error" class="ui-alert-error">
                      <span class="material-symbols-outlined text-error text-[18px]" aria-hidden="true">error</span>
                      {{ saveError() }}
                    </p>
                  }
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label for="profile-first-name" class="ui-label">Nombres *</label>
                    <input id="profile-first-name" class="ui-input" formControlName="firstName" autocomplete="given-name"
                      [attr.aria-invalid]="!!fieldError('firstName')" [attr.aria-describedby]="fieldError('firstName') ? 'profile-first-name-error' : null" />
                    @if (fieldError('firstName'); as msg) { <span id="profile-first-name-error" class="ui-field-error">{{ msg }}</span> }
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label for="profile-last-name" class="ui-label">Apellidos *</label>
                    <input id="profile-last-name" class="ui-input" formControlName="lastName" autocomplete="family-name"
                      [attr.aria-invalid]="!!fieldError('lastName')" [attr.aria-describedby]="fieldError('lastName') ? 'profile-last-name-error' : null" />
                    @if (fieldError('lastName'); as msg) { <span id="profile-last-name-error" class="ui-field-error">{{ msg }}</span> }
                  </div>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="profile-phone" class="ui-label">Teléfono de contacto *</label>
                  <input id="profile-phone" class="ui-input" type="tel" inputmode="tel" formControlName="phone" autocomplete="tel"
                    [attr.aria-invalid]="!!fieldError('phone')" [attr.aria-describedby]="fieldError('phone') ? 'profile-phone-error' : null" />
                  @if (fieldError('phone'); as msg) { <span id="profile-phone-error" class="ui-field-error">{{ msg }}</span> }
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="profile-email" class="ui-label">Correo electrónico</label>
                  <input id="profile-email" class="ui-input" [value]="p.email" disabled aria-describedby="profile-readonly-note" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="profile-document" class="ui-label">Documento</label>
                  <input id="profile-document" class="ui-input" [value]="p.documentType + ' ' + p.documentNumber" disabled aria-describedby="profile-readonly-note" />
                  <span id="profile-readonly-note" class="text-[11px] text-on-surface-variant">El correo y el documento no se pueden modificar desde el portal.</span>
                </div>
                <div class="flex gap-2 pt-1">
                  <button type="submit" data-testid="profile-save" class="ui-btn-primary flex-1" [disabled]="saving()">
                    @if (saving()) {
                      <span class="material-symbols-outlined text-[18px] animate-spin" aria-hidden="true">progress_activity</span>
                      <span>Guardando...</span>
                    } @else {
                      <span>Guardar cambios</span>
                    }
                  </button>
                  <button type="button" class="ui-btn-secondary" (click)="cancelEdit()" [disabled]="saving()">Cancelar</button>
                </div>
              </form>
            }
          </section>
        }

        <!-- Afiliación (HU-006), solo para pacientes -->
        @if (isUser()) {
          <app-affiliation />
        }

        <!-- Seguridad y Acceso -->
        <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-outline-variant/40 flex flex-col gap-3">
          <h3 class="text-[13px] font-bold text-primary uppercase tracking-wide">Seguridad de la Cuenta</h3>

          <button
            type="button"
            (click)="goToResetPassword()"
            class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left cursor-pointer border border-outline-variant/20"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-primary text-[20px]">lock_reset</span>
              <div class="flex flex-col">
                <span class="text-[13px] font-semibold text-primary">Cambiar o actualizar contraseña</span>
                <span class="text-[11px] text-on-surface-variant">Abrir pantalla "Crear nueva contraseña"</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
          </button>

          <button
            type="button"
            (click)="goToRecover()"
            class="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-left cursor-pointer border border-outline-variant/20"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-secondary text-[20px]">lock_clock</span>
              <div class="flex flex-col">
                <span class="text-[13px] font-semibold text-primary">Solicitar recuperación de acceso</span>
                <span class="text-[11px] text-on-surface-variant">Pantalla "Recuperar contraseña"</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
          </button>
        </div>

        <!-- Información Institucional de la Entidad -->
        <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
          <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined text-[18px]">security</span>
            <span class="text-[13px] font-semibold">Garantía de Protección de Datos</span>
          </div>
          <p class="text-[12px] text-on-surface-variant leading-relaxed">
            Tus datos de salud están protegidos bajo estándares internacionales de confidencialidad hospitalaria (Ley Estatutaria 1581 de 2012 y normatividad vigente del Ministerio de Salud de Colombia).
          </p>
        </div>

        <!-- Botón Cerrar Sesión -->
        <button
          type="button"
          (click)="logout()"
          [disabled]="loggingOut()"
          data-testid="logout-button"
          class="w-full h-11 disabled:opacity-75 rounded-xl bg-surface-container-lowest border border-error/40 text-error text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-error-container/30 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]" [class.animate-spin]="loggingOut()" aria-hidden="true">{{ loggingOut() ? 'progress_activity' : 'logout' }}</span>
          <span data-testid="logout-label">{{ loggingOut() ? 'Cerrando sesión...' : 'Cerrar sesión en este dispositivo' }}</span>
        </button>

      </div>
    </main>
  `
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly session = inject(SessionStore);
  private readonly profileApi = inject(ProfileApi);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loggingOut = signal(false);
  readonly isUser = computed(() => this.session.hasAnyRole(['USER']));
  readonly profile = signal<ProfileDto | null>(null);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly loadError = signal('');
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly serverFieldErrors = signal<EditableField[]>([]);
  private readonly submitted = signal(false);

  readonly fullName = computed(() => {
    const p = this.profile();
    const user = this.session.user();
    const first = p?.firstName ?? user?.firstName ?? '';
    const last = p?.lastName ?? user?.lastName ?? '';
    return `${first} ${last}`.trim();
  });

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.maxLength(32)]],
  });

  constructor() {
    this.load();
  }

  load() {
    this.loadState.set('loading');
    this.profileApi.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loadState.set('ready');
      },
      error: (error: unknown) => {
        this.loadError.set(errorMessage(error, 'No fue posible cargar tu perfil.'));
        this.loadState.set('error');
      },
    });
  }

  fieldError(name: EditableField): string | null {
    const control = this.form.controls[name];
    if (this.serverFieldErrors().includes(name)) return FIELD_MESSAGES[name];
    return control.invalid && (control.touched || this.submitted()) ? FIELD_MESSAGES[name] : null;
  }

  startEdit() {
    const p = this.profile();
    if (!p) return;
    this.form.reset({ firstName: p.firstName, lastName: p.lastName, phone: p.phone });
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.serverFieldErrors.set([]);
    this.submitted.set(false);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
    this.saveError.set(null);
  }

  save() {
    if (this.saving()) return;
    this.submitted.set(true);
    this.serverFieldErrors.set([]);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.saveError.set('Revisa los campos marcados e inténtalo nuevamente.');
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.saveError.set(null);
    this.profileApi
      .updateMe({ firstName: value.firstName.trim(), lastName: value.lastName.trim(), phone: value.phone.trim() })
      .subscribe({
        next: (profile) => {
          this.saving.set(false);
          this.profile.set(profile);
          this.session.updateUser({ firstName: profile.firstName, lastName: profile.lastName });
          this.editing.set(false);
          this.saveSuccess.set(true);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          if (errorCode(error) === 'VALIDATION_ERROR') {
            this.serverFieldErrors.set(
              fieldErrors(error).filter((f): f is EditableField => f in FIELD_MESSAGES),
            );
          }
          this.saveError.set(errorMessage(error, 'No fue posible guardar tus datos. Inténtalo nuevamente.'));
        },
      });
  }

  goToResetPassword() {
    // Sin token de recuperación, el cambio de contraseña inicia en /recuperar (HU-004).
    void this.router.navigate(['/recuperar']);
  }

  goToRecover() {
    void this.router.navigate(['/recuperar']);
  }

  logout() {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.authService.logout().subscribe({
      complete: () => {
        this.loggingOut.set(false);
        void this.router.navigate(['/login']);
      },
    });
  }
}
