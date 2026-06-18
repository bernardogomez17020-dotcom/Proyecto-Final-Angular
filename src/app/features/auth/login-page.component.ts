import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);

  error = '';
  loading = false;

  loginWithGoogle(): void {
    this.error = '';
    this.loading = true;

    this.auth.startGoogleLogin().subscribe({
      error: (err) => {
        this.loading = false;
        this.error =
          err instanceof HttpErrorResponse
            ? err.error?.message || 'No se pudo iniciar el flujo con Google'
            : 'No se pudo iniciar el flujo con Google';
      },
    });
  }

  loginWithMicrosoft(): void {
    this.error = '';
    this.loading = true;

    this.auth.startMicrosoftLogin().subscribe({
      error: (err) => {
        this.loading = false;
        this.error =
          err instanceof HttpErrorResponse
            ? err.error?.message || 'No se pudo iniciar el flujo con Microsoft'
            : 'No se pudo iniciar el flujo con Microsoft';
      },
    });
  }

  loginWithGitHub(): void {
    this.error = '';
    this.loading = true;

    this.auth.startGithubLogin().subscribe({
      error: (err) => {
        this.loading = false;
        this.error =
          err instanceof HttpErrorResponse
            ? err.error?.message || 'No se pudo iniciar el flujo con GitHub'
            : 'No se pudo iniciar el flujo con GitHub';
      },
    });
  }
}
