import { Injectable, OnDestroy, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';
import { TrackingPayload } from '../models/territorial.models';

@Injectable({ providedIn: 'root' })
export class TrackingService implements OnDestroy {
  private socket: Socket | null = null;
  private readonly updatesSubject = new Subject<TrackingPayload>();

  readonly updates$: Observable<TrackingPayload> = this.updatesSubject.asObservable();

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(environment.apiUrl, { transports: ['websocket', 'polling'] });
    this.socket.on('official_tracking', (payload: TrackingPayload) => {
      this.updatesSubject.next(payload);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
