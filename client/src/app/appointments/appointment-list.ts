import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  map,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { AppointmentApi } from './appointment-api.service';
import { Appointment, AppointmentStatus, appointmentStatuses } from './appointment';
import { FeedbackModal, FeedbackMode } from '../shared/feedback-modal';

type ViewState = {
  date: string;
  providerId: string;
  status: AppointmentStatus | '';
  search: string;
  page: number;
};

@Component({
  selector: 'app-appointment-list',
  imports: [ReactiveFormsModule, RouterLink, FeedbackModal],
  templateUrl: './appointment-list.html',
  styleUrl: './appointment-list.css',
})
export class AppointmentList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AppointmentApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly refresh = new Subject<void>();

  readonly statuses = appointmentStatuses;
  readonly search = new FormControl('', { nonNullable: true });
  readonly provider = new FormControl('', { nonNullable: true });
  providers: { id: string; name: string }[] = [];
  appointments: Appointment[] = [];
  state: ViewState = { date: today(), providerId: '', status: '', search: '', page: 1 };
  total = 0;
  readonly limit = 10;
  loading = true;
  error = '';
  providersError = '';
  actionError = '';
  deletingId = '';
  pendingDelete?: Appointment;
  feedbackOpen = false;
  feedbackMode: FeedbackMode = 'confirm';
  feedbackTitle = '';
  feedbackMessage = '';
  feedbackConfirmLabel = 'Delete appointment';

  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  constructor() {
    if (!validDate(this.route.snapshot.queryParamMap.get('date'))) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { date: this.state.date },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    this.api
      .providers()
      .pipe(
        catchError(() => {
          this.providersError =
            'Provider options could not be loaded. The provider filter is unavailable.';
          this.changeDetector.markForCheck();
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((providers) => {
        this.providers = providers;
        this.providersError = '';
        this.changeDetector.markForCheck();
      });

    this.search.valueChanges
      .pipe(
        map((value) => value.slice(0, 100)),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((search) => this.updateQuery({ search: search.trim() || null, page: '1' }));

    combineLatest([this.route.queryParamMap, this.refresh.pipe(startWith(undefined))])
      .pipe(
        map(([params]) => params),
        map(readState),
        tap((state) => {
          const searchChanged = state.search !== this.state.search;
          this.state = state;
          if (searchChanged) this.search.setValue(state.search, { emitEvent: false });
          this.provider.setValue(state.providerId, { emitEvent: false });
          this.error = '';
          this.loading = true;
          this.changeDetector.markForCheck();
        }),
        switchMap((state) =>
          this.api
            .list({
              ...state,
              status: state.status || undefined,
              providerId: state.providerId || undefined,
              search: state.search || undefined,
              limit: this.limit,
            })
            .pipe(
              tap((result) => {
                this.total = result.total;
                if (state.page > this.pageCount) {
                  this.updateQuery({ page: String(this.pageCount) });
                  return;
                }
                this.appointments = result.items;
                this.loading = false;
                this.changeDetector.markForCheck();
              }),
              catchError((error: unknown) => {
                this.appointments = [];
                this.total = 0;
                this.error = errorMessage(error);
                this.loading = false;
                this.changeDetector.markForCheck();
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  dateChanged(value: string) {
    if (value && validDate(value)) this.updateQuery({ date: value, page: '1' });
  }

  retry() {
    this.refresh.next();
  }

  deleteAppointment(appointment: Appointment) {
    if (this.deletingId) return;
    this.actionError = '';
    this.pendingDelete = appointment;
    this.feedbackMode = 'confirm';
    this.feedbackTitle = 'Delete appointment?';
    this.feedbackMessage = `Delete the appointment for ${appointment.patientName}? This action cannot be undone.`;
    this.feedbackConfirmLabel = 'Delete appointment';
    this.feedbackOpen = true;
  }

  confirmFeedback() {
    if (this.feedbackMode !== 'confirm') {
      this.feedbackOpen = false;
      return;
    }
    const appointment = this.pendingDelete;
    if (!appointment || this.deletingId) return;
    this.feedbackOpen = false;
    this.deletingId = appointment.id;
    this.api
      .delete(appointment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingId = '';
          this.pendingDelete = undefined;
          this.refresh.next();
          this.feedbackMode = 'success';
          this.feedbackTitle = 'Appointment deleted';
          this.feedbackMessage = `The appointment for ${appointment.patientName} was deleted.`;
          this.feedbackConfirmLabel = 'Done';
          this.feedbackOpen = true;
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.deletingId = '';
          this.pendingDelete = undefined;
          this.actionError = 'The appointment could not be deleted. Please try again.';
          this.changeDetector.markForCheck();
        },
      });
  }

  dismissFeedback() {
    if (this.feedbackMode === 'confirm') this.pendingDelete = undefined;
    this.feedbackOpen = false;
  }

  moveDate(days: number) {
    const [year, month, day] = this.state.date.split('-').map(Number);
    const date = new Date(year!, month! - 1, day!, 12);
    date.setDate(date.getDate() + days);
    this.dateChanged(localDate(date));
  }

  providerChanged(value: string) {
    this.updateQuery({ providerId: value || null, page: '1' });
  }

  statusChanged(value: string) {
    this.updateQuery({ status: value || null, page: '1' });
  }

  changePage(page: number) {
    const lastPage = Math.max(1, Math.ceil(this.total / this.limit));
    this.updateQuery({ page: String(Math.min(lastPage, Math.max(1, page))) });
  }

  labelStatus(status: string) {
    return status.replace('_', ' ');
  }

  private updateQuery(queryParams: Record<string, string | null>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}

function readState(params: ParamMap): ViewState {
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  return {
    date: validDate(params.get('date')) ? params.get('date')! : today(),
    providerId: params.get('providerId') ?? '',
    status: appointmentStatuses.includes(status as AppointmentStatus)
      ? (status as AppointmentStatus)
      : '',
    search: (params.get('search') ?? '').slice(0, 100),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function today() {
  return localDate(new Date());
}

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function errorMessage(error: unknown) {
  if (error instanceof HttpErrorResponse && error.status === 0)
    return 'The appointment service could not be reached. Check that the API is running and try again.';
  if (error instanceof HttpErrorResponse && error.status >= 500)
    return 'The appointment service had a problem. Please try again.';
  return 'Appointments could not be loaded. Please check the selected filters and try again.';
}
