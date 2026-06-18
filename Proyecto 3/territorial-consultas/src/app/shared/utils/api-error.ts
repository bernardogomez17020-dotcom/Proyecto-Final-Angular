import { HttpErrorResponse } from '@angular/common/http';

export function formatApiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string; dependencies?: string[] } | null;
    if (body?.dependencies?.length) {
      return `${body.message}: ${body.dependencies.join(', ')}`;
    }
    return body?.message || error.message;
  }
  return 'Error inesperado';
}
