import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BlockFormComponent } from './block-form';
import { BlockRequest, CalendarBlockDto, ProfessionalApi } from '../../../core/api/professional.api';
import { CatalogApi, CatalogLocationDto } from '../../../core/api/catalog.api';
import { errorMessage } from '../../../core/api/api-errors';
import { formatLongDate, hhmm } from '../../../core/time/bogota-time';

/** Disponibilidad del profesional: publicar bloques (HU-012). */
@Component({
  selector: 'app-professional-blocks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlockFormComponent],
  template: `
    <div class="grid md:grid-cols-[1fr_1.5fr] gap-5">
      <section class="ui-card flex flex-col gap-3" aria-labelledby="block-create-title">
        <h2 id="block-create-title" class="ui-section-title">Publicar bloque futuro</h2>
        <div role="status" aria-live="polite">
          @if (locationsLoading()) { <p class="ui-empty">Cargando sedes...</p> }
          @if (createMessage()) { <p class="ui-alert-success" data-testid="block-created">{{ createMessage() }}</p> }
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          @if (createError()) { <p class="ui-alert-error" data-testid="block-create-error">{{ createError() }}</p> }
        </div>
        @if (!locationsLoading() && activeLocations().length === 0 && !createError()) {
          <p class="ui-empty">No hay sedes activas disponibles.</p>
        }
        @if (activeLocations().length > 0) {
          <app-block-form [locations]="activeLocations()" [saving]="creating()" (submitted)="create($event)" />
        }
      </section>
    </div>
  `,
})
export class BlocksComponent {
  protected readonly api = inject(ProfessionalApi);
  private readonly catalogs = inject(CatalogApi);

  readonly locations = signal<CatalogLocationDto[]>([]);
  readonly locationsLoading = signal(true);
  readonly activeLocations = computed(() => this.locations().filter((l) => l.active));

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly createMessage = signal('');

  constructor() {
    this.catalogs.getCatalogs().subscribe({
      next: (c) => {
        this.locations.set(c.locations);
        this.locationsLoading.set(false);
      },
      error: (e: unknown) => {
        this.createError.set(errorMessage(e, 'No fue posible cargar las sedes.'));
        this.locationsLoading.set(false);
      },
    });
  }

  describe(b: Pick<CalendarBlockDto, 'date' | 'startTime' | 'endTime'>): string {
    return `${formatLongDate(b.date)}, ${hhmm(b.startTime)}–${hhmm(b.endTime)}`;
  }

  create(request: BlockRequest) {
    this.creating.set(true);
    this.createError.set(null);
    this.createMessage.set('');
    this.api.createBlock(request).subscribe({
      next: () => {
        this.creating.set(false);
        this.createMessage.set(`Bloque publicado: ${this.describe(request)}.`);
        this.afterChange();
      },
      error: (e: unknown) => {
        this.creating.set(false);
        this.createError.set(errorMessage(e, 'No fue posible publicar el bloque.'));
      },
    });
  }

  /** Punto de extensión para refrescar el calendario (HU-014). */
  protected afterChange(): void {
    // Sin calendario aún.
  }
}
