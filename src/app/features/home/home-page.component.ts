import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { TerritorialApiService } from '../../core/services/territorial-api.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(TerritorialApiService);

  stats = {
    annotations: 0,
    openAnnotations: 0,
    neighborhoods: 0,
    demarcatedNeighborhoods: 0,
    citizens: 0,
    entities: 0,
    officials: 0,
  };

  loading = true;

  ngOnInit(): void {
    forkJoin({
      annotations: this.api.annotations(),
      neighborhoods: this.api.neighborhoods(),
      points: this.api.points(),
      citizens: this.api.citizens(),
      entities: this.api.entities(),
      officials: this.api.officials(),
    }).subscribe({
      next: (data) => {
        this.stats.annotations = data.annotations.length;
        this.stats.openAnnotations = data.annotations.filter((a) => a.status === 'open').length;
        this.stats.neighborhoods = data.neighborhoods.length;
        this.stats.citizens = data.citizens.length;
        this.stats.entities = data.entities.length;
        this.stats.officials = data.officials.length;

        const demarcatedIds = new Set(
          data.points
            .filter((p) => p.point_type === 'boundary' && p.id_neighborhood)
            .map((p) => p.id_neighborhood!),
        );
        this.stats.demarcatedNeighborhoods = demarcatedIds.size;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
