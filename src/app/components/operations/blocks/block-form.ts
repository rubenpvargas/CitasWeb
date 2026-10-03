import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BlockRequest } from '../../../core/api/professional.api';
import { CatalogLocationDto } from '../../../core/api/catalog.api';
import { addDays, halfHourOptions, hhmm, nowInBogota, todayInBogota } from '../../../core/time/bogota-time';

let nextId = 0;

/**
 * Formulario de bloque (HU-012 crear, HU-013 editar). Horas en `:00`/`:30`
 * (hora local de Bogotá). Las comprobaciones del cliente son solo de
 * experiencia: el backend revalida (PAST_BLOCK, BLOCK_OVERLAP, ...).
 */
@Component({
  selector: 'app-block-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-3" [attr.aria-busy]="saving()" data-testid="block-form">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label [for]="uid + '-date'" class="ui-label">Fecha *</label>
          <input [id]="uid + '-date'" type="date" class="ui-input" formControlName="date" [min]="today" data-testid="block-date"
            [attr.aria-invalid]="!!clientError() && touched()" />
        </div>
        <div class="flex flex-col gap-1">
          <label [for]="uid + '-location'" class="ui-label">Sede *</label>
          <select [id]="uid + '-location'" class="ui-input" formControlName="locationCode" data-testid="block-location">
            <option value="">Selecciona la sede…</option>
            @for (l of locations(); track l.code) { <option [value]="l.code">{{ l.name }}</option> }
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label [for]="uid + '-start'" class="ui-label">Hora de inicio *</label>
          <select [id]="uid + '-start'" class="ui-input" formControlName="startTime" data-testid="block-start">
            @for (t of times; track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label [for]="uid + '-end'" class="ui-label">Hora de fin *</label>
          <select [id]="uid + '-end'" class="ui-input" formControlName="endTime" data-testid="block-end">
            @for (t of endTimes; track t) { <option [value]="t">{{ t }}</option> }
          </select>
        </div>
      </div>
      <p class="text-[11px] text-on-surface-variant" [id]="uid + '-help'">
        Las horas van en intervalos de 30 minutos (hora de Colombia). Duración: {{ durationLabel() }}.
      </p>
      @if (touched() && clientError(); as msg) {
        <p class="ui-field-error" role="alert" data-testid="block-client-error">{{ msg }}</p>
      }
      <div class="flex gap-2">
        <button type="submit" class="ui-btn-primary flex-1" data-testid="block-submit" [disabled]="saving()">
          {{ saving() ? 'Guardando...' : submitLabel() }}
        </button>
        @if (cancellable()) {
          <button type="button" class="ui-btn-secondary" (click)="cancelled.emit()" [disabled]="saving()">Cancelar</button>
        }
      </div>
    </form>
  `,
})
export class BlockFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly locations = input.required<CatalogLocationDto[]>();
  readonly initial = input<BlockRequest | null>(null);
  readonly submitLabel = input('Publicar bloque');
  readonly saving = input(false);
  readonly cancellable = input(false);
  readonly submitted = output<BlockRequest>();
  readonly cancelled = output<void>();

  readonly uid = `block-${++nextId}`;
  readonly today = todayInBogota();
  readonly times = halfHourOptions(6, 21);
  readonly endTimes = halfHourOptions(6, 22).slice(1);
  readonly touched = signal(false);

  readonly form = this.fb.nonNullable.group({
    date: [addDays(this.today, 1), Validators.required],
    startTime: ['08:00', Validators.required],
    endTime: ['12:00', Validators.required],
    locationCode: ['', Validators.required],
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly durationLabel = computed(() => {
    const v = { ...this.form.getRawValue(), ...this.value() };
    const minutes = toMinutes(v.endTime ?? '') - toMinutes(v.startTime ?? '');
    return minutes > 0 ? `${minutes} minutos (${minutes / 30} cupos de 30 min)` : '—';
  });

  readonly clientError = computed(() => validate({ ...this.form.getRawValue(), ...this.value() } as BlockRequest));

  ngOnInit() {
    const init = this.initial();
    if (init) {
      this.form.reset({ ...init, startTime: hhmm(init.startTime), endTime: hhmm(init.endTime) });
    } else if (this.locations().length === 1) {
      this.form.controls.locationCode.setValue(this.locations()[0].code);
    }
  }

  submit() {
    if (this.saving()) return;
    this.touched.set(true);
    const v = this.form.getRawValue();
    if (this.form.invalid || validate(v)) return;
    this.submitted.emit(v);
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Comprobaciones de UX equivalentes a las reglas de HU-012 (el backend decide). */
export function validate(v: BlockRequest, now: string = nowInBogota()): string | null {
  if (!v.date || !v.startTime || !v.endTime) return 'Completa fecha y horas del bloque.';
  if (!v.locationCode) return 'Selecciona la sede del bloque.';
  if (!/:(00|30)$/.test(hhmm(v.startTime)) || !/:(00|30)$/.test(hhmm(v.endTime))) return 'Las horas deben estar en :00 o :30.';
  if (toMinutes(v.endTime) <= toMinutes(v.startTime)) return 'La hora de fin debe ser posterior a la de inicio.';
  if (`${v.date}T${hhmm(v.startTime)}` <= now) return 'El bloque debe iniciar en el futuro.';
  return null;
}
