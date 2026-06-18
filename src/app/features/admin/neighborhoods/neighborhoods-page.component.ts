import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { City, Commune, Department, Neighborhood } from '../../../core/models/territorial.models';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { formatApiError } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-neighborhoods-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './neighborhoods-page.component.html',
  styleUrl: './neighborhoods-page.component.scss',
})
export class NeighborhoodsPageComponent implements OnInit {
  private readonly api = inject(TerritorialApiService);
  items: Neighborhood[] = [];
  departments: Department[] = [];
  cities: City[] = [];
  communes: Commune[] = [];
  filteredCities: City[] = [];
  filteredCommunes: Commune[] = [];
  editingId: number | null = null;
  selectedDepartmentId = 0;
  selectedCityId = 0;
  message = '';
  error = '';
  form: Partial<Neighborhood> = this.emptyForm();

  ngOnInit(): void {
    this.api.departments().subscribe((d) => (this.departments = d));
    this.api.cities().subscribe((c) => {
      this.cities = c;
      this.filteredCities = c;
    });
    this.api.communes().subscribe((c) => {
      this.communes = c;
      this.filteredCommunes = c;
    });
    this.load();
  }

  load(): void {
    this.api.neighborhoods().subscribe({ next: (items) => (this.items = items), error: (e) => this.setError(e) });
  }

  onDepartmentChange(): void {
    this.filteredCities = this.selectedDepartmentId
      ? this.cities.filter((c) => c.id_department === this.selectedDepartmentId)
      : this.cities;
    this.selectedCityId = 0;
    this.filteredCommunes = [];
    this.form.id_commune = 0;
  }

  onCityChange(): void {
    this.filteredCommunes = this.selectedCityId
      ? this.communes.filter((c) => c.id_city === this.selectedCityId)
      : this.communes;
    this.form.id_commune = 0;
  }

  communeName(id: number): string {
    return this.communes.find((c) => c.id_commune === id)?.name || String(id);
  }

  edit(item: Neighborhood): void {
    this.editingId = item.id_neighborhood;
    this.form = { ...item };
    const commune = this.communes.find((c) => c.id_commune === item.id_commune);
    const city = commune ? this.cities.find((c) => c.id_city === commune.id_city) : undefined;
    this.selectedDepartmentId = city?.id_department || 0;
    this.selectedCityId = city?.id_city || 0;
    this.filteredCities = this.selectedDepartmentId
      ? this.cities.filter((c) => c.id_department === this.selectedDepartmentId)
      : this.cities;
    this.filteredCommunes = this.selectedCityId
      ? this.communes.filter((c) => c.id_city === this.selectedCityId)
      : this.communes;
  }

  reset(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.selectedDepartmentId = 0;
    this.selectedCityId = 0;
    this.filteredCities = this.cities;
    this.filteredCommunes = this.communes;
  }

  save(): void {
    this.message = '';
    this.error = '';
    const payload = {
      id_commune: this.form.id_commune,
      name: this.form.name,
      status: this.form.status,
    };
    const req = this.editingId
      ? this.api.updateNeighborhood(this.editingId, payload)
      : this.api.createNeighborhood(payload);
    req.subscribe({
      next: () => { this.message = 'Guardado'; this.reset(); this.load(); },
      error: (e) => { this.message = ''; this.setError(e); },
    });
  }

  remove(item: Neighborhood): void {
    if (!confirm(`Eliminar barrio "${item.name}"?`)) return;
    this.message = '';
    this.error = '';
    this.api.deleteNeighborhood(item.id_neighborhood).subscribe({
      next: () => { this.message = 'Eliminado'; this.load(); },
      error: (e) => { this.message = ''; this.setError(e); },
    });
  }

  private emptyForm(): Partial<Neighborhood> {
    return { id_commune: 0, name: '', status: 'active' };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
