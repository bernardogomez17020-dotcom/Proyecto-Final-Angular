import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { City, Commune, Department } from '../../../core/models/territorial.models';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { formatApiError } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-communes-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communes-page.component.html',
  styleUrl: './communes-page.component.scss',
})
export class CommunesPageComponent implements OnInit {
  private readonly api = inject(TerritorialApiService);
  items: Commune[] = [];
  departments: Department[] = [];
  cities: City[] = [];
  filteredCities: City[] = [];
  editingId: number | null = null;
  selectedDepartmentId = 0;
  message = '';
  error = '';
  form: Partial<Commune> = this.emptyForm();

  ngOnInit(): void {
    this.api.departments().subscribe((d) => (this.departments = d));
    this.api.cities().subscribe((c) => { this.cities = c; this.filteredCities = c; });
    this.load();
  }

  load(): void {
    this.api.communes().subscribe({ next: (items) => (this.items = items), error: (e) => this.setError(e) });
  }

  onDepartmentChange(): void {
    this.filteredCities = this.selectedDepartmentId
      ? this.cities.filter((c) => c.id_department === this.selectedDepartmentId)
      : this.cities;
    this.form.id_city = 0;
  }

  cityName(id: number): string {
    return this.cities.find((c) => c.id_city === id)?.name || String(id);
  }

  edit(item: Commune): void {
    this.editingId = item.id_commune;
    this.form = { ...item };
    const city = this.cities.find((c) => c.id_city === item.id_city);
    this.selectedDepartmentId = city?.id_department || 0;
    this.filteredCities = this.selectedDepartmentId
      ? this.cities.filter((c) => c.id_department === this.selectedDepartmentId)
      : this.cities;
  }
  reset(): void { this.editingId = null; this.form = this.emptyForm(); }

  save(): void {
    this.message = '';
    this.error = '';
    const payload = {
      id_city: this.form.id_city,
      name: this.form.name,
      status: this.form.status,
    };
    const req = this.editingId
      ? this.api.updateCommune(this.editingId, payload)
      : this.api.createCommune(payload);
    req.subscribe({
      next: () => { this.message = 'Guardado'; this.reset(); this.load(); },
      error: (e) => { this.message = ''; this.setError(e); },
    });
  }

  remove(item: Commune): void {
    if (!confirm(`Eliminar comuna "${item.name}"?`)) return;
    this.api.deleteCommune(item.id_commune).subscribe({ next: () => { this.message = 'Eliminada'; this.load(); }, error: (e) => this.setError(e) });
  }

  private emptyForm(): Partial<Commune> {
    return { id_city: 0, name: '', status: 'active' };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
