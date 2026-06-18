import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Citizen } from '../../../core/models/territorial.models';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { MapPinPickerComponent } from '../../../shared/components/map-pin-picker/map-pin-picker.component';
import { formatApiError } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-citizens-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MapPinPickerComponent],
  templateUrl: './citizens-page.component.html',
  styleUrl: './citizens-page.component.scss',
})
export class CitizensPageComponent implements OnInit {
  private readonly api = inject(TerritorialApiService);
  items: Citizen[] = [];
  editingId: number | null = null;
  message = '';
  error = '';
  form: Partial<Citizen> = this.emptyForm();

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.citizens().subscribe({ next: (items) => (this.items = items), error: (e) => this.setError(e) });
  }

  edit(item: Citizen): void { this.editingId = item.id_citizen; this.form = { ...item }; }
  reset(): void { this.editingId = null; this.form = this.emptyForm(); }

  onLocationChange(coords: { latitude: number; longitude: number }): void {
    this.form.latitude = coords.latitude;
    this.form.longitude = coords.longitude;
  }

  save(): void {
    const req = this.editingId ? this.api.updateCitizen(this.editingId, this.form) : this.api.createCitizen(this.form);
    req.subscribe({ next: () => { this.message = 'Guardado'; this.reset(); this.load(); }, error: (e) => this.setError(e) });
  }

  remove(item: Citizen): void {
    if (!confirm(`Eliminar ciudadano "${item.name}"?`)) return;
    this.api.deleteCitizen(item.id_citizen).subscribe({ next: () => { this.message = 'Eliminado'; this.load(); }, error: (e) => this.setError(e) });
  }

  private emptyForm(): Partial<Citizen> {
    return { name: '', email: '', phone: '', address: '', latitude: 5.0689, longitude: -75.5174, status: 'active' };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
