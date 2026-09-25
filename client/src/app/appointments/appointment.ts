export const appointmentStatuses = ['scheduled', 'checked_in', 'completed', 'cancelled'] as const;
export type AppointmentStatus = (typeof appointmentStatuses)[number];

export type Appointment = {
  id: string;
  patientName: string;
  providerId: string;
  providerName: string;
  chairId: string;
  chairName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string;
  hasConflict: boolean;
};

export type AppointmentPage = { items: Appointment[]; total: number; page: number; limit: number };
export type Reference = { id: string; name: string };
export type AppointmentConflict = Pick<
  Appointment,
  'id' | 'patientName' | 'startTime' | 'endTime' | 'chairId' | 'chairName'
>;
export type AppointmentDetail = Appointment & { conflicts: AppointmentConflict[] };
export type AppointmentQuery = {
  date: string;
  providerId?: string;
  status?: AppointmentStatus;
  search?: string;
  page: number;
  limit: number;
};
export type AppointmentPatch = Partial<
  Pick<Appointment, 'startTime' | 'endTime' | 'chairId' | 'providerId' | 'status' | 'notes'>
>;
export type AppointmentInput = Pick<
  Appointment,
  'patientName' | 'providerId' | 'chairId' | 'date' | 'startTime' | 'endTime' | 'status' | 'notes'
>;
