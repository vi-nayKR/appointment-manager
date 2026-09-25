import assert from 'node:assert/strict';
import test from 'node:test';
import { conflictsFor, mergePatch, overlaps } from '../src/appointments.service.ts';
import { listAppointments, updateAppointment } from '../src/appointments.repository.ts';
import {
  parseCreate,
  parseListQuery,
  parsePatch,
  validateTimeRange,
  validDate,
} from '../src/validation.ts';

const appointment = (overrides = {}) => ({
  _id: 'a',
  patientName: 'Alex',
  providerId: 'provider-1',
  chairId: 'chair-1',
  date: '2026-09-25',
  startTime: '10:00',
  endTime: '10:30',
  status: 'scheduled',
  notes: 'keep me',
  ...overrides,
});

test('conflicts use half-open intervals and ignore cancelled appointments', () => {
  const original = appointment();
  assert.equal(
    overlaps(original, appointment({ _id: 'b', startTime: '10:30', endTime: '11:00' })),
    false,
  );
  assert.equal(
    conflictsFor(original, [appointment({ _id: 'b', startTime: '10:15', endTime: '10:45' })])
      .length,
    1,
  );
  assert.equal(conflictsFor(original, [appointment({ _id: 'b', status: 'cancelled' })]).length, 0);
  assert.equal(
    conflictsFor(appointment({ status: 'cancelled' }), [appointment({ _id: 'b' })]).length,
    0,
  );
});

test('date and time validation reject impossible or reversed values', () => {
  assert.equal(validDate('2026-02-29'), false);
  assert.equal(validDate('2028-02-29'), true);
  assert.throws(() => validateTimeRange('10:30', '10:00'), { code: 'INVALID_TIME_RANGE' });
});

test('PATCH changes only supplied fields and rejects empty or unknown bodies', () => {
  const patch = parsePatch({ notes: 'updated' });
  assert.deepEqual(mergePatch(appointment(), patch), { ...appointment(), notes: 'updated' });
  assert.throws(() => parsePatch({}), { code: 'EMPTY_PATCH' });
  assert.throws(() => parsePatch({ patientName: 'Changed' }), { code: 'UNKNOWN_FIELD' });
});

test('create validation normalizes required fields and rejects invalid appointment data', () => {
  const draft = parseCreate({
    patientName: '  Casey Lee ',
    providerId: 'provider-1',
    chairId: 'chair-1',
    date: '2026-09-25',
    startTime: '12:00',
    endTime: '12:30',
  });
  assert.equal(draft.patientName, 'Casey Lee');
  assert.equal(draft.status, 'scheduled');
  assert.equal(draft.notes, '');
  assert.throws(
    () =>
      parseCreate({
        patientName: 'Casey',
        providerId: 'provider-1',
        chairId: 'chair-1',
        date: '2026-02-29',
        startTime: '12:00',
        endTime: '12:30',
      }),
    { code: 'INVALID_DATE' },
  );
});

test('list query validates filters and pagination', () => {
  assert.deepEqual(
    parseListQuery({
      date: '2026-09-25',
      providerId: 'provider-1',
      status: 'scheduled',
      search: ' Alex ',
      page: '2',
      limit: '10',
    }),
    {
      date: '2026-09-25',
      providerId: 'provider-1',
      status: 'scheduled',
      search: 'Alex',
      page: 2,
      limit: 10,
    },
  );
  assert.equal(
    parseListQuery({ date: '2026-09-25', providerId: ' provider-1 ' }).providerId,
    'provider-1',
  );
  assert.equal(parsePatch({ chairId: ' chair-1 ', providerId: ' provider-1 ' }).chairId, 'chair-1');
  assert.equal(
    parsePatch({ chairId: ' chair-1 ', providerId: ' provider-1 ' }).providerId,
    'provider-1',
  );
  assert.throws(() => parseListQuery({ date: '2026-09-25', page: '0' }), { code: 'INVALID_PAGE' });
});

test('repository applies the same filters to sorted paginated results and count', async () => {
  const calls = {};
  const cursor = {
    sort(value) {
      calls.sort = value;
      return this;
    },
    skip(value) {
      calls.skip = value;
      return this;
    },
    limit(value) {
      calls.limit = value;
      return this;
    },
    async toArray() {
      return [appointment()];
    },
  };
  const filter = { date: '2026-09-25', providerId: 'provider-1', status: 'scheduled' };
  const db = {
    collection: () => ({
      countDocuments: async (value) => {
        calls.countFilter = value;
        return 21;
      },
      find: (value) => {
        calls.findFilter = value;
        return cursor;
      },
    }),
  };

  const result = await listAppointments(db, filter, 3, 10);
  assert.equal(result.total, 21);
  assert.equal(result.items.length, 1);
  assert.equal(calls.countFilter, filter);
  assert.equal(calls.findFilter, filter);
  assert.deepEqual(calls.sort, { startTime: 1, _id: 1 });
  assert.equal(calls.skip, 20);
  assert.equal(calls.limit, 10);
});

test('repository persists patches with $set instead of replacing the appointment', async () => {
  let update;
  const db = {
    collection: () => ({
      updateOne: async (...args) => {
        update = args;
        return { matchedCount: 1 };
      },
    }),
  };
  assert.equal(await updateAppointment(db, 'appointment-1', { status: 'completed' }), true);
  assert.deepEqual(update, [{ _id: 'appointment-1' }, { $set: { status: 'completed' } }]);
});
