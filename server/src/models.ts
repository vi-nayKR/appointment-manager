export const statuses = ['scheduled', 'checked_in', 'completed', 'cancelled'] as const;
export type AppointmentStatus = (typeof statuses)[number];

export type Appointment = {
  _id: string;
  patientName: string;
  providerId: string;
  chairId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string;
};

export type AppointmentView = Omit<Appointment, '_id'> & {
  id: string;
  providerName: string;
  chairName: string;
  hasConflict: boolean;
};

export type Conflict = {
  id: string;
  patientName: string;
  startTime: string;
  endTime: string;
  chairId: string;
  chairName: string;
};

export type AppointmentPatch = Partial<
  Pick<Appointment, 'startTime' | 'endTime' | 'chairId' | 'providerId' | 'status' | 'notes'>
>;
export type AppointmentDraft = Omit<Appointment, '_id'>;

export type Page<T> = { items: T[]; total: number; page: number; limit: number };
