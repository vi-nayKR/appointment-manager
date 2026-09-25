import type { Db, Filter, Sort } from 'mongodb';
import type { Appointment, AppointmentPatch } from './models.ts';

export function appointmentCollection(db: Db) {
  return db.collection<Appointment>('appointments');
}

export async function getAppointment(db: Db, id: string) {
  return appointmentCollection(db).findOne({ _id: id });
}

export async function listAppointments(
  db: Db,
  filter: Filter<Appointment>,
  page: number,
  limit: number,
) {
  const collection = appointmentCollection(db);
  const [total, items] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter)
      .sort({ startTime: 1, _id: 1 } satisfies Sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
  ]);
  return { total, items };
}

export async function appointmentsForDate(db: Db, date: string) {
  return appointmentCollection(db).find({ date }).toArray();
}

export async function updateAppointment(db: Db, id: string, patch: AppointmentPatch) {
  const result = await appointmentCollection(db).updateOne({ _id: id }, { $set: patch });
  return result.matchedCount > 0;
}

export async function insertAppointment(db: Db, appointment: Appointment) {
  await appointmentCollection(db).insertOne(appointment);
}

export async function deleteAppointment(db: Db, id: string) {
  const result = await appointmentCollection(db).deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function hasReference(db: Db, collection: 'providers' | 'chairs', id: string) {
  return Boolean(
    await db
      .collection<{ _id: string; name: string }>(collection)
      .findOne({ _id: id }, { projection: { _id: 1 } }),
  );
}

export async function listReferences(db: Db, collection: 'providers' | 'chairs') {
  const docs = await db
    .collection<{ _id: string; name: string }>(collection)
    .find({}, { projection: { name: 1 } })
    .sort({ _id: 1 })
    .toArray();
  return docs.map(({ _id, name }) => ({ id: _id, name }));
}
