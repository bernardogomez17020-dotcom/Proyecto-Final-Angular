import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Entity } from '../../../core/models/territorial.models';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { formatApiError } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-entities-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entities-page.component.html',
  styleUrl: './entities-page.component.scss',
})
export class EntitiesPageComponent implements OnInit {
  private readonly api = inject(TerritorialApiService);

  items: Entity[] = [];
  editingId: number | null = null;
  message = '';
  error = '';
  selectedFile: File | null = null;

  form: Partial<Entity> = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.entities().subscribe({
      next: (items) => (this.items = items),
      error: (err) => this.setError(err),
    });
  }

  edit(item: Entity): void {
    this.editingId = item.id_entity;
    this.form = { ...item };
    this.selectedFile = null;
  }

  reset(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.selectedFile = null;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  save(): void {
    this.message = '';
    this.error = '';

    const formData = new FormData();
    Object.entries(this.form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'id_entity') {
        formData.append(key, String(value));
      }
    });

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    const request = this.editingId
      ? this.api.updateEntity(this.editingId, formData)
      : this.api.createEntity(formData);

    request.subscribe({
      next: () => {
        this.message = this.editingId ? 'Entidad actualizada' : 'Entidad creada';
        this.reset();
        this.load();
      },
      error: (err) => this.setError(err),
    });
  }

  remove(item: Entity): void {
    if (!confirm(`Eliminar entidad "${item.name}"?`)) {
      return;
    }

    this.api.deleteEntity(item.id_entity).subscribe({
      next: () => {
        this.message = 'Entidad eliminada';
        this.load();
      },
      error: (err) => this.setError(err),
    });
  }

  imageUrl(item: Entity): string | null {
    return this.api.imageUrl(item.logo_url);
  }

  private emptyForm(): Partial<Entity> {
    return { name: '', description: '', entity_type: 'publica', nit: '', phone: '', email: '', address: '', status: 'active' };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
