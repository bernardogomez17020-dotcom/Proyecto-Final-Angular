import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

export interface ColombiaApiDepartment {
  id: number;
  name: string;
  description: string;
}

export interface ColombiaApiCity {
  id: number;
  name: string;
  departmentId: number;
}

const BASE_URL = 'https://api-colombia.com/api/v1';

@Injectable({ providedIn: 'root' })
export class ColombiaApiService {
  private readonly http = inject(HttpClient);
  private departments$?: Observable<ColombiaApiDepartment[]>;

  departments(): Observable<ColombiaApiDepartment[]> {
    this.departments$ ??= this.http
      .get<ColombiaApiDepartment[]>(`${BASE_URL}/Department`)
      .pipe(shareReplay(1));
    return this.departments$;
  }

  citiesByDepartment(departmentId: number): Observable<ColombiaApiCity[]> {
    return this.http.get<ColombiaApiCity[]>(`${BASE_URL}/Department/${departmentId}/cities`);
  }
}
