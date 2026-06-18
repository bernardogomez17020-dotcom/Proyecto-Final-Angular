import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-pin-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-pin-picker">
      <p class="hint">Haz clic en el mapa para colocar el pin de ubicacion.</p>
      <div #mapContainer class="map-container"></div>
      @if (latitude != null && longitude != null) {
        <p class="coords">Lat: {{ latitude | number: '1.4-6' }}, Lng: {{ longitude | number: '1.4-6' }}</p>
      }
    </div>
  `,
  styles: [
    `
      .map-pin-picker {
        display: grid;
        gap: 0.5rem;
      }

      .hint,
      .coords {
        margin: 0;
        font-size: 0.85rem;
        color: #475569;
      }

      .map-container {
        height: 280px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
      }
    `,
  ],
})
export class MapPinPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() latitude: number | null = 5.0689;
  @Input() longitude: number | null = -75.5174;

  @Output() locationChange = new EventEmitter<{ latitude: number; longitude: number }>();

  private map?: L.Map;
  private marker?: L.Marker;
  private initialized = false;

  ngAfterViewInit(): void {
    this.initMap();
    this.initialized = true;
    this.syncMarker();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) {
      return;
    }
    if (changes['latitude'] || changes['longitude']) {
      this.syncMarker();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    const lat = this.latitude ?? 5.0689;
    const lng = this.longitude ?? -75.5174;

    this.map = L.map(this.mapContainer.nativeElement).setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.latitude = event.latlng.lat;
      this.longitude = event.latlng.lng;
      this.syncMarker(false);
      this.locationChange.emit({ latitude: this.latitude, longitude: this.longitude });
    });
  }

  private syncMarker(pan = true): void {
    if (!this.map || this.latitude == null || this.longitude == null) {
      return;
    }

    const latlng = L.latLng(this.latitude, this.longitude);
    if (this.marker) {
      this.marker.setLatLng(latlng);
    } else {
      this.marker = L.marker(latlng).addTo(this.map);
    }

    if (pan) {
      this.map.setView(latlng, this.map.getZoom());
    }
  }
}
