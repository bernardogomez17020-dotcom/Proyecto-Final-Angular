import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ChartType, ReportQueryRequest, ReportResponse } from '../models/report-response.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  generateReport(query: string): Observable<ReportResponse> {
    const body: ReportQueryRequest = { query };
    return this.http.post<ReportResponse>(`${this.baseUrl}/reports`, body);
  }

  getTestReport(type: ChartType): Observable<ReportResponse> {
    return this.http.get<ReportResponse>(`${this.baseUrl}/reports/test/${type}`);
  }
}
