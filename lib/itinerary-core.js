export function isItineraryWithinTrip(activities, startDate, endDate) {
  if (!Array.isArray(activities) || activities.length < 1 || activities.length > 30) return false;
  const perDay = new Map();
  for (const item of activities) {
    if (!item || typeof item.date !== 'string' || item.date < startDate || item.date > endDate) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
    const parsedDate = new Date(`${item.date}T12:00:00Z`);
    if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== item.date) return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) return false;
    if (typeof item.title !== 'string' || item.title.trim().length < 2 || item.title.length > 120) return false;
    if (typeof item.place !== 'string' || item.place.length > 160) return false;
    const count = (perDay.get(item.date) || 0) + 1;
    if (count > 3) return false;
    perDay.set(item.date, count);
  }
  return true;
}
