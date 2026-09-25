import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.ts';

const appointment = {
  _id: 'appointment-1',
  patientName: 'Alex Lee',
  providerId: 'provider-1',
  chairId: 'chair-1',
  date: '2026-09-25',
  startTime: '10:00',
  endTime: '10:30',
  status: 'scheduled',
  notes: '',
};

function fakeDb(appointments = [appointment]) {
  const data = {
    appointments,
    providers: [{ _id: 'provider-1', name: 'Dr. Chen' }],
    chairs: [{ _id: 'chair-1', name: 'Chair 1' }],
  };
  return {
    collection(name) {
      const documents = data[name] ?? [];
      return {
        countDocuments: async (filter) => documents.filter((doc) => matches(doc, filter)).length,
        findOne: async (filter) => documents.find((doc) => matches(doc, filter)) ?? null,
        insertOne: async (doc) => {
          documents.push(doc);
          return { insertedId: doc._id };
        },
        updateOne: async (filter, update) => {
          const doc = documents.find((item) => matches(item, filter));
          if (doc) Object.assign(doc, update.$set);
          return { matchedCount: doc ? 1 : 0 };
        },
        deleteOne: async (filter) => {
          const index = documents.findIndex((doc) => matches(doc, filter));
          if (index < 0) return { deletedCount: 0 };
          documents.splice(index, 1);
          return { deletedCount: 1 };
        },
        find(filter) {
          let result = documents.filter((doc) => matches(doc, filter));
          return {
            sort() {
              return this;
            },
            skip(count) {
              result = result.slice(count);
              return this;
            },
            limit(count) {
              result = result.slice(0, count);
              return this;
            },
            async toArray() {
              return result;
            },
          };
        },
      };
    },
  };
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, value]) => document[key] === value);
}

async function request(path, { db = fakeDb(), method = 'GET', body } = {}) {
  const server = createApp(db).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('HTTP list route returns appointment data and reference names', async () => {
  const response = await request('/api/appointments?date=2026-09-25');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    total: 1,
    page: 1,
    limit: 20,
    items: [
      {
        id: 'appointment-1',
        patientName: 'Alex Lee',
        providerId: 'provider-1',
        chairId: 'chair-1',
        date: '2026-09-25',
        startTime: '10:00',
        endTime: '10:30',
        status: 'scheduled',
        notes: '',
        providerName: 'Dr. Chen',
        chairName: 'Chair 1',
        hasConflict: false,
      },
    ],
  });
});

test('HTTP validation errors use the JSON error envelope', async () => {
  const response = await request('/api/appointments?date=not-a-date');
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_DATE');
  assert.equal(typeof response.body.error.message, 'string');
});

test('HTTP missing appointment uses the JSON 404 error envelope', async () => {
  const response = await request('/api/appointments/missing');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'APPOINTMENT_NOT_FOUND');
});

test('unknown API route uses the JSON 404 error envelope', async () => {
  const response = await request('/api/not-a-route');
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
});

test('HTTP create rejects overlapping appointments with conflict details', async () => {
  const response = await request('/api/appointments', {
    method: 'POST',
    body: {
      patientName: 'Sam Taylor',
      providerId: 'provider-1',
      chairId: 'chair-1',
      date: '2026-09-25',
      startTime: '10:15',
      endTime: '10:45',
    },
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'SCHEDULING_CONFLICT');
  assert.equal(response.body.error.conflicts[0].id, 'appointment-1');
});

test('HTTP create returns 201 and the created appointment', async () => {
  const response = await request('/api/appointments', {
    method: 'POST',
    body: {
      patientName: 'Sam Taylor',
      providerId: 'provider-1',
      chairId: 'chair-1',
      date: '2026-09-25',
      startTime: '11:00',
      endTime: '11:30',
    },
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.patientName, 'Sam Taylor');
  assert.equal(response.body.providerName, 'Dr. Chen');
  assert.equal(response.body.startTime, '11:00');
});

test('HTTP PATCH updates supplied fields and preserves omitted appointment fields', async () => {
  const db = fakeDb();
  const response = await request('/api/appointments/appointment-1', {
    db,
    method: 'PATCH',
    body: { notes: 'updated' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.notes, 'updated');
  assert.equal(response.body.patientName, appointment.patientName);
  assert.equal(response.body.providerId, appointment.providerId);
  assert.equal(response.body.chairId, appointment.chairId);
  assert.equal(response.body.startTime, appointment.startTime);
});

test('HTTP DELETE returns an empty 204 response and removes the appointment', async () => {
  const db = fakeDb();
  const response = await request('/api/appointments/appointment-1', { db, method: 'DELETE' });
  assert.equal(response.status, 204);
  assert.equal(response.body, undefined);

  const missing = await request('/api/appointments/appointment-1', { db });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'APPOINTMENT_NOT_FOUND');
});
