import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthSessionResponse,
  AuthUser,
  GoogleAuthConfig,
  NeedsProfileResponse,
} from '../models/territorial.models';

const TOKEN_KEY = 'territorial_auth_token';
const USER_KEY = 'territorial_auth_user';
const PROFILE_TOKEN_KEY = 'territorial_profile_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly user = signal<AuthUser | null>(this.readStoredUser());

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user();
  }

  hasRole(...roles: Array<AuthUser['role']>): boolean {
    const current = this.user();
    return current ? roles.includes(current.role) : false;
  }

  getGoogleConfig(): Observable<GoogleAuthConfig> {
    return this.http.get<GoogleAuthConfig>(`${this.apiUrl}/auth/google/config`);
  }

  startGoogleLogin(): Observable<GoogleAuthConfig> {
    return this._startOAuthLogin('google', { access_type: 'online', prompt: 'select_account' });
  }

  startMicrosoftLogin(): Observable<GoogleAuthConfig> {
    return this._startOAuthLogin('microsoft', { response_mode: 'query' });
  }

  startGithubLogin(): Observable<GoogleAuthConfig> {
    return this._startOAuthLogin('github', {});
  }

  private _startOAuthLogin(provider: string, extra: Record<string, string>): Observable<GoogleAuthConfig> {
    return this.http.get<GoogleAuthConfig>(`${this.apiUrl}/auth/${provider}/config`).pipe(
      tap((config) => {
        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          response_type: 'code',
          scope: config.scope,
          state: provider,
          ...extra,
        });
        window.location.href = `${config.authUrl}?${params.toString()}`;
      }),
    );
  }

  completeOAuthCallback(provider: string, code: string, redirectUri: string): Observable<AuthSessionResponse | NeedsProfileResponse> {
    return this.http.post<AuthSessionResponse | NeedsProfileResponse>(`${this.apiUrl}/auth/${provider}/callback`, {
      code,
      redirectUri,
    });
  }

  completeGoogleCallback(code: string, redirectUri: string): Observable<AuthSessionResponse | NeedsProfileResponse> {
    return this.completeOAuthCallback('google', code, redirectUri);
  }

  completeCitizenProfile(payload: {
    profileToken: string;
    name?: string;
    phone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(`${this.apiUrl}/auth/complete-profile`, payload);
  }

  loadSession(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => this.persistSession(this.token!, user)),
    );
  }

  setSession(response: AuthSessionResponse): void {
    this.persistSession(response.token, response.user);
  }

  setPendingProfile(profile: NeedsProfileResponse): void {
    sessionStorage.setItem(PROFILE_TOKEN_KEY, profile.profileToken);
    sessionStorage.setItem('territorial_profile_email', profile.email);
    sessionStorage.setItem('territorial_profile_name', profile.name);
  }

  getPendingProfile(): { profileToken: string; email: string; name: string } | null {
    const profileToken = sessionStorage.getItem(PROFILE_TOKEN_KEY);
    const email = sessionStorage.getItem('territorial_profile_email');
    const name = sessionStorage.getItem('territorial_profile_name');

    if (!profileToken || !email) {
      return null;
    }

    return { profileToken, email, name: name || email };
  }

  clearPendingProfile(): void {
    sessionStorage.removeItem(PROFILE_TOKEN_KEY);
    sessionStorage.removeItem('territorial_profile_email');
    sessionStorage.removeItem('territorial_profile_name');
  }

  logout(callServer = true): void {
    const token = this.token;
    if (callServer && token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({ error: () => undefined });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  private persistSession(token: string, user: AuthUser): void {
    const authUser: AuthUser = { ...user, token };
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));
    this.user.set(authUser);
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);

    if (!raw || !token) {
      return null;
    }

    try {
      return { ...(JSON.parse(raw) as AuthUser), token };
    } catch {
      return null;
    }
  }
}
