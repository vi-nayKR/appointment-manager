import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { AppointmentApi } from './appointment-api.service';
import {
  AppointmentConflict,
  AppointmentDetail,
  AppointmentInput,
  AppointmentPatch,
  AppointmentStatus,
  appointmentStatuses,
} from './appointment';
import { FeedbackModal, FeedbackMode } from '../shared/feedback-modal';

type AppointmentForm = FormGroup<{
  patientName: FormControl<string>;
  date: FormControl<string>;
  startTime: FormControl<string>;
  endTime: FormControl<string>;
  chairId: FormControl<string>;
  providerId: FormControl<string>;
  status: FormControl<AppointmentStatus>;
  notes: FormControl<string>;
}>;

@Component({
  selector: 'app-appointment-editor',
  imports: [ReactiveFormsModule, RouterLink, FeedbackModal],
  templateUrl: './appointment-editor.html',
  styleUrl: './appointment-editor.css',
})
export class AppointmentEditor {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AppointmentApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly statuses = appointmentStatuses;
  readonly form: AppointmentForm = new FormGroup(
    {
      patientName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(120)],
      }),
      date: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, validAppointmentDate],
      }),
      startTime: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/)],
      }),
      endTime: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/)],
      }),
      chairId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      providerId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      status: new FormControl<AppointmentStatus>('scheduled', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    },
    { validators: timeRangeValidator },
  );

  appointment?: AppointmentDetail;
  isNew = false;
  providers: { id: string; name: string }[] = [];
  chairs: { id: string; name: string }[] = [];
  loading = true;
  saving = false;
  loadError = '';
  saveError = '';
  saveConflicts: AppointmentConflict[] = [];
  feedbackOpen = false;
  feedbackMode: FeedbackMode = 'success';
  feedbackTitle = '';
  feedbackMessage = '';
  feedbackConfirmLabel = 'Return to schedule';
  savedDate = '';

  constructor() {
    const isNew = this.route.snapshot.data['mode'] === 'create';
    this.isNew = isNew;
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((id) =>
          forkJoin({
            appointment: isNew ? of(null) : this.api.get(id),
            providers: this.api.providers(),
            chairs: this.api.chairs(),
          }),
        ),
        tap(({ appointment, providers, chairs }) => {
          this.appointment = appointment ?? undefined;
          this.isNew = appointment === null;
          this.providers = providers;
          this.chairs = chairs;
          this.form.reset(
            appointment
              ? {
                  patientName: appointment.patientName,
                  date: appointment.date,
                  startTime: appointment.startTime,
                  endTime: appointment.endTime,
                  chairId: appointment.chairId,
                  providerId: appointment.providerId,
                  status: appointment.status,
                  notes: appointment.notes,
                }
              : {
                  patientName: '',
                  date: validDate(this.route.snapshot.queryParamMap.get('date'))
                    ? this.route.snapshot.queryParamMap.get('date')!
                    : today(),
                  startTime: '',
                  endTime: '',
                  chairId: chairs[0]?.id ?? '',
                  providerId: providers[0]?.id ?? '',
                  status: 'scheduled',
                  notes: '',
                },
          );
          this.form.markAsPristine();
          this.loading = false;
          this.loadError = '';
          this.changeDetector.markForCheck();
        }),
        catchError(() => {
          this.loading = false;
          this.loadError = isNew
            ? 'Provider and chair options could not be loaded. Return to the schedule and try again.'
            : 'Appointment details or provider and chair options could not be loaded. Return to the schedule and try again.';
          this.changeDetector.markForCheck();
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  save() {
    if ((!this.appointment && !this.isNew) || this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values = this.form.getRawValue();
    const patch = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) => value !== this.appointment?.[key as keyof AppointmentDetail],
      ),
    ) as AppointmentPatch;
    if (!this.isNew && !Object.keys(patch).length) {
      this.saveError = 'There are no changes to save.';
      return;
    }

    this.saving = true;
    this.saveError = '';
    this.saveConflicts = [];
    const request = this.isNew
      ? this.api.create(values as AppointmentInput)
      : this.api.update(this.appointment!.id, patch);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.saving = false;
        this.savedDate = saved.date;
        this.feedbackTitle = this.isNew ? 'Appointment added' : 'Appointment updated';
        this.feedbackMessage = this.isNew
          ? `The appointment for ${saved.patientName} was added successfully.`
          : `The appointment for ${saved.patientName} was updated successfully.`;
        this.feedbackOpen = true;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        this.saving = false;
        const apiError = error instanceof HttpErrorResponse ? error.error?.error : undefined;
        this.saveError =
          apiError?.message ??
          (error instanceof HttpErrorResponse && error.status === 0
            ? 'The appointment service could not be reached. Your changes are still here.'
            : 'The appointment could not be saved. Please review the form and try again.');
        this.saveConflicts = Array.isArray(apiError?.conflicts) ? apiError.conflicts : [];
        this.changeDetector.markForCheck();
      },
    });
  }

  back() {
    void this.router.navigate(['/appointments'], { queryParamsHandling: 'preserve' });
  }

  finishSave() {
    this.feedbackOpen = false;
    void this.router.navigate(
      ['/appointments'],
      this.isNew
        ? {
            queryParams: {
              date: this.savedDate,
              providerId: null,
              status: null,
              search: null,
              page: 1,
            },
          }
        : { queryParamsHandling: 'preserve' },
    );
  }

  labelStatus(status: string) {
    return status.replace('_', ' ');
  }
}

export function timeRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startTime')?.value;
  const end = control.get('endTime')?.value;
  if (
    typeof start !== 'string' ||
    typeof end !== 'string' ||
    !/^\d{2}:\d{2}$/.test(start) ||
    !/^\d{2}:\d{2}$/.test(end)
  )
    return null;
  return end > start ? null : { timeRange: true };
}

function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validAppointmentDate(control: AbstractControl): ValidationErrors | null {
  return validDate(control.value) ? null : { date: true };
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
