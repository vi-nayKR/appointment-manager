import { connectDb } from './db.ts';

type SeedAppointment = {
  _id: string;
  patientName: string;
  providerId: string;
  chairId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'checked_in' | 'completed' | 'cancelled';
  notes: string;
};

const providers = [
  { _id: 'provider-1', name: 'Dr. Maya Chen' },
  { _id: 'provider-2', name: 'Dr. Arun Patel' },
  { _id: 'provider-3', name: 'Dr. Sofia Rivera' },
];

const chairs = [
  { _id: 'chair-1', name: 'Chair 1' },
  { _id: 'chair-2', name: 'Chair 2' },
  { _id: 'chair-3', name: 'Chair 3' },
  { _id: 'chair-4', name: 'Chair 4' },
];

const schedule: Omit<SeedAppointment, 'date'>[] = [
  {
    _id: 'appointment-1',
    patientName: 'John Smith',
    providerId: 'provider-1',
    chairId: 'chair-1',
    startTime: '10:00',
    endTime: '10:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-2',
    patientName: 'Sarah Thomas',
    providerId: 'provider-2',
    chairId: 'chair-1',
    startTime: '10:15',
    endTime: '10:45',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-3',
    patientName: 'Mei Lee',
    providerId: 'provider-1',
    chairId: 'chair-1',
    startTime: '10:45',
    endTime: '11:15',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-4',
    patientName: 'Priya Shah',
    providerId: 'provider-3',
    chairId: 'chair-2',
    startTime: '11:00',
    endTime: '11:30',
    status: 'checked_in',
    notes: '',
  },
  {
    _id: 'appointment-5',
    patientName: 'David Kim',
    providerId: 'provider-2',
    chairId: 'chair-2',
    startTime: '11:15',
    endTime: '11:45',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-6',
    patientName: 'Olivia Garcia',
    providerId: 'provider-1',
    chairId: 'chair-2',
    startTime: '11:05',
    endTime: '11:20',
    status: 'cancelled',
    notes: '',
  },
  {
    _id: 'appointment-7',
    patientName: 'Noah Wilson',
    providerId: 'provider-2',
    chairId: 'chair-3',
    startTime: '08:00',
    endTime: '08:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-8',
    patientName: 'Ava Brown',
    providerId: 'provider-3',
    chairId: 'chair-3',
    startTime: '09:00',
    endTime: '09:30',
    status: 'completed',
    notes: '',
  },
  {
    _id: 'appointment-9',
    patientName: 'Liam Davis',
    providerId: 'provider-1',
    chairId: 'chair-4',
    startTime: '10:00',
    endTime: '10:30',
    status: 'checked_in',
    notes: '',
  },
  {
    _id: 'appointment-10',
    patientName: 'Emma Miller',
    providerId: 'provider-2',
    chairId: 'chair-4',
    startTime: '11:00',
    endTime: '11:30',
    status: 'cancelled',
    notes: '',
  },
  {
    _id: 'appointment-11',
    patientName: 'Lucas Moore',
    providerId: 'provider-3',
    chairId: 'chair-1',
    startTime: '13:00',
    endTime: '13:30',
    status: 'completed',
    notes: '',
  },
  {
    _id: 'appointment-12',
    patientName: 'Mia Taylor',
    providerId: 'provider-1',
    chairId: 'chair-2',
    startTime: '14:00',
    endTime: '14:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-13',
    patientName: 'Ethan Anderson',
    providerId: 'provider-1',
    chairId: 'chair-1',
    startTime: '08:00',
    endTime: '08:30',
    status: 'completed',
    notes: '',
  },
  {
    _id: 'appointment-14',
    patientName: 'Isabella Thomas',
    providerId: 'provider-2',
    chairId: 'chair-2',
    startTime: '09:00',
    endTime: '09:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-15',
    patientName: 'James Jackson',
    providerId: 'provider-3',
    chairId: 'chair-3',
    startTime: '10:00',
    endTime: '10:30',
    status: 'checked_in',
    notes: '',
  },
  {
    _id: 'appointment-16',
    patientName: 'Amelia White',
    providerId: 'provider-1',
    chairId: 'chair-4',
    startTime: '11:00',
    endTime: '11:30',
    status: 'cancelled',
    notes: '',
  },
  {
    _id: 'appointment-17',
    patientName: 'Benjamin Harris',
    providerId: 'provider-2',
    chairId: 'chair-1',
    startTime: '13:00',
    endTime: '13:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-18',
    patientName: 'Charlotte Martin',
    providerId: 'provider-3',
    chairId: 'chair-2',
    startTime: '14:00',
    endTime: '14:30',
    status: 'completed',
    notes: '',
  },
  {
    _id: 'appointment-19',
    patientName: 'Henry Thompson',
    providerId: 'provider-2',
    chairId: 'chair-1',
    startTime: '08:00',
    endTime: '08:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-20',
    patientName: 'Evelyn Lee',
    providerId: 'provider-3',
    chairId: 'chair-2',
    startTime: '09:00',
    endTime: '09:30',
    status: 'checked_in',
    notes: '',
  },
  {
    _id: 'appointment-21',
    patientName: 'Alexander Clark',
    providerId: 'provider-1',
    chairId: 'chair-3',
    startTime: '10:00',
    endTime: '10:30',
    status: 'completed',
    notes: '',
  },
  {
    _id: 'appointment-22',
    patientName: 'Harper Lewis',
    providerId: 'provider-2',
    chairId: 'chair-4',
    startTime: '11:00',
    endTime: '11:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-23',
    patientName: 'Daniel Walker',
    providerId: 'provider-3',
    chairId: 'chair-1',
    startTime: '13:00',
    endTime: '13:30',
    status: 'cancelled',
    notes: '',
  },
  {
    _id: 'appointment-24',
    patientName: 'Ella Hall',
    providerId: 'provider-1',
    chairId: 'chair-2',
    startTime: '14:00',
    endTime: '14:30',
    status: 'scheduled',
    notes: '',
  },
  {
    _id: 'appointment-25',
    patientName: 'Chloe Martin',
    providerId: 'provider-3',
    chairId: 'chair-2',
    startTime: '09:30',
    endTime: '10:00',
    status: 'completed',
    notes: '',
  },
  {
    _id: 'appointment-26',
    patientName: 'Mason Young',
    providerId: 'provider-1',
    chairId: 'chair-3',
    startTime: '10:30',
    endTime: '11:00',
    status: 'checked_in',
    notes: '',
  },
  {
    _id: 'appointment-27',
    patientName: 'Ruby Scott',
    providerId: 'provider-2',
    chairId: 'chair-4',
    startTime: '11:15',
    endTime: '11:45',
    status: 'scheduled',
    notes: '',
  },
];

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetDate(base: string, days: number): string {
  const [year, month, day] = base.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

async function main() {
  const { client, db } = await connectDb();
  try {
    await db.collection<{ _id: string; name: string }>('providers').bulkWrite(
      providers.map((doc) => ({
        updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true },
      })),
    );
    await db.collection<{ _id: string; name: string }>('chairs').bulkWrite(
      chairs.map((doc) => ({
        updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true },
      })),
    );

    const appointments = db.collection<SeedAppointment>('appointments');
    const existing = await appointments.findOne({ _id: 'appointment-1' });
    const demoDate = existing?.date ?? localDate(new Date());
    const previousDate = offsetDate(demoDate, -1);
    const nextDate = offsetDate(demoDate, 1);
    const records: SeedAppointment[] = schedule.map((appointment, index) => ({
      ...appointment,
      date: index < 12 ? demoDate : index < 18 ? previousDate : nextDate,
    }));

    await appointments.bulkWrite(
      records.map((doc) => ({
        updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true },
      })),
    );

    const [providerCount, chairCount, appointmentCount] = await Promise.all([
      db.collection('providers').countDocuments(),
      db.collection('chairs').countDocuments(),
      appointments.countDocuments(),
    ]);
    console.log(
      `providers=${providerCount} chairs=${chairCount} appointments=${appointmentCount} demoDate=${demoDate}`,
    );
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Failed to seed database');
  process.exitCode = 1;
});
