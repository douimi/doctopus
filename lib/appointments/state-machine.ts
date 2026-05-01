export type AppointmentStatus =
  | 'scheduled'
  | 'waiting'
  | 'in_consultation'
  | 'done'
  | 'cancelled'
  | 'no_show';

export type Action = 'arrive' | 'start' | 'finalize' | 'cancel' | 'noShow';

const TRANSITIONS: Record<AppointmentStatus, Partial<Record<Action, AppointmentStatus>>> = {
  scheduled: { arrive: 'waiting', cancel: 'cancelled', noShow: 'no_show' },
  waiting: { start: 'in_consultation', cancel: 'cancelled' },
  in_consultation: { finalize: 'done' },
  done: {},
  cancelled: {},
  no_show: {},
};

export function canTransition(from: AppointmentStatus, action: Action): boolean {
  return TRANSITIONS[from][action] !== undefined;
}

export type AppointmentPatch = {
  status: AppointmentStatus;
  arrivedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
};

export function applyTransition(
  from: AppointmentStatus,
  action: Action,
  now: Date,
): AppointmentPatch {
  const next = TRANSITIONS[from][action];
  if (!next) {
    throw new Error(`Transition not allowed: ${from} --${action}-->`);
  }
  switch (action) {
    case 'arrive':
      return { status: next, arrivedAt: now };
    case 'start':
      return { status: next, startedAt: now };
    case 'finalize':
      return { status: next, endedAt: now };
    case 'cancel':
    case 'noShow':
      return { status: next };
  }
}
