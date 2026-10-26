export type DraftActivity = { date: string; time: string; title: string; place: string };
export function isItineraryWithinTrip(activities: DraftActivity[], startDate: string, endDate: string): boolean;
