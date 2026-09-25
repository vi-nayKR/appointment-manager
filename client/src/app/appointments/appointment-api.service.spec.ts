import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppointmentApi } from './appointment-api.service';
import { AppointmentPatch } from './appointment';

describe('AppointmentApi', () => {
  let api: AppointmentApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AppointmentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends list filters as query parameters', () => {
    api
      .list({
        date: '2026-09-25',
        providerId: 'provider-1',
        status: 'scheduled',
        search: 'Alex Doe',
        page: 2,
        limit: 10,
      })
      .subscribe();

    const request = http.expectOne((request) => request.url === '/api/appointments');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('date')).toBe('2026-09-25');
    expect(request.request.params.get('providerId')).toBe('provider-1');
    expect(request.request.params.get('status')).toBe('scheduled');
    expect(request.request.params.get('search')).toBe('Alex Doe');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush({ items: [], total: 0, page: 2, limit: 10 });
  });

  it('URL-encodes appointment IDs and sends only the requested patch', () => {
    const patch: AppointmentPatch = { status: 'completed' };
    api.update('patient/42', patch).subscribe();

    const request = http.expectOne('/api/appointments/patient%2F42');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(patch);
    request.flush({});
  });
});
