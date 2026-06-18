import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Annotation,
  AnnotationCategory,
  Category,
  Citizen,
  City,
  Commune,
  Department,
  Entity,
  Evidence,
  InterestedParty,
  Neighborhood,
  Official,
  Point,
  TrackingPayload,
  TrackingStartResponse,
  Vote,
} from '../models/territorial.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class TerritorialApiService {
  private readonly api = inject(ApiService);

  departments(): Observable<Department[]> {
    return this.api.getAll<Department>('/api/departments');
  }

  cities(idDepartment?: number): Observable<City[]> {
    return idDepartment
      ? this.api.search<City>('/api/cities', { id_department: idDepartment })
      : this.api.getAll<City>('/api/cities');
  }

  communes(idCity?: number): Observable<Commune[]> {
    return idCity
      ? this.api.search<Commune>('/api/communes', { id_city: idCity })
      : this.api.getAll<Commune>('/api/communes');
  }

  neighborhoods(idCommune?: number): Observable<Neighborhood[]> {
    return idCommune
      ? this.api.search<Neighborhood>('/api/neighborhoods', { id_commune: idCommune })
      : this.api.getAll<Neighborhood>('/api/neighborhoods');
  }

  entities(): Observable<Entity[]> {
    return this.api.getAll<Entity>('/api/entities');
  }

  createEntity(data: FormData | Partial<Entity>): Observable<Entity> {
    return this.api.create<Entity>('/api/entities', data);
  }

  updateEntity(id: number, data: FormData | Partial<Entity>): Observable<Entity> {
    return this.api.update<Entity>('/api/entities', id, data);
  }

  deleteEntity(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/entities', id);
  }

  officials(idEntity?: number): Observable<Official[]> {
    return idEntity
      ? this.api.search<Official>('/api/officials', { id_entity: idEntity })
      : this.api.getAll<Official>('/api/officials');
  }

  createOfficial(data: Partial<Official>): Observable<Official> {
    return this.api.create<Official>('/api/officials', data);
  }

  updateOfficial(id: number, data: Partial<Official>): Observable<Official> {
    return this.api.update<Official>('/api/officials', id, data);
  }

  deleteOfficial(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/officials', id);
  }

  citizens(): Observable<Citizen[]> {
    return this.api.getAll<Citizen>('/api/citizens');
  }

  createCitizen(data: Partial<Citizen>): Observable<Citizen> {
    return this.api.create<Citizen>('/api/citizens', data);
  }

  updateCitizen(id: number, data: Partial<Citizen>): Observable<Citizen> {
    return this.api.update<Citizen>('/api/citizens', id, data);
  }

  deleteCitizen(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/citizens', id);
  }

  categories(): Observable<Category[]> {
    return this.api.getAll<Category>('/api/categories');
  }

  createCategory(data: FormData | Partial<Category>): Observable<Category> {
    return this.api.create<Category>('/api/categories', data);
  }

  updateCategory(id: number, data: FormData | Partial<Category>): Observable<Category> {
    return this.api.update<Category>('/api/categories', id, data);
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/categories', id);
  }

  createCommune(data: Partial<Commune>): Observable<Commune> {
    return this.api.create<Commune>('/api/communes', data);
  }

  updateCommune(id: number, data: Partial<Commune>): Observable<Commune> {
    return this.api.update<Commune>('/api/communes', id, data);
  }

  deleteCommune(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/communes', id);
  }

  createNeighborhood(data: Partial<Neighborhood>): Observable<Neighborhood> {
    return this.api.create<Neighborhood>('/api/neighborhoods', data);
  }

  updateNeighborhood(id: number, data: Partial<Neighborhood>): Observable<Neighborhood> {
    return this.api.update<Neighborhood>('/api/neighborhoods', id, data);
  }

  deleteNeighborhood(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/neighborhoods', id);
  }

  annotations(): Observable<Annotation[]> {
    return this.api.getAll<Annotation>('/api/annotations');
  }

  createAnnotation(data: Partial<Annotation>): Observable<Annotation> {
    return this.api.create<Annotation>('/api/annotations', data);
  }

  updateAnnotation(id: number, data: Partial<Annotation>): Observable<Annotation> {
    return this.api.update<Annotation>('/api/annotations', id, data);
  }

  deleteAnnotation(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/annotations', id);
  }

  points(idNeighborhood?: number, idAnnotation?: number): Observable<Point[]> {
    if (idNeighborhood) {
      return this.api.search<Point>('/api/points', { id_neighborhood: idNeighborhood });
    }
    if (idAnnotation) {
      return this.api.search<Point>('/api/points', { id_annotation: idAnnotation });
    }
    return this.api.getAll<Point>('/api/points');
  }

  createPoint(data: Partial<Point>): Observable<Point> {
    return this.api.create<Point>('/api/points', data);
  }

  updatePoint(id: number, data: Partial<Point>): Observable<Point> {
    return this.api.update<Point>('/api/points', id, data);
  }

  deletePoint(id: number): Observable<{ message: string }> {
    return this.api.remove('/api/points', id);
  }

  votes(): Observable<Vote[]> {
    return this.api.getAll<Vote>('/api/votes');
  }

  createVote(data: Partial<Vote>): Observable<Vote> {
    return this.api.create<Vote>('/api/votes', data);
  }

  updateVote(id: number, data: Partial<Vote>): Observable<Vote> {
    return this.api.update<Vote>('/api/votes', id, data);
  }

  annotationCategories(idAnnotation?: number): Observable<AnnotationCategory[]> {
    return idAnnotation
      ? this.api.search<AnnotationCategory>('/api/annotation-categories', { id_annotation: idAnnotation })
      : this.api.getAll<AnnotationCategory>('/api/annotation-categories');
  }

  createAnnotationCategory(data: Partial<AnnotationCategory>): Observable<AnnotationCategory> {
    return this.api.create<AnnotationCategory>('/api/annotation-categories', data);
  }

  interestedParties(idAnnotation?: number): Observable<InterestedParty[]> {
    return idAnnotation
      ? this.api.search<InterestedParty>('/api/interested-parties', { id_annotation: idAnnotation })
      : this.api.getAll<InterestedParty>('/api/interested-parties');
  }

  createInterestedParty(data: Partial<InterestedParty>): Observable<InterestedParty> {
    return this.api.create<InterestedParty>('/api/interested-parties', data);
  }

  createEvidence(data: FormData): Observable<Evidence> {
    return this.api.create<Evidence>('/api/evidences', data);
  }

  evidences(idAnnotation?: number): Observable<Evidence[]> {
    return idAnnotation
      ? this.api.search<Evidence>('/api/evidences', { id_annotation: idAnnotation })
      : this.api.getAll<Evidence>('/api/evidences');
  }

  startTracking(ids: number[]): Observable<TrackingStartResponse> {
    return this.api.create<TrackingStartResponse>('/api/officials/tracking/start', { ids });
  }

  stopTracking(ids?: number[]): Observable<unknown> {
    return this.api.create('/api/officials/tracking/stop', ids ? { ids } : {});
  }

  imageUrl(path?: string | null): string | null {
    return this.api.imageUrl(path);
  }
}
