import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionResponse, NeedsProfileResponse } from '../../core/models/territorial.models';

@Component({
  selector: 'app-auth-callback-page',
  standalone: true,
  template: `
    <section class="callback-page">
      <p>{{ message }}</p>
    </section>
  `,
  styles: `
    .callback-page {
      min-height: 100vh;
      display: grid;
      place-items: center;
      color: #475569;
    }
  `,
})
export class AuthCallbackPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  message = 'Validando acceso con Google...';

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error) {
      this.message = 'Google rechazo la autenticacion. Intenta de nuevo.';
      setTimeout(() => this.router.navigateByUrl('/login'), 2500);
      return;
    }

    if (!code) {
      this.message = 'No se recibio el codigo de Google.';
      setTimeout(() => this.router.navigateByUrl('/login'), 2500);
      return;
    }

    const redirectUri = `${environment.authRedirectUri}`;

    this.auth.completeGoogleCallback(code, redirectUri).subscribe({
      next: (response) => this.handleSuccess(response),
      error: (err) => this.handleError(err),
    });
  }

  private handleSuccess(response: AuthSessionResponse | NeedsProfileResponse): void {
    if ('needsProfile' in response && response.needsProfile) {
      this.auth.setPendingProfile(response);
      this.router.navigateByUrl('/completar-perfil');
      return;
    }

    this.auth.setSession(response as AuthSessionResponse);
    this.router.navigateByUrl('/');
  }

  private handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 403 && error.error?.needsProfile) {
      this.auth.setPendingProfile(error.error as NeedsProfileResponse);
      this.router.navigateByUrl('/completar-perfil');
      return;
    }

    const detail =
      error instanceof HttpErrorResponse
        ? error.error?.message || error.message
        : 'Error inesperado';

    this.message = `No se pudo iniciar sesion: ${detail}`;
    setTimeout(() => this.router.navigateByUrl('/login'), 3000);
  }
}
