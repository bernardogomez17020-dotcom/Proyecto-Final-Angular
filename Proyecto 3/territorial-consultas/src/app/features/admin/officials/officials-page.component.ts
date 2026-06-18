import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Entity, Official } from '../../../core/models/territorial.models';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { formatApiError } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-officials-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './officials-page.component.html',
  styleUrl: './officials-page.component.scss',
})
export class OfficialsPageComponent implements OnInit {
  private readonly api = inject(TerritorialApiService);

  items: Official[] = [];
  entities: Entity[] = [];
  editingId: number | null = null;
  message = '';
  error = '';
  form: Partial<Official> = this.emptyForm();

  ngOnInit(): void {
    this.api.entities().subscribe((entities) => (this.entities = entities));
    this.load();
  }

  load(): void {
    this.api.officials().subscribe({
      next: (items) => (this.items = items),
      error: (err) => this.setError(err),
    });
  }

  edit(item: Official): void {
    this.editingId = item.id_official;
    this.form = { ...item };
  }

  reset(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  save(): void {
    const request = this.editingId
      ? this.api.updateOfficial(this.editingId, this.form)
      : this.api.createOfficial(this.form);

    request.subscribe({
      next: () => {
        this.message = this.editingId ? 'Funcionario actualizado' : 'Funcionario creado';
        this.reset();
        this.load();
      },
      error: (err) => this.setError(err),
    });
  }

  remove(item: Official): void {
    if (!confirm(`Eliminar funcionario "${item.name}"?`)) return;
    this.api.deleteOfficial(item.id_official).subscribe({
      next: () => { this.message = 'Funcionario eliminado'; this.load(); },
      error: (err) => this.setError(err),
    });
  }

  entityName(id: number): string {
    return this.entities.find((e) => e.id_entity === id)?.name || String(id);
  }

  private emptyForm(): Partial<Official> {
    return { id_entity: 0, name: '', email: '', phone: '', role: 'funcionario', status: 'active', gps_active: true };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
