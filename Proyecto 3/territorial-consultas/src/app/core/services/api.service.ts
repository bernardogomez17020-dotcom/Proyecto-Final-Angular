import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/territorial.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  list<T>(path: string, page?: number, pageSize?: number): Observable<T[] | PaginatedResponse<T>> {
    let params = new HttpParams();
    if (page && pageSize) {
      params = params.set('page', page).set('pageSize', pageSize);
    }
    return this.http.get<T[] | PaginatedResponse<T>>(`${this.baseUrl}${path}`, { params });
  }

  getAll<T>(path: string): Observable<T[]> {
    return this.list<T>(path).pipe(
      map((response) => (Array.isArray(response) ? response : response.items)),
    );
  }

  getById<T>(path: string, id: number): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}/${id}`);
  }

  search<T>(path: string, filters: Record<string, string | number>): Observable<T[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<T[] | PaginatedResponse<T>>(`${this.baseUrl}${path}/search`, { params }).pipe(
      map((response) => (Array.isArray(response) ? response : response.items)),
    );
  }

  create<T>(path: string, body: FormData | object): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  update<T>(path: string, id: number, body: FormData | object): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}/${id}`, body);
  }

  remove(path: string, id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}${path}/${id}`);
  }

  imageUrl(relativePath?: string | null): string | null {
    if (!relativePath) {
      return null;
    }
    if (relativePath.startsWith('http')) {
      return relativePath;
    }
    return `${this.baseUrl}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
  }
}
