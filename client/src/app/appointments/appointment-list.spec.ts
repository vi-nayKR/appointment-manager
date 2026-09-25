import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentApi } from './appointment-api.service';
import { AppointmentList } from './appointment-list';

describe('AppointmentList', () => {
  it('shows a recoverable error when loading the schedule fails', async () => {
    const api = {
      providers: vi.fn(() => of([])),
      list: vi.fn(() => throwError(() => new Error('server failure'))),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'appointments', component: AppointmentList }]),
        { provide: AppointmentApi, useValue: api },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/appointments?date=2026-09-25', AppointmentList);
    harness.detectChanges();

    const alert = harness.routeNativeElement?.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Schedule unavailable');
    expect(alert?.textContent).toContain('Appointments could not be loaded');
    const retryButton = alert?.querySelector('button');
    expect(retryButton?.textContent).toContain('Try again');
    retryButton?.click();
    harness.detectChanges();
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('asks before deleting and confirms deletion success', async () => {
    const appointment = {
      id: 'a1',
      patientName: 'Noah Wilson',
      providerId: 'p1',
      providerName: 'Dr. Maya Chen',
      chairId: 'c1',
      chairName: 'Chair 1',
      date: '2026-09-25',
      startTime: '09:00',
      endTime: '09:30',
      status: 'scheduled' as const,
      notes: '',
      hasConflict: false,
    };
    const api = {
      providers: vi.fn(() => of([])),
      list: vi.fn(() => of({ items: [appointment], total: 1, page: 1, limit: 10 })),
      delete: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'appointments', component: AppointmentList }]),
        { provide: AppointmentApi, useValue: api },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/appointments?date=2026-09-25', AppointmentList);
    harness.detectChanges();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('.text-action.delete-action')
      ?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('dialog')?.textContent).toContain(
      'Delete the appointment for Noah Wilson',
    );
    expect(api.delete).not.toHaveBeenCalled();

    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.cancel-button')?.click();
    harness.detectChanges();
    expect(api.delete).not.toHaveBeenCalled();

    harness.routeNativeElement
      ?.querySelector<HTMLButtonElement>('.text-action.delete-action')
      ?.click();
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.confirm-button')?.click();
    harness.detectChanges();
    expect(api.delete).toHaveBeenCalledWith('a1');
    expect(harness.routeNativeElement?.querySelector('#feedback-title')?.textContent).toBe(
      'Appointment deleted',
    );
  });
});
