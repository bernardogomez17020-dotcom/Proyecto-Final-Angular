import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

import { ReportService } from '../../core/services/report.service';
import {
  BarSeries,
  ChartType,
  ChartViewMode,
  ChatMessage,
  ReportResponse,
} from '../../core/models/report-response.model';
import { ReportChartComponent } from './components/report-chart/report-chart.component';

@Component({
  selector: 'app-consultas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportChartComponent],
  templateUrl: './consultas-page.component.html',
  styleUrl: './consultas-page.component.scss',
})
export class ConsultasPageComponent implements OnInit {
  private readonly reportService = inject(ReportService);
  private readonly chatStorageKey = 'territorial_chat_history';

  readonly exampleQueries = [
    'anotaciones por categoria',
    'comuna con mas barrios',
    'cantidad de ciudadanos por barrio',
    'promedio de calificaciones por anotacion',
  ];

  readonly viewModes: { id: ChartViewMode; label: string }[] = [
    { id: 'bar', label: 'Barra simple' },
    { id: 'bar-grouped', label: 'Barra agrupada' },
    { id: 'pie', label: 'Circular' },
    { id: 'line', label: 'Lineas' },
  ];

  query = '';
  loading = false;
  currentReport: ReportResponse | null = null;
  selectedViewMode: ChartViewMode = 'bar';
  messages: ChatMessage[] = [
    {
      id: crypto.randomUUID(),
      role: 'system',
      text: 'Bienvenido al modulo de reportes inteligentes. Escribe una consulta o usa las pruebas rapidas.',
      timestamp: new Date(),
    },
  ];

  ngOnInit(): void {
    const saved = localStorage.getItem(this.chatStorageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Array<Omit<ChatMessage, 'timestamp'> & { timestamp: string }>;
      if (parsed.length) {
        this.messages = parsed.map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        }));
      }
    } catch {
      localStorage.removeItem(this.chatStorageKey);
    }
  }

  sendQuery(): void {
    const trimmed = this.query.trim();
    if (!trimmed || this.loading) {
      return;
    }

    this.pushMessage('user', trimmed);
    this.query = '';
    this.requestReport(() => this.reportService.generateReport(trimmed));
  }

  runTest(type: ChartType): void {
    if (this.loading) {
      return;
    }

    this.pushMessage('user', `Prueba rapida: grafica ${type}`);
    this.requestReport(() => this.reportService.getTestReport(type));
  }

  useExample(example: string): void {
    this.query = example;
  }

  setViewMode(mode: ChartViewMode): void {
    if (this.isViewModeDisabled(mode)) {
      return;
    }

    this.selectedViewMode = mode;
  }

  isViewModeDisabled(mode: ChartViewMode): boolean {
    return this.viewModeHint(mode) !== null;
  }

  viewModeHint(mode: ChartViewMode): string | null {
    if (!this.currentReport) {
      return 'Genera un reporte primero';
    }

    if (this.isEmptyReport(this.currentReport)) {
      return 'Sin datos para visualizar';
    }

    const suggestedType = this.currentReport.type;

    if (suggestedType === 'pie') {
      return mode === 'pie'
        ? null
        : 'Solo aplica grafica circular para consultas de distribucion';
    }

    if (suggestedType === 'line') {
      return mode === 'line'
        ? null
        : 'Solo aplica grafica de lineas para consultas de tendencia';
    }

    if (suggestedType === 'bar') {
      if (mode === 'bar') {
        return null;
      }

      if (mode === 'bar-grouped') {
        return this.hasMultipleSeries(this.currentReport)
          ? null
          : 'Barras agrupadas requieren multiples series en la respuesta';
      }

      return 'Solo aplica graficas de barras para esta consulta';
    }

    return 'Formato no disponible';
  }

  private requestReport(factory: () => ReturnType<ReportService['generateReport']>): void {
    this.loading = true;

    factory()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (report) => this.handleSuccess(report),
        error: (error) => this.handleError(error),
      });
  }

  private handleSuccess(report: ReportResponse): void {
    this.currentReport = report;
    this.selectedViewMode = this.mapResponseTypeToView(report.type);

    if (this.isEmptyReport(report)) {
      this.pushMessage('system', 'La consulta no retorno registros para los filtros indicados.');
      return;
    }

    const enabledFormats = this.viewModes
      .filter((mode) => !this.isViewModeDisabled(mode.id))
      .map((mode) => mode.label)
      .join(', ');

    this.pushMessage(
      'system',
      `Reporte generado. Tipo sugerido: ${report.type}. Formatos habilitados: ${enabledFormats}.`,
    );
  }

  private handleError(error: unknown): void {
    this.currentReport = null;

    if (error instanceof HttpErrorResponse) {
      const message = this.extractErrorMessage(error);

      if (error.status === 0) {
        this.pushMessage(
          'system',
          'No se pudo conectar con el backend. Verifica que territorial_backend_flask este ejecutandose en http://127.0.0.1:5000.',
        );
        return;
      }

      if (error.status === 400 && this.isInvalidGeminiKey(message)) {
        this.pushMessage(
          'system',
          'La GEMINI_API_KEY no es valida. Verifica la clave en https://aistudio.google.com/apikey, pegala en territorial_backend_flask/.env y reinicia el backend.',
        );
        return;
      }

      if (error.status === 400 && this.isUninterpretableQuery(message)) {
        this.pushMessage(
          'system',
          `No se pudo interpretar la consulta. Reformula usando ejemplos como: ${this.exampleQueries.join(', ')}.`,
        );
        return;
      }

      if (error.status === 400) {
        this.pushMessage('system', `Solicitud invalida: ${message}`);
        return;
      }

      if (error.status === 422) {
        this.pushMessage(
          'system',
          `No se pudo interpretar la consulta. Intenta con ejemplos como: ${this.exampleQueries.join(', ')}.`,
        );
        return;
      }

      if (error.status === 502) {
        this.pushMessage(
          'system',
          `Error al consultar Gemini: ${message}. Verifica GEMINI_API_KEY en el backend.`,
        );
        return;
      }

      if (error.status === 500) {
        this.pushMessage('system', `Error interno del servidor: ${message}`);
        return;
      }

      this.pushMessage('system', `Error del servidor (${error.status}): ${message}`);
      return;
    }

    this.pushMessage('system', 'Ocurrio un error inesperado al procesar la consulta.');
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body.message === 'string') {
      return body.message;
    }

    return error.message || 'Error desconocido';
  }

  isEmptyReport(report: ReportResponse): boolean {
    if (!report.series) {
      return true;
    }

    if (Array.isArray(report.series) && report.series.length === 0) {
      return true;
    }

    return false;
  }

  private mapResponseTypeToView(type: ChartType): ChartViewMode {
    switch (type) {
      case 'pie':
        return 'pie';
      case 'line':
        return 'line';
      default:
        return this.hasMultipleSeries(this.currentReport!) ? 'bar-grouped' : 'bar';
    }
  }

  private hasMultipleSeries(report: ReportResponse): boolean {
    if (!Array.isArray(report.series)) {
      return false;
    }

    if (report.series.length === 0) {
      return false;
    }

    if (typeof report.series[0] === 'number') {
      return false;
    }

    return (report.series as BarSeries[]).length > 1;
  }

  private isInvalidGeminiKey(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('api key not valid') ||
      normalized.includes('unauthenticated') ||
      normalized.includes('invalid authentication credentials')
    );
  }

  private isUninterpretableQuery(message: string): boolean {
    const normalized = message.toLowerCase();

    return (
      normalized.includes('invalid gemini') ||
      normalized.includes('gemini returned') ||
      normalized.includes('unsafe sql') ||
      normalized.includes('only select')
    );
  }

  private pushMessage(role: ChatMessage['role'], text: string): void {
    this.messages = [
      ...this.messages,
      { id: crypto.randomUUID(), role, text, timestamp: new Date() },
    ];
    localStorage.setItem(
      this.chatStorageKey,
      JSON.stringify(
        this.messages.map((message) => ({
          ...message,
          timestamp: message.timestamp.toISOString(),
        })),
      ),
    );
  }
}
