import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const publicRequest =
    req.url.includes('/auth/google/callback') ||
    req.url.includes('/auth/google/config') ||
    req.url.includes('/auth/complete-profile');

  const authedReq =
    token && !publicRequest
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !publicRequest) {
        auth.logout(false);
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
