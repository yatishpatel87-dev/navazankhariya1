/**
 * Utility to parse time strings like "09:30 AM", "09:45 AM", "10:15 AM", "14:30"
 * and check if attendance was marked after a cutoff time (default: 09:30 AM).
 */
export function isLateAttendance(
  timestamp?: string,
  cutoff: string = '09:30 AM'
): boolean {
  if (!timestamp) return false;

  const timeToMinutes = (t: string): number | null => {
    const clean = t.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();

    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  };

  const recordMin = timeToMinutes(timestamp);
  const cutoffMin = timeToMinutes(cutoff) ?? 9 * 60 + 30; // 570 mins = 09:30 AM

  if (recordMin === null) return false;
  return recordMin > cutoffMin;
}
