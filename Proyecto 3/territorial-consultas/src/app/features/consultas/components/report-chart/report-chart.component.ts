import { Component, Input, OnChanges } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

import {
  BarSeries,
  ChartViewMode,
  ReportResponse,
} from '../../../../core/models/report-response.model';

export type ApexChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  labels?: string[];
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  plotOptions?: ApexPlotOptions;
  grid?: ApexGrid;
  colors?: string[];
};

@Component({
  selector: 'app-report-chart',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './report-chart.component.html',
  styleUrl: './report-chart.component.scss',
})
export class ReportChartComponent implements OnChanges {
  @Input({ required: true }) report!: ReportResponse;
  @Input() viewMode: ChartViewMode = 'bar';

  chartOptions: ApexChartOptions | null = null;

  ngOnChanges(): void {
    this.chartOptions = this.buildOptions();
  }

  private buildOptions(): ApexChartOptions | null {
    if (!this.report) {
      return null;
    }

    const mode = this.resolveViewMode();

    if (mode === 'pie') {
      return this.buildPieOptions();
    }

    if (mode === 'line') {
      return this.buildLineOptions();
    }

    return this.buildBarOptions(mode === 'bar-grouped');
  }

  private resolveViewMode(): ChartViewMode {
    if (this.viewMode === 'pie' && this.canRenderPie()) {
      return 'pie';
    }

    if (this.viewMode === 'line' && this.canRenderLine()) {
      return 'line';
    }

    if ((this.viewMode === 'bar' || this.viewMode === 'bar-grouped') && this.canRenderBar()) {
      return this.viewMode;
    }

    return this.report.type === 'pie'
      ? 'pie'
      : this.report.type === 'line'
        ? 'line'
        : 'bar';
  }

  private buildPieOptions(): ApexChartOptions {
    const labels = this.report.labels ?? [];
    const series = this.normalizePieSeries();

    return {
      series,
      labels,
      chart: {
        type: 'pie',
        height: 380,
        toolbar: { show: false },
      },
      legend: {
        position: 'bottom',
      },
      dataLabels: {
        enabled: true,
      },
      colors: ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1'],
    };
  }

  private buildBarOptions(grouped: boolean): ApexChartOptions {
    const labels = this.report.labels ?? [];
    const series = this.normalizeBarSeries();

    return {
      series,
      chart: {
        type: 'bar',
        height: 380,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: grouped ? '55%' : '45%',
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: labels,
      },
      grid: {
        strokeDashArray: 4,
      },
      colors: ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed'],
    };
  }

  private buildLineOptions(): ApexChartOptions {
    const labels = this.report.labels ?? [];
    const series = this.normalizeBarSeries();

    return {
      series,
      chart: {
        type: 'line',
        height: 380,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      dataLabels: {
        enabled: true,
      },
      xaxis: {
        categories: labels,
      },
      grid: {
        strokeDashArray: 4,
      },
      colors: ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed'],
    };
  }

  private normalizePieSeries(): number[] {
    if (Array.isArray(this.report.series) && typeof this.report.series[0] === 'number') {
      return this.report.series as number[];
    }

    const barSeries = this.report.series as BarSeries[];
    if (barSeries.length === 1) {
      return barSeries[0].data;
    }

    return barSeries.map((item) => item.data.reduce((sum, value) => sum + value, 0));
  }

  private normalizeBarSeries(): ApexAxisChartSeries {
    if (Array.isArray(this.report.series) && typeof this.report.series[0] === 'number') {
      return [{ name: 'Total', data: this.report.series as number[] }];
    }

    return (this.report.series as BarSeries[]).map((item) => ({
      name: item.name,
      data: item.data,
    }));
  }

  private canRenderPie(): boolean {
    return this.hasSeriesData();
  }

  private canRenderBar(): boolean {
    return this.hasSeriesData();
  }

  private canRenderLine(): boolean {
    return this.hasSeriesData();
  }

  private hasSeriesData(): boolean {
    if (!this.report?.series) {
      return false;
    }

    if (Array.isArray(this.report.series) && this.report.series.length === 0) {
      return false;
    }

    return true;
  }
}
