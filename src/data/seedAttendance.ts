import { AttendanceRecord, Student } from '../types';

/**
 * Generate realistic attendance records for the current month (September 2026)
 * for all 43 students of Standard 7 so monthly trends and charts are immediately rich.
 */
export function generateMonthSeedAttendance(students: Student[], currentYearMonth = '2026-09'): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const daysInMonth = 29; // up to current date 29th

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateStr = `${currentYearMonth}-${dayStr}`;
    const dateObj = new Date(2026, 8, d); // Month 8 is September (0-indexed)
    const dayOfWeek = dateObj.getDay();

    // Skip Sundays (0)
    if (dayOfWeek === 0) continue;

    // Simulate attendance for all students on this school day
    students.forEach((student, index) => {
      // Deterministic realistic pattern: most students attend 90-95% of days
      // Students with higher roll numbers or specific indices have occasional absences
      const seed = (d * 17 + student.rollNo * 23 + index * 7) % 100;
      
      let status: 'present' | 'absent' | 'leave' = 'present';
      if (seed > 92) {
        status = 'absent';
      } else if (seed > 87) {
        status = 'leave';
      } else {
        status = 'present';
      }

      // Generate realistic morning time between 09:15 AM and 10:15 AM
      const minute = (15 + (student.rollNo * 3 + d * 5) % 45).toString().padStart(2, '0');
      const hour = minute > '45' ? '10' : '09';
      const timestamp = `${hour}:${minute} AM`;

      records.push({
        id: `${dateStr}_${student.id}`,
        date: dateStr,
        studentId: student.id,
        status,
        timestamp: status === 'present' ? timestamp : '',
        markedBy: d === daysInMonth ? 'student' : 'teacher',
      });
    });
  }

  return records;
}
