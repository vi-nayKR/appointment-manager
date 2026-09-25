import { randomUUID } from 'node:crypto';
import type { Db, Filter } from 'mongodb';
import type {
  Appointment,
  AppointmentDraft,
  AppointmentPatch,
  AppointmentStatus,
  AppointmentView,
  Conflict,
  Page,
} from './models.ts';
import {
  appointmentsForDate,
  deleteAppointment,
  getAppointment,
  hasReference,
  insertAppointment,
  listAppointments,
  listReferences,
  updateAppointment,
} from './appointments.repository.ts';
import { HttpError, validateAppointment } from './validation.ts';

export function overlaps(
  a: Pick<Appointment, 'startTime' | 'endTime'>,
  b: Pick<Appointment, 'startTime' | 'endTime'>,
): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function conflictsFor(appointment: Appointment, others: Appointment[]): Appointment[] {
  if (appointment.status === 'cancelled') return [];
  return others.filter(
    (other) =>
      other._id !== appointment._id &&
      other.status !== 'cancelled' &&
      other.date === appointment.date &&
      other.chairId === appointment.chairId &&
      overlaps(appointment, other),
  );
}

export function mergePatch(appointment: Appointment, patch: AppointmentPatch): Appointment {
  return { ...appointment, ...patch };
}

export async function listDay(
  db: Db,
  query: {
    date: string;
    providerId?: string;
    status?: AppointmentStatus;
    search?: string;
    page: number;
    limit: number;
  },
): Promise<Page<AppointmentView>> {
  const filter: Filter<Appointment> = { date: query.date };
  if (query.providerId) filter.providerId = query.providerId;
  if (query.status) filter.status = query.status;
  if (query.search) filter.patientName = { $regex: escapeRegex(query.search), $options: 'i' };

  const [result, allForDate, providers, chairs] = await Promise.all([
    listAppointments(db, filter, query.page, query.limit),
    appointmentsForDate(db, query.date),
    listReferences(db, 'providers'),
    listReferences(db, 'chairs'),
  ]);
  const names = nameMaps(providers, chairs);
  return {
    total: result.total,
    page: query.page,
    limit: query.limit,
    items: result.items.map((appointment) =>
      toView(appointment, names, conflictsFor(appointment, allForDate).length > 0),
    ),
  };
}

export async function getOne(db: Db, id: string) {
  const appointment = await getAppointment(db, id);
  if (!appointment) throw new HttpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.');
  const [allForDate, providers, chairs] = await Promise.all([
    appointmentsForDate(db, appointment.date),
    listReferences(db, 'providers'),
    listReferences(db, 'chairs'),
  ]);
  const names = nameMaps(providers, chairs);
  const conflicts = conflictsFor(appointment, allForDate).map((other) => toConflict(other, names));
  return { ...toView(appointment, names, conflicts.length > 0), conflicts };
}

let mutationQueue = Promise.resolve();

function serializeMutation<T>(action: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(action);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function updateOne(
  db: Db,
  id: string,
  patch: AppointmentPatch,
): Promise<Awaited<ReturnType<typeof getOne>>> {
  return serializeMutation(() => updateOneSerialized(db, id, patch));
}

async function updateOneSerialized(db: Db, id: string, patch: AppointmentPatch) {
  const current = await getAppointment(db, id);
  if (!current) throw new HttpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.');
  const updated = mergePatch(current, patch);
  validateAppointment(updated);

  if (patch.providerId && !(await hasReference(db, 'providers', patch.providerId))) {
    throw new HttpError(400, 'INVALID_PROVIDER', 'providerId does not identify a known provider.');
  }
  if (patch.chairId && !(await hasReference(db, 'chairs', patch.chairId))) {
    throw new HttpError(400, 'INVALID_CHAIR', 'chairId does not identify a known chair.');
  }

  const schedulingChanged =
    (patch.startTime !== undefined && patch.startTime !== current.startTime) ||
    (patch.endTime !== undefined && patch.endTime !== current.endTime) ||
    (patch.chairId !== undefined && patch.chairId !== current.chairId) ||
    (current.status === 'cancelled' && updated.status !== 'cancelled');
  if (schedulingChanged && updated.status !== 'cancelled') {
    const conflicts = conflictsFor(updated, await appointmentsForDate(db, updated.date));
    if (conflicts.length) await throwSchedulingConflict(db, updated, conflicts);
  }

  if (!(await updateAppointment(db, id, patch)))
    throw new HttpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.');
  return getOne(db, id);
}

export function createOne(
  db: Db,
  draft: AppointmentDraft,
): Promise<Awaited<ReturnType<typeof getOne>>> {
  return serializeMutation(async () => {
    const appointment: Appointment = { _id: randomUUID(), ...draft };
    validateAppointment(appointment);
    if (!(await hasReference(db, 'providers', appointment.providerId))) {
      throw new HttpError(
        400,
        'INVALID_PROVIDER',
        'providerId does not identify a known provider.',
      );
    }
    if (!(await hasReference(db, 'chairs', appointment.chairId))) {
      throw new HttpError(400, 'INVALID_CHAIR', 'chairId does not identify a known chair.');
    }
    const conflicts = conflictsFor(appointment, await appointmentsForDate(db, appointment.date));
    if (conflicts.length) await throwSchedulingConflict(db, appointment, conflicts);
    await insertAppointment(db, appointment);
    return getOne(db, appointment._id);
  });
}

export function deleteOne(db: Db, id: string): Promise<void> {
  return serializeMutation(async () => {
    if (!(await deleteAppointment(db, id)))
      throw new HttpError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment was not found.');
  });
}

async function throwSchedulingConflict(
  db: Db,
  appointment: Appointment,
  conflicts: Appointment[],
): Promise<never> {
  const chairs = await listReferences(db, 'chairs');
  const details = conflicts.map((item) =>
    toConflict(item, { chairs: new Map(chairs.map(({ id, name }) => [id, name])) }),
  );
  throw new HttpError(
    409,
    'SCHEDULING_CONFLICT',
    `This appointment overlaps ${details.map((item) => `${item.patientName} (${item.startTime}–${item.endTime})`).join(', ')} in ${details[0]?.chairName ?? appointment.chairId}.`,
    details,
  );
}

export function toConflict(
  appointment: Appointment,
  names: { chairs: Map<string, string> },
): Conflict {
  return {
    id: appointment._id,
    patientName: appointment.patientName,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    chairId: appointment.chairId,
    chairName: names.chairs.get(appointment.chairId) ?? appointment.chairId,
  };
}

function toView(
  appointment: Appointment,
  names: { providers: Map<string, string>; chairs: Map<string, string> },
  hasConflict: boolean,
): AppointmentView {
  const { _id, ...fields } = appointment;
  return {
    ...fields,
    id: _id,
    providerName: names.providers.get(appointment.providerId) ?? appointment.providerId,
    chairName: names.chairs.get(appointment.chairId) ?? appointment.chairId,
    hasConflict,
  };
}

function nameMaps(
  providers: { id: string; name: string }[],
  chairs: { id: string; name: string }[],
) {
  return {
    providers: new Map(providers.map(({ id, name }) => [id, name])),
    chairs: new Map(chairs.map(({ id, name }) => [id, name])),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
