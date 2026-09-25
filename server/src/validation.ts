import {
  statuses,
  type Appointment,
  type AppointmentDraft,
  type AppointmentPatch,
  type AppointmentStatus,
  type Conflict,
} from './models.ts';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly conflicts?: Conflict[];

  constructor(status: number, code: string, message: string, conflicts?: Conflict[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.conflicts = conflicts;
  }
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateTimeRange(
  startTime: unknown,
  endTime: unknown,
): asserts startTime is string {
  if (!validTime(startTime) || !validTime(endTime) || endTime <= startTime) {
    throw new HttpError(
      400,
      'INVALID_TIME_RANGE',
      'Use valid 24-hour times and an end time after the start time.',
    );
  }
}

export function parseListQuery(query: Record<string, unknown>) {
  const date = query['date'];
  if (!validDate(date))
    throw new HttpError(400, 'INVALID_DATE', 'date must be a real date in YYYY-MM-DD format.');

  const providerValue = query['providerId'];
  const status = query['status'];
  const searchValue = query['search'];
  const search = typeof searchValue === 'string' ? searchValue.trim() : undefined;
  let providerId: string | undefined;
  if (providerValue !== undefined) {
    if (typeof providerValue !== 'string' || !providerValue.trim()) {
      throw new HttpError(400, 'INVALID_PROVIDER', 'providerId must be a non-empty string.');
    }
    providerId = providerValue.trim();
  }
  if (
    status !== undefined &&
    (typeof status !== 'string' || !statuses.includes(status as AppointmentStatus))
  ) {
    throw new HttpError(400, 'INVALID_STATUS', 'status must be a supported appointment status.');
  }
  if (searchValue !== undefined && (typeof searchValue !== 'string' || search!.length > 100)) {
    throw new HttpError(
      400,
      'INVALID_SEARCH',
      'search must be a string of at most 100 characters.',
    );
  }

  const page = parsePositiveInteger(query['page'], 1, Number.MAX_SAFE_INTEGER, 'page');
  const limit = parsePositiveInteger(query['limit'], 20, 100, 'limit');
  return {
    date,
    providerId: providerId as string | undefined,
    status: status as AppointmentStatus | undefined,
    search,
    page,
    limit,
  };
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  max: number,
  field: string,
): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new HttpError(
      400,
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a positive integer.`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new HttpError(
      400,
      `INVALID_${field.toUpperCase()}`,
      `${field} must be between 1 and ${max}.`,
    );
  }
  return parsed;
}

export function parsePatch(body: unknown): AppointmentPatch {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }
  const allowed = new Set(['startTime', 'endTime', 'chairId', 'providerId', 'status', 'notes']);
  const entries = Object.entries(body);
  if (!entries.length)
    throw new HttpError(400, 'EMPTY_PATCH', 'Provide at least one field to update.');
  if (entries.some(([key]) => !allowed.has(key))) {
    throw new HttpError(400, 'UNKNOWN_FIELD', 'Request contains an unsupported appointment field.');
  }

  const patch: AppointmentPatch = {};
  for (const [key, value] of entries) {
    switch (key) {
      case 'startTime':
      case 'endTime':
        if (!validTime(value))
          throw new HttpError(400, 'INVALID_TIME', `${key} must use 24-hour HH:mm format.`);
        patch[key] = value;
        break;
      case 'chairId':
      case 'providerId':
        if (typeof value !== 'string' || !value.trim())
          throw new HttpError(
            400,
            `INVALID_${key.toUpperCase()}`,
            `${key} must be a non-empty string.`,
          );
        patch[key] = value.trim();
        break;
      case 'status':
        if (typeof value !== 'string' || !statuses.includes(value as AppointmentStatus)) {
          throw new HttpError(
            400,
            'INVALID_STATUS',
            'status must be a supported appointment status.',
          );
        }
        patch.status = value as AppointmentStatus;
        break;
      case 'notes':
        if (typeof value !== 'string' || value.length > 2000)
          throw new HttpError(
            400,
            'INVALID_NOTES',
            'notes must be a string of at most 2000 characters.',
          );
        patch.notes = value;
    }
  }
  return patch;
}

export function parseCreate(body: unknown): AppointmentDraft {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }
  const value = body as Record<string, unknown>;
  const allowed = new Set([
    'patientName',
    'providerId',
    'chairId',
    'date',
    'startTime',
    'endTime',
    'status',
    'notes',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new HttpError(400, 'UNKNOWN_FIELD', 'Request contains an unsupported appointment field.');
  }
  const patientName = typeof value['patientName'] === 'string' ? value['patientName'].trim() : '';
  const providerId = typeof value['providerId'] === 'string' ? value['providerId'].trim() : '';
  const chairId = typeof value['chairId'] === 'string' ? value['chairId'].trim() : '';
  const date = value['date'];
  if (!patientName || patientName.length > 120)
    throw new HttpError(
      400,
      'INVALID_PATIENT',
      'patientName is required and must be at most 120 characters.',
    );
  if (!providerId) throw new HttpError(400, 'INVALID_PROVIDER', 'providerId is required.');
  if (!chairId) throw new HttpError(400, 'INVALID_CHAIR', 'chairId is required.');
  if (!validDate(date))
    throw new HttpError(400, 'INVALID_DATE', 'date must be a real date in YYYY-MM-DD format.');
  const startTime = value['startTime'];
  const endTime = value['endTime'];
  validateTimeRange(startTime, endTime);
  const status = value['status'] ?? 'scheduled';
  if (typeof status !== 'string' || !statuses.includes(status as AppointmentStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', 'status must be a supported appointment status.');
  }
  const notes = value['notes'] ?? '';
  if (typeof notes !== 'string' || notes.length > 2000)
    throw new HttpError(400, 'INVALID_NOTES', 'notes must be a string of at most 2000 characters.');
  return {
    patientName,
    providerId,
    chairId,
    date,
    startTime: startTime as string,
    endTime: endTime as string,
    status: status as AppointmentStatus,
    notes,
  };
}

export function validateAppointment(appointment: Appointment): void {
  if (!validDate(appointment.date))
    throw new HttpError(400, 'INVALID_DATE', 'Appointment date is invalid.');
  validateTimeRange(appointment.startTime, appointment.endTime);
}
