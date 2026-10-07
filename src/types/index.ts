export type Gender = 'male' | 'female';
export type StudentCategory = 'SC' | 'ST' | 'OBC' | 'Other';

export interface Student {
  id: string;
  rollNo: number;
  nameGu: string;
  nameEn: string;
  standard: number; // 1 to 8
  division?: string;
  gender: Gender;
  category?: StudentCategory;
  photoUrl?: string;
  avatarBg?: string;
  avatarIcon?: string; // e.g. boy1, girl1, etc.
  parentPhone?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  timestamp: string; // e.g. "09:30 AM"
  markedBy: 'student' | 'teacher';
}

export interface SchoolInfo {
  nameGu: string;
  nameEn: string;
  subTitleGu: string;
  udiseCode: string;
  village: string;
  taluka: string;
  district: string;
  academicYear: string;
}

export interface AppSettings {
  teacherPin: string;
  soundEffects: boolean;
  voiceGreeting: boolean;
  language: 'gu' | 'en';
  autoResetAfter5PM: boolean;
  lockAfterFirstMark: boolean;
  lateTimeCutoff?: string; // e.g. "09:30 AM"
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}
