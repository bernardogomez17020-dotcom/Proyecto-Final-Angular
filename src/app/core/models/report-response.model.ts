export type ChartType = 'pie' | 'bar' | 'line';

export interface BarSeries {
  name: string;
  data: number[];
}

export interface ReportResponse {
  type: ChartType;
  labels?: string[];
  series: number[] | BarSeries[];
}

export interface ReportQueryRequest {
  query: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  text: string;
  timestamp: Date;
}

export type ChartViewMode = 'pie' | 'bar' | 'bar-grouped' | 'line';
