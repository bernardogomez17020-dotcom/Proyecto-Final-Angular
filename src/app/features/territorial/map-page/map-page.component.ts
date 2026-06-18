import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Subscription, catchError, forkJoin, of } from 'rxjs';

import {
  Annotation,
  AnnotationCategory,
  Category,
  Citizen,
  Entity,
  Evidence,
  Neighborhood,
  Official,
  Point,
  Vote,
} from '../../../core/models/territorial.models';
import { AuthService } from '../../../core/services/auth.service';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { TrackingService } from '../../../core/services/tracking.service';
import { formatApiError } from '../../../shared/utils/api-error';
import { pointInPolygon } from '../../../shared/utils/polygon';

type MapMode = 'view' | 'demarcate' | 'annotate' | 'tracking';

interface DraftVertex {
  latlng: L.LatLng;
  pointId?: number;
}

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
})
export class MapPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private readonly api = inject(TerritorialApiService);
  readonly auth = inject(AuthService);
  private readonly tracking = inject(TrackingService);

  private map!: L.Map;
  private polygonLayer: L.Polygon | null = null;
  private draftVertices: DraftVertex[] = [];
  private draftMarkers: L.Marker[] = [];
  private annotationMarkers = new Map<number, L.CircleMarker>();
  private officialMarkers = new Map<number, L.CircleMarker>();
  private trackingSub?: Subscription;
  private staleCheckInterval?: ReturnType<typeof setInterval>;
  private readonly lastTrackingAt = new Map<number, number>();
  private readonly boundaryPointsByNeighborhood = new Map<number, Point[]>();

  neighborhoods: Neighborhood[] = [];
  categories: Category[] = [];
  citizens: Citizen[] = [];
  entities: Entity[] = [];
  officials: Official[] = [];
  annotations: Annotation[] = [];
  annotationCategories: AnnotationCategory[] = [];
  votes: Vote[] = [];
  boundaryPoints: Point[] = [];

  selectedNeighborhoodId = 0;
  selectedEntityFilter = 0;
  selectedCategoryFilters = new Set<number>();
  expandedCategoryIds = new Set<number>();
  mode: MapMode = 'view';

  message = '';
  error = '';
  filteredAnnotationCount = 0;

  selectedAnnotation: Annotation | null = null;
  evidences: Evidence[] = [];
  annotationLatLng: L.LatLng | null = null;

  annotationForm = {
    description: '',
    id_citizen: 0,
    status: 'open',
  };

  annotationCategorySelections = new Set<number>();
  annotationEntitySelections = new Set<number>();

  voteForm = { stars: 5, comment: '' };
  voteCitizenId = 0;
  selectedFiles: File[] = [];

  ngAfterViewInit(): void {
    this.initMap();
    this.loadCatalogs();
  }

  ngOnDestroy(): void {
    this.stopTracking();
    this.tracking.disconnect();
    this.map?.remove();
  }

  loadCatalogs(): void {
    forkJoin({
      neighborhoods: this.api.neighborhoods(),
      categories: this.api.categories(),
      citizens: this.api.citizens(),
      entities: this.api.entities(),
      officials: this.api.officials(),
      annotations: this.api.annotations(),
      annotationCategories: this.api.annotationCategories(),
      votes: this.api.votes(),
      allPoints: this.api.points(),
    }).subscribe({
      next: (data) => {
        Object.assign(this, data);
        this.groupBoundaryPoints(data.allPoints);
        this.renderAnnotations();
      },
      error: (err) => this.setError(err),
    });
  }

  onNeighborhoodChange(): void {
    if (!this.selectedNeighborhoodId) {
      this.boundaryPoints = [];
      this.clearDraft();
      this.clearPolygon();
      this.renderAnnotations();
      return;
    }

    this.boundaryPoints = this.boundaryPointsByNeighborhood.get(this.selectedNeighborhoodId) || [];

    if (this.mode === 'demarcate' && this.canDemarcate()) {
      this.loadDraftFromBoundary();
    } else {
      this.clearDraft();
      this.drawSavedPolygon();
    }

    this.renderAnnotations();
  }

  setMode(mode: MapMode): void {
    this.mode = mode;
    this.message = `Modo activo: ${mode}`;

    if (mode === 'tracking') {
      this.startTracking();
      return;
    }

    this.stopTracking();

    if (mode === 'demarcate' && this.canDemarcate() && this.selectedNeighborhoodId) {
      this.boundaryPoints = this.boundaryPointsByNeighborhood.get(this.selectedNeighborhoodId) || [];
      this.loadDraftFromBoundary();
    } else if (mode !== 'demarcate') {
      this.clearDraft();
      if (this.selectedNeighborhoodId) {
        this.drawSavedPolygon();
      }
    }

    if (mode === 'annotate') {
      this.applyCitizenDefaults();
    }
  }

  clearDraft(): void {
    this.draftVertices = [];
    this.draftMarkers.forEach((marker) => marker.remove());
    this.draftMarkers = [];

    if (this.mode === 'demarcate') {
      this.drawDraftPolygon();
    }
  }

  removeLastVertex(): void {
    if (!this.draftVertices.length) {
      return;
    }

    this.draftVertices.pop();
    this.draftMarkers.pop()?.remove();
    this.drawDraftPolygon();
  }

  savePolygon(): void {
    if (!this.selectedNeighborhoodId || this.draftVertices.length < 3) {
      this.error = 'Selecciona un barrio y al menos 3 puntos para guardar el poligono.';
      return;
    }

    this.message = '';
    this.error = '';

    this.api.points(this.selectedNeighborhoodId).subscribe({
      next: (points) => {
        this.boundaryPoints = points
          .filter((point) => point.point_type === 'boundary')
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        this.persistPolygonChanges();
      },
      error: (err) => this.setError(err),
    });
  }

  private persistPolygonChanges(): void {
    const draftIds = new Set(
      this.draftVertices
        .map((vertex) => vertex.pointId)
        .filter((id): id is number => !!id),
    );
    const removed = this.boundaryPoints.filter((point) => !draftIds.has(point.id_point));

    const deleteRequests = removed.map((point) =>
      this.api.deletePoint(point.id_point).pipe(
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(null);
          }
          throw err;
        }),
      ),
    );

    const vertexRequests = this.draftVertices.map((vertex, index) =>
      this.persistPolygonVertex(vertex, index),
    );

    const allRequests = [...deleteRequests, ...vertexRequests];

    if (!allRequests.length) {
      this.message = 'Sin cambios para guardar';
      return;
    }

    forkJoin(allRequests).subscribe({
      next: () => {
        this.message = 'Poligono guardado';
        this.reloadBoundaryPoints();
      },
      error: (err) => this.setError(err),
    });
  }

  private persistPolygonVertex(vertex: DraftVertex, index: number) {
    const order = index + 1;
    const coords = {
      latitude: vertex.latlng.lat,
      longitude: vertex.latlng.lng,
      order,
    };

    if (!vertex.pointId) {
      return this.api.createPoint({
        id_neighborhood: this.selectedNeighborhoodId,
        ...coords,
        point_type: 'boundary',
      });
    }

    return this.api.updatePoint(vertex.pointId, coords).pipe(
      catchError((err) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return this.api.createPoint({
            id_neighborhood: this.selectedNeighborhoodId,
            ...coords,
            point_type: 'boundary',
          });
        }
        throw err;
      }),
    );
  }

  toggleAnnotationCategory(id: number): void {
    if (this.annotationCategorySelections.has(id)) {
      this.annotationCategorySelections.delete(id);
    } else {
      this.annotationCategorySelections.add(id);
    }
  }

  toggleAnnotationEntity(id: number): void {
    if (this.annotationEntitySelections.has(id)) {
      this.annotationEntitySelections.delete(id);
    } else {
      this.annotationEntitySelections.add(id);
    }
  }

  toggleCategoryExpand(id: number): void {
    if (this.expandedCategoryIds.has(id)) {
      this.expandedCategoryIds.delete(id);
    } else {
      this.expandedCategoryIds.add(id);
    }
  }

  isCategoryExpanded(id: number): boolean {
    return this.expandedCategoryIds.has(id);
  }

  toggleCategoryFilter(id: number): void {
    const isParent = this.parentCategories().some((category) => category.id_category === id);

    if (isParent) {
      const childIds = this.subcategories(id).map((category) => category.id_category);
      const allIds = [id, ...childIds];
      const selecting = !this.selectedCategoryFilters.has(id);

      allIds.forEach((categoryId) => {
        if (selecting) {
          this.selectedCategoryFilters.add(categoryId);
        } else {
          this.selectedCategoryFilters.delete(categoryId);
        }
      });
    } else if (this.selectedCategoryFilters.has(id)) {
      this.selectedCategoryFilters.delete(id);
    } else {
      this.selectedCategoryFilters.add(id);
    }

    this.renderAnnotations();
  }

  clearCategoryFilters(): void {
    this.selectedCategoryFilters.clear();
    this.renderAnnotations();
  }

  categoryCount(id: number): number {
    const childIds = this.subcategories(id).map((category) => category.id_category);
    const ids = new Set([id, ...childIds]);
    return this.getTerritoriallyFilteredAnnotations().filter((annotation) =>
      this.annotationCategories.some(
        (link) => link.id_annotation === annotation.id_annotation && ids.has(link.id_category),
      ),
    ).length;
  }

  subcategories(parentId: number): Category[] {
    return this.categories.filter((category) => category.id_parent_category === parentId);
  }

  parentCategories(): Category[] {
    return this.categories.filter((category) => !category.id_parent_category);
  }

  get draftVertexCount(): number {
    return this.draftVertices.length;
  }

  annotationAllCategories(annotationId: number): Array<{ parentName: string; subName: string }> {
    const links = this.annotationCategories.filter((item) => item.id_annotation === annotationId);
    if (!links.length) return [];

    return links.map((link) => {
      const category = this.categories.find((item) => item.id_category === link.id_category);
      if (!category) return { parentName: '—', subName: '—' };

      if (category.id_parent_category) {
        const parent = this.categories.find((item) => item.id_category === category.id_parent_category);
        return { parentName: parent?.name || '—', subName: category.name };
      }

      return { parentName: category.name, subName: '—' };
    });
  }

  averageRatingValue(annotationId: number): number {
    const related = this.votes.filter((v) => v.id_annotation === annotationId);
    if (!related.length) return 0;
    return related.reduce((sum, v) => sum + v.stars, 0) / related.length;
  }

  starsArray(value: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(value));
  }

  voteCount(annotationId: number): number {
    return this.votes.filter((v) => v.id_annotation === annotationId).length;
  }

  saveAnnotation(): void {
    if (!this.annotationForm.description.trim() || !this.annotationForm.id_citizen) {
      this.error = 'Descripcion y ciudadano son obligatorios.';
      return;
    }

    if (!this.annotationLatLng) {
      this.error = 'Haz clic en el mapa para ubicar la anotacion.';
      return;
    }

    const detectedNeighborhoodId = this.detectNeighborhood(
      this.annotationLatLng.lat,
      this.annotationLatLng.lng,
    );

    let neighborhoodId = detectedNeighborhoodId || this.selectedNeighborhoodId || undefined;

    if (!detectedNeighborhoodId) {
      const confirmed = confirm(
        'La anotacion esta fuera de cualquier barrio demarcado. Desea guardarla de todas formas?',
      );
      if (!confirmed) {
        return;
      }
    }

    const payload: Partial<Annotation> = {
      description: this.annotationForm.description,
      id_citizen: this.annotationForm.id_citizen,
      id_neighborhood: neighborhoodId,
      latitude: this.annotationLatLng.lat,
      longitude: this.annotationLatLng.lng,
      status: this.annotationForm.status,
    };

    this.api.createAnnotation(payload).subscribe({
      next: (created) => {
        this.annotationCategorySelections.forEach((id_category) => {
          this.api
            .createAnnotationCategory({ id_annotation: created.id_annotation, id_category })
            .subscribe();
        });

        this.annotationEntitySelections.forEach((id_entity) => {
          this.api
            .createInterestedParty({ id_annotation: created.id_annotation, id_entity })
            .subscribe();
        });

        this.uploadEvidences(created.id_annotation);
        this.message = 'Anotacion creada';
        this.annotationForm = { description: '', id_citizen: 0, status: 'open' };
        this.annotationCategorySelections = new Set();
        this.annotationEntitySelections = new Set();
        this.annotationLatLng = null;
        this.applyCitizenDefaults();
        this.loadCatalogs();
      },
      error: (err) => this.setError(err),
    });
  }

  openAnnotation(annotation: Annotation): void {
    this.selectedAnnotation = { ...annotation };
    this.api.evidences(annotation.id_annotation).subscribe((evidences) => (this.evidences = evidences));

    const existing = this.votes.find((vote) => vote.id_annotation === annotation.id_annotation);
    if (existing) {
      this.voteForm = { stars: existing.stars, comment: existing.comment || '' };
    } else {
      this.voteForm = { stars: 5, comment: '' };
    }

    const citizenId = this.auth.user()?.citizenId;
    this.voteCitizenId = citizenId || 0;
  }

  updateAnnotationStatus(): void {
    if (!this.selectedAnnotation || !this.canManageAnnotationStatus()) {
      return;
    }

    this.api
      .updateAnnotation(this.selectedAnnotation.id_annotation, {
        status: this.selectedAnnotation.status,
      })
      .subscribe({
        next: (updated) => {
          this.message = 'Estado actualizado';
          const index = this.annotations.findIndex(
            (annotation) => annotation.id_annotation === updated.id_annotation,
          );
          if (index >= 0) {
            this.annotations[index] = updated;
          }
          this.selectedAnnotation = updated;
          this.renderAnnotations();
        },
        error: (err) => this.setError(err),
      });
  }

  deleteSelectedAnnotation(): void {
    if (!this.selectedAnnotation || !this.canDeleteSelectedAnnotation()) {
      return;
    }

    if (!confirm('Desea eliminar esta anotacion?')) {
      return;
    }

    const id = this.selectedAnnotation.id_annotation;
    this.api.deleteAnnotation(id).subscribe({
      next: () => {
        this.message = 'Anotacion eliminada';
        this.selectedAnnotation = null;
        this.evidences = [];
        this.loadCatalogs();
      },
      error: (err) => this.setError(err),
    });
  }

  saveVote(): void {
    if (!this.selectedAnnotation || !this.voteCitizenId) {
      this.error = 'No se pudo identificar al ciudadano para calificar.';
      return;
    }

    const existing = this.votes.find(
      (vote) =>
        vote.id_annotation === this.selectedAnnotation!.id_annotation &&
        vote.id_citizen === this.voteCitizenId,
    );

    const payload = {
      id_annotation: this.selectedAnnotation.id_annotation,
      id_citizen: this.voteCitizenId,
      stars: this.voteForm.stars,
      comment: this.voteForm.comment,
    };

    const request = existing
      ? this.api.updateVote(existing.id_vote, payload)
      : this.api.createVote(payload);

    request.subscribe({
      next: () => {
        this.message = 'Calificacion registrada';
        this.api.votes().subscribe((votes) => (this.votes = votes));
      },
      error: (err) => this.setError(err),
    });
  }

  averageRating(annotationId: number): string {
    const related = this.votes.filter((vote) => vote.id_annotation === annotationId);
    if (!related.length) {
      return 'Sin calificaciones';
    }

    const avg = related.reduce((sum, vote) => sum + vote.stars, 0) / related.length;
    return `${avg.toFixed(1)} / 5 (${related.length})`;
  }

  onFilesSelected(event: Event): void {
    this.selectedFiles = Array.from((event.target as HTMLInputElement).files || []);
  }

  canDemarcate(): boolean {
    return this.auth.hasRole('administrador', 'funcionario');
  }

  canManageAnnotationStatus(): boolean {
    return this.auth.hasRole('administrador', 'funcionario');
  }

  canDeleteSelectedAnnotation(): boolean {
    if (!this.selectedAnnotation) {
      return false;
    }

    if (this.auth.hasRole('administrador', 'funcionario')) {
      return true;
    }

    const citizenId = this.auth.user()?.citizenId;
    return (
      this.auth.hasRole('ciudadano') &&
      !!citizenId &&
      this.selectedAnnotation.id_citizen === citizenId
    );
  }

  canTrack(): boolean {
    return this.auth.hasRole('administrador', 'funcionario');
  }

  showNoFilteredAnnotations(): boolean {
    return this.annotations.length > 0 && this.filteredAnnotationCount === 0;
  }

  neighborhoodName(id?: number | null): string {
    if (!id) {
      return '—';
    }

    return this.neighborhoods.find((neighborhood) => neighborhood.id_neighborhood === id)?.name || `#${id}`;
  }

  private applyCitizenDefaults(): void {
    if (!this.auth.hasRole('ciudadano')) {
      return;
    }

    const citizenId = this.auth.user()?.citizenId;
    if (citizenId) {
      this.annotationForm.id_citizen = citizenId;
    }
  }

  private groupBoundaryPoints(allPoints: Point[]): void {
    this.boundaryPointsByNeighborhood.clear();

    allPoints
      .filter((point) => point.point_type === 'boundary' && point.id_neighborhood)
      .forEach((point) => {
        const neighborhoodId = point.id_neighborhood!;
        const group = this.boundaryPointsByNeighborhood.get(neighborhoodId) || [];
        group.push(point);
        this.boundaryPointsByNeighborhood.set(neighborhoodId, group);
      });

    this.boundaryPointsByNeighborhood.forEach((points) => {
      points.sort((a, b) => a.order - b.order);
    });
  }

  private reloadBoundaryPoints(): void {
    this.api.points().subscribe({
      next: (allPoints) => {
        this.groupBoundaryPoints(allPoints);
        this.onNeighborhoodChange();
      },
      error: (err) => this.setError(err),
    });
  }

  private detectNeighborhood(lat: number, lng: number): number | null {
    for (const [neighborhoodId, points] of this.boundaryPointsByNeighborhood.entries()) {
      if (points.length >= 3 && pointInPolygon(lat, lng, points)) {
        return neighborhoodId;
      }
    }

    return null;
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView([5.0689, -75.5174], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => this.onMapClick(event.latlng));
  }

  private onMapClick(latlng: L.LatLng): void {
    if (this.mode === 'demarcate' && this.canDemarcate()) {
      this.draftVertices.push({ latlng });
      this.addDraftMarker(this.draftVertices.length - 1);
      this.drawDraftPolygon();
      return;
    }

    if (this.mode === 'annotate') {
      this.annotationLatLng = latlng;
      const detectedNeighborhoodId = this.detectNeighborhood(latlng.lat, latlng.lng);

      if (detectedNeighborhoodId) {
        this.selectedNeighborhoodId = detectedNeighborhoodId;
        this.boundaryPoints = this.boundaryPointsByNeighborhood.get(detectedNeighborhoodId) || [];
        this.drawSavedPolygon();
        this.renderAnnotations();
        this.message = `Barrio detectado: ${this.neighborhoodName(detectedNeighborhoodId)}`;
      } else {
        this.message = `Fuera de barrio: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
      }
    }
  }

  private loadDraftFromBoundary(): void {
    this.clearDraft();
    this.clearPolygon();

    this.boundaryPoints.forEach((point) => {
      this.draftVertices.push({
        latlng: L.latLng(point.latitude, point.longitude),
        pointId: point.id_point,
      });
      this.addDraftMarker(this.draftVertices.length - 1);
    });

    this.drawDraftPolygon();

    if (this.draftVertices.length >= 3) {
      const bounds = L.latLngBounds(this.draftVertices.map((vertex) => vertex.latlng));
      this.map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  private addDraftMarker(index: number): void {
    const vertex = this.draftVertices[index];
    const marker = L.marker(vertex.latlng, {
      draggable: true,
      icon: L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#0f766e;border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,.4);"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      }),
    }).addTo(this.map);

    marker.on('drag', () => {
      this.draftVertices[index].latlng = marker.getLatLng();
      this.drawDraftPolygon();
    });

    marker.on('dragstart', () => {
      this.map.dragging.disable();
    });

    marker.on('dragend', () => {
      this.map.dragging.enable();
    });

    this.draftMarkers.push(marker);
  }

  private drawSavedPolygon(): void {
    this.clearPolygon();

    if (this.mode === 'demarcate' || this.boundaryPoints.length < 3) {
      return;
    }

    const latlngs = this.boundaryPoints.map((point) => L.latLng(point.latitude, point.longitude));
    this.polygonLayer = L.polygon(latlngs, { color: '#1d4ed8' }).addTo(this.map);
    this.map.fitBounds(this.polygonLayer.getBounds(), { padding: [20, 20] });
  }

  private drawDraftPolygon(): void {
    if (this.polygonLayer) {
      this.polygonLayer.remove();
      this.polygonLayer = null;
    }

    if (this.draftVertices.length < 2) {
      return;
    }

    const points = this.draftVertices.map((vertex) => vertex.latlng);
    const closed = this.ensureClosedPolygon(points);
    this.polygonLayer = L.polygon(closed, { color: '#0f766e', dashArray: '4' }).addTo(this.map);
  }

  private clearPolygon(): void {
    this.polygonLayer?.remove();
    this.polygonLayer = null;
  }

  private ensureClosedPolygon(points: L.LatLng[]): L.LatLng[] {
    if (points.length < 3) {
      return [...points];
    }

    const first = points[0];
    const last = points[points.length - 1];

    if (first.lat === last.lat && first.lng === last.lng) {
      return [...points];
    }

    return [...points, first];
  }

  private getTerritoriallyFilteredAnnotations(): Annotation[] {
    if (!this.selectedNeighborhoodId) {
      return this.annotations;
    }

    return this.annotations.filter(
      (annotation) => annotation.id_neighborhood === this.selectedNeighborhoodId,
    );
  }

  private getFilteredAnnotations(): Annotation[] {
    return this.getTerritoriallyFilteredAnnotations().filter((annotation) => {
      if (!this.selectedCategoryFilters.size) {
        return true;
      }

      return this.annotationCategories.some(
        (link) =>
          link.id_annotation === annotation.id_annotation &&
          this.selectedCategoryFilters.has(link.id_category),
      );
    });
  }

  private renderAnnotations(): void {
    this.annotationMarkers.forEach((marker) => marker.remove());
    this.annotationMarkers.clear();

    const filtered = this.getFilteredAnnotations();
    this.filteredAnnotationCount = filtered.length;

    filtered.forEach((annotation) => {
      const color = this.colorForAnnotation(annotation.id_annotation);
      const marker = L.circleMarker([annotation.latitude, annotation.longitude], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.85,
      }).addTo(this.map);

      marker.bindPopup(annotation.description);
      marker.on('click', () => this.openAnnotation(annotation));
      this.annotationMarkers.set(annotation.id_annotation, marker);
    });
  }

  private colorForAnnotation(annotationId: number): string {
    const link = this.annotationCategories.find((item) => item.id_annotation === annotationId);
    const palette = ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be123c'];

    if (!link) {
      return palette[0];
    }

    return palette[link.id_category % palette.length];
  }

  private startTracking(): void {
    this.tracking.connect();

    const ids = this.officials
      .filter(
        (official) =>
          (!this.selectedEntityFilter || official.id_entity === this.selectedEntityFilter) &&
          official.gps_active,
      )
      .map((official) => official.id_official);

    if (!ids.length) {
      this.message = 'No hay funcionarios activos con GPS para la entidad seleccionada.';
      return;
    }

    this.api.startTracking(ids).subscribe({
      next: (response) => {
        const started = response.started_ids?.length ?? 0;
        const ignoredCount =
          (response.ignored?.inactive?.length ?? 0) + (response.ignored?.missing?.length ?? 0);

        if (!started) {
          this.error = 'No se pudo iniciar seguimiento para los funcionarios seleccionados.';
          return;
        }

        this.message =
          ignoredCount > 0
            ? `Seguimiento iniciado para ${started} funcionario(s). ${ignoredCount} ignorado(s).`
            : `Seguimiento iniciado para ${started} funcionario(s).`;

        response.officials?.forEach((item) => this.upsertOfficialMarker(item));
      },
      error: (err) => this.setError(err),
    });

    this.staleCheckInterval = setInterval(() => this.updateOfficialMarkerOpacity(), 1000);

    this.trackingSub = this.tracking.updates$.subscribe((payload) => {
      payload.officials.forEach((item) => this.upsertOfficialMarker(item));
    });
  }

  private upsertOfficialMarker(item: {
    id_official: number;
    latitude: number;
    longitude: number;
  }): void {
    const official = this.officials.find((entry) => entry.id_official === item.id_official);
    if (!official) {
      return;
    }

    if (this.selectedEntityFilter && official.id_entity !== this.selectedEntityFilter) {
      return;
    }

    this.lastTrackingAt.set(item.id_official, Date.now());

    const latlng: L.LatLngExpression = [item.latitude, item.longitude];
    const existing = this.officialMarkers.get(item.id_official);

    if (existing) {
      existing.setLatLng(latlng);
    } else {
      const marker = L.circleMarker(latlng, {
        radius: 7,
        color: '#dc2626',
        fillColor: '#dc2626',
        fillOpacity: 0.9,
        opacity: 0.9,
      }).addTo(this.map);

      marker.bindPopup(`${official.name}<br>GPS activo`);
      this.officialMarkers.set(item.id_official, marker);
    }

    this.updateOfficialMarkerOpacity();
  }

  private updateOfficialMarkerOpacity(): void {
    const now = Date.now();

    this.officialMarkers.forEach((marker, officialId) => {
      const lastUpdate = this.lastTrackingAt.get(officialId) ?? 0;
      const stale = now - lastUpdate > 6000;
      const opacity = stale ? 0.4 : 0.9;

      marker.setStyle({ opacity, fillOpacity: opacity });
    });
  }

  private stopTracking(): void {
    this.trackingSub?.unsubscribe();
    this.trackingSub = undefined;

    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = undefined;
    }

    this.lastTrackingAt.clear();
    this.api.stopTracking().subscribe();
    this.officialMarkers.forEach((marker) => marker.remove());
    this.officialMarkers.clear();
  }

  private uploadEvidences(annotationId: number): void {
    this.selectedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append('id_annotation', String(annotationId));
      formData.append('file', file);
      formData.append('file_type', file.type);
      formData.append('file_size', String(file.size));
      this.api.createEvidence(formData).subscribe();
    });

    this.selectedFiles = [];
  }

  evidenceUrl(path: string): string | null {
    return this.api.imageUrl(path);
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
