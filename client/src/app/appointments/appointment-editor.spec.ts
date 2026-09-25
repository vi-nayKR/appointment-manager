import { FormControl, FormGroup } from '@angular/forms';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentApi } from './appointment-api.service';
import { AppointmentEditor } from './appointment-editor';
import { timeRangeValidator } from './appointment-editor';

it('requires an end time strictly after the start time', () => {
  const form = new FormGroup(
    {
      startTime: new FormControl('10:00'),
      endTime: new FormControl('10:30'),
    },
    { validators: timeRangeValidator },
  );

  expect(form.valid).toBe(true);
  form.controls.endTime.setValue('10:00');
  expect(form.errors).toEqual({ timeRange: true });
  form.controls.endTime.setValue('09:59');
  expect(form.errors).toEqual({ timeRange: true });
  form.controls.endTime.setValue('10:30');
  expect(form.errors).toBeNull();
});

describe('AppointmentEditor success feedback', () => {
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
    conflicts: [],
  };

  it('shows added success after create succeeds', async () => {
    const api = {
      providers: vi.fn(() => of([{ id: 'p1', name: 'Dr. Maya Chen' }])),
      chairs: vi.fn(() => of([{ id: 'c1', name: 'Chair 1' }])),
      create: vi.fn(() => of(appointment)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'appointments/new', data: { mode: 'create' }, component: AppointmentEditor },
        ]),
        { provide: AppointmentApi, useValue: api },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/appointments/new?date=2026-09-25', AppointmentEditor);
    const editor = harness.routeDebugElement!.injector.get(AppointmentEditor);
    editor.form.patchValue({
      patientName: 'Noah Wilson',
      date: '2026-09-25',
      startTime: '09:00',
      endTime: '09:30',
      chairId: 'c1',
      providerId: 'p1',
      status: 'scheduled',
      notes: '',
    });
    editor.save();
    harness.detectChanges();

    expect(api.create).toHaveBeenCalledOnce();
    expect(harness.routeNativeElement?.querySelector('#feedback-title')?.textContent).toBe(
      'Appointment added',
    );
  });

  it('shows edited success after update succeeds', async () => {
    const api = {
      get: vi.fn(() => of(appointment)),
      providers: vi.fn(() => of([{ id: 'p1', name: 'Dr. Maya Chen' }])),
      chairs: vi.fn(() => of([{ id: 'c1', name: 'Chair 1' }])),
      update: vi.fn(() => of({ ...appointment, notes: 'Updated notes' })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'appointments/:id', component: AppointmentEditor }]),
        { provide: AppointmentApi, useValue: api },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/appointments/a1?date=2026-09-25', AppointmentEditor);
    const editor = harness.routeDebugElement!.injector.get(AppointmentEditor);
    editor.form.controls.notes.setValue('Updated notes');
    editor.save();
    harness.detectChanges();

    expect(api.update).toHaveBeenCalledWith('a1', { notes: 'Updated notes' });
    expect(harness.routeNativeElement?.querySelector('#feedback-title')?.textContent).toBe(
      'Appointment updated',
    );
  });
});
