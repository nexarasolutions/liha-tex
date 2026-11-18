const TZ = 'Asia/Kolkata';

/** Weekly store hours, 0 = Sunday. Times are 24h in IST. */
const HOURS = [
  { day: 0, open: '10:00', close: '14:00' },
  { day: 1, open: '09:30', close: '20:30' },
  { day: 2, open: '09:30', close: '20:30' },
  { day: 3, open: '09:30', close: '20:30' },
  { day: 4, open: '09:30', close: '20:30' },
  { day: 5, open: '09:30', close: '20:30' },
  { day: 6, open: '09:30', close: '20:30' },
];

export const store = {
  name: 'Liha Tex',
  city: 'Tirupur',
  state: 'Tamil Nadu',
  country: 'India',
  phones: ['+91 95244 63580', '+91 99766 83036'],
  mapsQuery: 'Liha Tex Tirupur Tamil Nadu',
  onlineStore: 'coming-soon',
  hours: TZ,
};

function istParts(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: days[get('weekday')] ?? now.getUTCDay(),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Whether the shop is open right now in Indian Standard Time. */
export function storeStatus(now = new Date()) {
  const { day, minutes } = istParts(now);
  const today = HOURS[day];
  const isOpen = minutes >= toMinutes(today.open) && minutes < toMinutes(today.close);

  return {
    openNow: isOpen,
    timezone: TZ,
    today: { day, open: today.open, close: today.close },
    week: HOURS,
  };
}
