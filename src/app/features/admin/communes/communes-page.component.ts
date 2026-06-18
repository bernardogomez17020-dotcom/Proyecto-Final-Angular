import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { City, Commune, Department } from '../../../core/models/territorial.models';
import {
  ColombiaApiCity,
  ColombiaApiDepartment,
  ColombiaApiService,
} from '../../../core/services/colombia-api.service';
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
  private readonly colombiaApi = inject(ColombiaApiService);

  items: Commune[] = [];
  localDepartments: Department[] = [];
  localCities: City[] = [];

  colombiaDepartments: ColombiaApiDepartment[] = [];
  colombiaCities: ColombiaApiCity[] = [];
  deptSuggestions: ColombiaApiDepartment[] = [];
  citySuggestions: ColombiaApiCity[] = [];

  deptQuery = '';
  cityQuery = '';
  selectedColombiaDept: ColombiaApiDepartment | null = null;
  selectedColombiaCity: ColombiaApiCity | null = null;
  showDeptDropdown = false;
  showCityDropdown = false;
  loadingCities = false;

  editingId: number | null = null;
  message = '';
  error = '';
  form: Partial<Commune> = this.emptyForm();

  ngOnInit(): void {
    this.api.departments().subscribe((d) => (this.localDepartments = d));
    this.api.cities().subscribe((c) => (this.localCities = c));
    this.colombiaApi.departments().subscribe((d) => (this.colombiaDepartments = d));
    this.load();
  }

  load(): void {
    this.api.communes().subscribe({
      next: (items) => (this.items = items),
      error: (e) => this.setError(e),
    });
  }

  onDeptQueryChange(): void {
    const q = this.deptQuery.trim().toLowerCase();
    if (!q) {
      this.deptSuggestions = [];
      this.showDeptDropdown = false;
      return;
    }
    this.deptSuggestions = this.colombiaDepartments
      .filter((d) => d.name.toLowerCase().includes(q))
      .slice(0, 8);
    this.showDeptDropdown = this.deptSuggestions.length > 0;
  }

  selectDept(dept: ColombiaApiDepartment): void {
    this.selectedColombiaDept = dept;
    this.deptQuery = dept.name;
    this.showDeptDropdown = false;
    this.deptSuggestions = [];

    this.selectedColombiaCity = null;
    this.cityQuery = '';
    this.colombiaCities = [];
    this.citySuggestions = [];
    this.form.id_city = 0;

    this.loadingCities = true;
    this.colombiaApi.citiesByDepartment(dept.id).subscribe({
      next: (cities) => {
        this.colombiaCities = cities.sort((a, b) => a.name.localeCompare(b.name));
        this.loadingCities = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las ciudades desde API Colombia.';
        this.loadingCities = false;
      },
    });
  }

  onCityQueryChange(): void {
    const q = this.cityQuery.trim().toLowerCase();
    if (!q) {
      this.citySuggestions = [];
      this.showCityDropdown = false;
      return;
    }
    this.citySuggestions = this.colombiaCities
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
    this.showCityDropdown = this.citySuggestions.length > 0;
  }

  selectCity(city: ColombiaApiCity): void {
    this.selectedColombiaCity = city;
    this.cityQuery = city.name;
    this.showCityDropdown = false;
    this.citySuggestions = [];

    const daneCode = String(city.id).padStart(5, '0');
    const localCity = this.localCities.find((c) => c.dane_code === daneCode);
    this.form.id_city = localCity?.id_city ?? 0;

    if (!localCity) {
      this.error = `La ciudad "${city.name}" no existe en el sistema local. Ejecuta el seed del backend.`;
    }
  }

  cityName(id: number): string {
    return this.localCities.find((c) => c.id_city === id)?.name || String(id);
  }

  deptNameForCity(cityId: number): string {
    const city = this.localCities.find((c) => c.id_city === cityId);
    if (!city) return '—';
    return this.localDepartments.find((d) => d.id_department === city.id_department)?.name || '—';
  }

  edit(item: Commune): void {
    this.editingId = item.id_commune;
    this.form = { ...item };

    const localCity = this.localCities.find((c) => c.id_city === item.id_city);
    if (localCity) {
      const localDept = this.localDepartments.find((d) => d.id_department === localCity.id_department);
      if (localDept) {
        const apiDeptId = parseInt(localDept.dane_code, 10);
        const apiDept = this.colombiaDepartments.find((d) => d.id === apiDeptId);
        if (apiDept) {
          this.selectedColombiaDept = apiDept;
          this.deptQuery = apiDept.name;

          this.loadingCities = true;
          this.colombiaApi.citiesByDepartment(apiDept.id).subscribe({
            next: (cities) => {
              this.colombiaCities = cities.sort((a, b) => a.name.localeCompare(b.name));
              const apiCityId = parseInt(localCity.dane_code, 10);
              const apiCity = cities.find((c) => c.id === apiCityId);
              if (apiCity) {
                this.selectedColombiaCity = apiCity;
                this.cityQuery = apiCity.name;
              }
              this.loadingCities = false;
            },
            error: () => (this.loadingCities = false),
          });
        }
      }
    }
  }

  reset(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.deptQuery = '';
    this.cityQuery = '';
    this.selectedColombiaDept = null;
    this.selectedColombiaCity = null;
    this.colombiaCities = [];
    this.deptSuggestions = [];
    this.citySuggestions = [];
    this.showDeptDropdown = false;
    this.showCityDropdown = false;
  }

  save(): void {
    this.message = '';
    this.error = '';

    if (!this.form.id_city) {
      this.error = 'Selecciona un departamento y una ciudad de la API Colombia.';
      return;
    }

    const payload = {
      id_city: this.form.id_city,
      name: this.form.name,
      status: this.form.status,
    };
    const req = this.editingId
      ? this.api.updateCommune(this.editingId, payload)
      : this.api.createCommune(payload);

    req.subscribe({
      next: () => {
        this.message = 'Guardado';
        this.reset();
        this.load();
      },
      error: (e) => this.setError(e),
    });
  }

  remove(item: Commune): void {
    if (!confirm(`Eliminar comuna "${item.name}"?`)) return;
    this.api.deleteCommune(item.id_commune).subscribe({
      next: () => { this.message = 'Eliminada'; this.load(); },
      error: (e) => this.setError(e),
    });
  }

  private emptyForm(): Partial<Commune> {
    return { id_city: 0, name: '', status: 'active' };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
