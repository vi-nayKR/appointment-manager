import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  AppointmentDetail,
  AppointmentInput,
  AppointmentPage,
  AppointmentPatch,
  AppointmentQuery,
  Reference,
} from './appointment';

@Injectable({ providedIn: 'root' })
export class AppointmentApi {
  private readonly http = inject(HttpClient);

  list(query: AppointmentQuery) {
    let params = new HttpParams()
      .set('date', query.date)
      .set('page', query.page)
      .set('limit', query.limit);
    if (query.providerId) params = params.set('providerId', query.providerId);
    if (query.status) params = params.set('status', query.status);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<AppointmentPage>('/api/appointments', { params });
  }

  providers() {
    return this.http.get<Reference[]>('/api/providers');
  }

  chairs() {
    return this.http.get<Reference[]>('/api/chairs');
  }

  get(id: string) {
    return this.http.get<AppointmentDetail>(`/api/appointments/${encodeURIComponent(id)}`);
  }

  update(id: string, patch: AppointmentPatch) {
    return this.http.patch<AppointmentDetail>(`/api/appointments/${encodeURIComponent(id)}`, patch);
  }

  create(input: AppointmentInput) {
    return this.http.post<AppointmentDetail>('/api/appointments', input);
  }

  delete(id: string) {
    return this.http.delete<void>(`/api/appointments/${encodeURIComponent(id)}`);
  }
}
