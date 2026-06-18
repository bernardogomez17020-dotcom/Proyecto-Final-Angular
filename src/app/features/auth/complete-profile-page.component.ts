import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';
import { MapPinPickerComponent } from '../../shared/components/map-pin-picker/map-pin-picker.component';

@Component({
  selector: 'app-complete-profile-page',
  standalone: true,
  imports: [FormsModule, MapPinPickerComponent],
  templateUrl: './complete-profile-page.component.html',
  styleUrl: './complete-profile-page.component.scss',
})
export class CompleteProfilePageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  name = '';
  phone = '';
  address = '';
  latitude = 5.0689;
  longitude = -75.5174;
  profileToken = '';
  error = '';
  loading = false;

  ngOnInit(): void {
    const pending = this.auth.getPendingProfile();
    if (!pending) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.profileToken = pending.profileToken;
    this.email = pending.email;
    this.name = pending.name;
  }

  onLocationChange(coords: { latitude: number; longitude: number }): void {
    this.latitude = coords.latitude;
    this.longitude = coords.longitude;
  }

  save(): void {
    this.loading = true;
    this.error = '';

    this.auth
      .completeCitizenProfile({
        profileToken: this.profileToken,
        name: this.name,
        phone: this.phone,
        address: this.address,
        latitude: this.latitude,
        longitude: this.longitude,
      })
      .subscribe({
        next: (response) => {
          this.auth.clearPendingProfile();
          this.auth.setSession(response);
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err instanceof HttpErrorResponse ? err.error?.message || err.message : 'No se pudo completar el perfil';
        },
      });
  }
}
