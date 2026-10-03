import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppConfigService } from '../../core/config/app-config.service';
import { SessionStore } from '../../core/auth/session.store';

@Component({
  selector: 'app-operations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <main class="min-h-screen max-w-5xl mx-auto w-full p-5 pb-24 flex flex-col gap-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div><p class="text-xs uppercase tracking-widest text-secondary font-semibold">Operación protegida</p><h1 class="text-2xl font-semibold text-primary">Agenda y administración</h1></div>
        @if (canUsePortal()) { <button type="button" (click)="back()" class="px-3 py-2 rounded-lg bg-surface-container text-primary border-0 cursor-pointer">Volver al portal</button> }
      </header>
      @if (!isAdmin() && !isProfessional()) { <div role="alert" class="p-4 rounded-xl bg-error-container text-error">Tu rol no tiene permisos para esta consola. La API mantiene la autorización final.</div> }
      @if (isAdmin()) {
        <section class="grid md:grid-cols-3 gap-3">
          <button type="button" (click)="loadInbox()" class="p-4 rounded-xl bg-primary-container text-white border-0 cursor-pointer">Cargar bandeja ADMIN</button>
          <button type="button" (click)="loadProfessionals()" class="p-4 rounded-xl bg-surface-container text-primary border-0 cursor-pointer">Profesionales</button>
          <button type="button" (click)="loadSpecialties()" class="p-4 rounded-xl bg-surface-container text-primary border-0 cursor-pointer">Especialidades</button>
        </section>
        @for (item of inbox(); track item['itemType'] + '-' + item['id']) {
          <article class="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/40 flex flex-wrap items-center justify-between gap-3">
            <div><strong>{{ item['itemType'] }} #{{ item['id'] }}</strong><p class="text-sm text-on-surface-variant">{{ item['specialtyName'] }} · {{ item['status'] }} · {{ item['startAt'] }}</p></div>
            <div class="flex gap-2"><button type="button" (click)="decide(item, true)" class="px-3 py-2 rounded-lg bg-emerald-700 text-white border-0 cursor-pointer">Aprobar</button><button type="button" (click)="decide(item, false)" class="px-3 py-2 rounded-lg bg-error text-white border-0 cursor-pointer">Rechazar</button></div>
          </article>
        }
        @for (professional of professionals(); track professional['id']) { <p class="p-3 rounded-lg bg-surface-container text-sm">{{ professional['firstName'] }} {{ professional['lastName'] }} · {{ professional['professionalCode'] }} · {{ professional['active'] ? 'Activo' : 'Inactivo' }}</p> }
      }
      @if (isProfessional()) {
        <section class="grid md:grid-cols-[1fr_1.5fr] gap-5">
          <form [formGroup]="blockForm" (ngSubmit)="createBlock()" class="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col gap-3">
            <h2 class="font-semibold text-primary">Publicar bloque futuro</h2>
            <label>Fecha<input type="date" formControlName="date" class="w-full p-2 rounded border" /></label>
            <label>Inicio<input type="time" formControlName="startTime" class="w-full p-2 rounded border" /></label>
            <label>Fin<input type="time" formControlName="endTime" class="w-full p-2 rounded border" /></label>
            <label>Sede<select formControlName="locationCode" class="w-full p-2 rounded border"><option value="HIC">HIC</option><option value="ICV">ICV</option></select></label>
            <button type="submit" [disabled]="blockForm.invalid || saving()" class="p-2 rounded-lg bg-primary-container text-white border-0 disabled:opacity-50">Guardar bloque</button>
          </form>
          <section class="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/40"><div class="flex justify-between items-center"><h2 class="font-semibold text-primary">Agenda aprobada</h2><button type="button" (click)="loadAgenda()" class="text-secondary border-0 bg-transparent cursor-pointer">Actualizar</button></div>@for (item of agenda(); track item['id']) {<p class="py-3 border-b text-sm">{{ item['startAt'] }} · {{ item['specialtyName'] }} · {{ item['patientFirstName'] }} {{ item['patientLastName'] }}</p>} @empty {<p class="text-sm text-on-surface-variant mt-3">Sin citas aprobadas en el rango actual.</p>}</section>
        </section>
      }
      @if (message()) { <p role="status" class="p-3 rounded-lg bg-secondary-container text-primary">{{ message() }}</p> }
    </main>
  `,
})
export class OperationsComponent {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly config = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly inbox = signal<Record<string, unknown>[]>([]);
  readonly professionals = signal<Record<string, unknown>[]>([]);
  readonly agenda = signal<Record<string, unknown>[]>([]);
  readonly message = signal('');
  readonly saving = signal(false);
  readonly blockForm = this.fb.nonNullable.group({ date: ['', Validators.required], startTime: ['08:00', Validators.required], endTime: ['12:00', Validators.required], locationCode: ['HIC', Validators.required] });
  readonly isAdmin = () => this.session.hasAnyRole(['ADMIN']);
  readonly isProfessional = () => this.session.hasAnyRole(['PROFESSIONAL']);
  private api<T>(method: 'get' | 'post', path: string, body?: unknown) {
    const url = this.config.url(path);
    return method === 'get' ? this.http.get<T>(url) : this.http.post<T>(url, body ?? {});
  }
  loadInbox() { this.api<Record<string, unknown>[]>('get', '/api/v1/admin/inbox').subscribe({ next: (data) => this.inbox.set(data), error: () => this.message.set('No fue posible cargar la bandeja.') }); }
  loadProfessionals() { this.api<Record<string, unknown>[]>('get', '/api/v1/admin/professionals').subscribe({ next: (data) => this.professionals.set(data), error: () => this.message.set('No fue posible cargar profesionales.') }); }
  loadSpecialties() { this.api<Record<string, unknown>[]>('get', '/api/v1/admin/specialties').subscribe({ next: (data) => this.message.set(`${data.length} especialidades activas.`), error: () => this.message.set('No fue posible cargar especialidades.') }); }
  decide(item: Record<string, unknown>, approve: boolean) { const path = item['itemType'] === 'RESCHEDULE' ? `/api/v1/admin/reschedules/${item['id']}/decision` : `/api/v1/admin/appointments/${item['id']}/decision`; this.api<void>('post', path, { approve, reason: approve ? 'Decision operativa sintetica' : 'No cumple criterios de laboratorio' }).subscribe({ next: () => { this.message.set('Decisión guardada.'); this.loadInbox(); }, error: () => this.message.set('La API rechazó la decisión.') }); }
  createBlock() { if (this.blockForm.invalid) return; this.saving.set(true); this.api<Record<string, unknown>>('post', '/api/v1/professional/blocks', this.blockForm.getRawValue()).subscribe({ next: () => this.message.set('Bloque publicado.'), error: () => this.message.set('No fue posible publicar el bloque.'), complete: () => this.saving.set(false) }); }
  loadAgenda() { const today = new Date(); const from = today.toISOString().slice(0, 10); const toDate = new Date(today); toDate.setDate(toDate.getDate() + 30); const to = toDate.toISOString().slice(0, 10); this.api<Record<string, unknown>[]>('get', `/api/v1/professional/agenda?from=${from}&to=${to}`).subscribe({ next: (data) => this.agenda.set(data), error: () => this.message.set('No fue posible cargar agenda.') }); }
  readonly canUsePortal = () => this.session.hasAnyRole(['USER']);
  back() { void this.router.navigate(['/inicio']); }
}
