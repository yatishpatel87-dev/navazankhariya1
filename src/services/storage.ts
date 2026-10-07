import { Student, AttendanceRecord, SchoolInfo, AppSettings } from '../types';
import { SEED_STUDENTS, DEFAULT_SCHOOL_INFO } from '../data/seedStudents';
import { generateMonthSeedAttendance } from '../data/seedAttendance';
import { PhotoStorage, PermanentStudentStorage } from './photoStorage';

const STORAGE_KEYS = {
  STUDENTS: 'nzps_students_std7_v2',
  ATTENDANCE: 'nzps_attendance_std7_v2',
  SCHOOL: 'nzps_school_std7_v2',
  SETTINGS: 'nzps_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  teacherPin: '1234',
  soundEffects: true,
  voiceGreeting: true,
  language: 'gu',
  autoResetAfter5PM: true,
  lockAfterFirstMark: true,
  lateTimeCutoff: '09:30 AM',
};

export class StorageService {
  static getStudents(): Student[] {
    const permanentProfiles = PermanentStudentStorage.getAllStudentProfilesSync();
    const permanentPhotos = PhotoStorage.getAllPhotosSync();

    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      let baseList: Student[] = [];

      if (data) {
        const parsed = JSON.parse(data);
        baseList = Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_STUDENTS;
      } else {
        baseList = SEED_STUDENTS;
      }

      // Always start with all base students (never drop any student)
      const profileMap = new Map<string, Student>();
      baseList.forEach((s) => profileMap.set(s.id, s));

      // Overlay any customized/locked permanent profiles so they NEVER get lost or overwritten
      permanentProfiles.forEach((s) => {
        const existing = profileMap.get(s.id);
        if (existing) {
          profileMap.set(s.id, { ...existing, ...s });
        } else {
          profileMap.set(s.id, s);
        }
      });

      const mergedList = Array.from(profileMap.values()).sort((a, b) => a.rollNo - b.rollNo);

      return mergedList.map((st) => ({
        ...st,
        photoUrl: permanentPhotos[st.id] || st.photoUrl,
      }));
    } catch {
      const profileMap = new Map<string, Student>();
      SEED_STUDENTS.forEach((s) => profileMap.set(s.id, s));
      permanentProfiles.forEach((s) => profileMap.set(s.id, s));
      return Array.from(profileMap.values())
        .sort((a, b) => a.rollNo - b.rollNo)
        .map((st) => ({
          ...st,
          photoUrl: permanentPhotos[st.id] || st.photoUrl,
        }));
    }
  }

  static saveStudents(students: Student[]): void {
    try {
      // 1. Permanently persist each student's entire profile & photo into IndexedDB + LocalStorage
      PermanentStudentStorage.saveAllStudentProfiles(students);

      // 2. Persist students array in localStorage
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.error('Failed to save students to localStorage (IndexedDB has saved all profiles & photos)', e);
    }
  }

  static deleteStudent(studentId: string): void {
    PermanentStudentStorage.deleteStudentProfile(studentId);
    const updated = this.getStudents().filter((s) => s.id !== studentId);
    this.saveStudents(updated);
  }

  static getStudentPhoto(studentId: string): string | undefined {
    return PhotoStorage.getPhotoSync(studentId);
  }

  static getStudentProfile(studentId: string): Student | undefined {
    return PermanentStudentStorage.getStudentProfileSync(studentId);
  }

  static isStudentLocked(studentId: string): boolean {
    return PermanentStudentStorage.isStudentLocked(studentId);
  }

  static markStudentLocked(studentId: string): void {
    PermanentStudentStorage.markStudentLocked(studentId);
  }

  static async syncPhotosWithStorage(): Promise<Student[]> {
    // Hydrate both student profiles and photos from permanent IndexedDB
    const indexedDbProfiles = await PermanentStudentStorage.getAllStudentProfilesFromIndexedDB();
    let currentList = this.getStudents();

    if (indexedDbProfiles && indexedDbProfiles.length > 0) {
      const map = new Map<string, Student>();
      currentList.forEach((s) => map.set(s.id, s));
      indexedDbProfiles.forEach((s) => map.set(s.id, s));
      currentList = Array.from(map.values());
    }

    this.saveStudents(currentList);
    return currentList;
  }

  static getAttendanceRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (!data) {
        const students = this.getStudents();
        const initialRecords = generateMonthSeedAttendance(students);
        this.saveAttendanceRecords(initialRecords);
        return initialRecords;
      }
      const parsed: AttendanceRecord[] = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const students = this.getStudents();
        const initialRecords = generateMonthSeedAttendance(students);
        this.saveAttendanceRecords(initialRecords);
        return initialRecords;
      }
      return parsed;
    } catch {
      const students = this.getStudents();
      return generateMonthSeedAttendance(students);
    }
  }

  static saveAttendanceRecords(records: AttendanceRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save attendance', e);
    }
  }

  static getSchoolInfo(): SchoolInfo {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHOOL);
      if (!data) {
        this.saveSchoolInfo(DEFAULT_SCHOOL_INFO);
        return DEFAULT_SCHOOL_INFO;
      }
      const parsed = JSON.parse(data);
      if (parsed?.subTitleGu?.includes('૪૨') || parsed?.subTitleGu?.includes('42')) {
        parsed.subTitleGu = DEFAULT_SCHOOL_INFO.subTitleGu;
        this.saveSchoolInfo(parsed);
      }
      return parsed;
    } catch {
      return DEFAULT_SCHOOL_INFO;
    }
  }

  static saveSchoolInfo(info: SchoolInfo): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(info));
    } catch (e) {
      console.error('Failed to save school info', e);
    }
  }

  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        this.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }

  // Helper to mark a single student's attendance
  static toggleAttendance(
    studentId: string,
    date: string,
    markedBy: 'student' | 'teacher' = 'student'
  ): {
    isPresent: boolean;
    record: AttendanceRecord | null;
    alreadyMarked?: boolean;
    after5PM?: boolean;
  } {
    const settings = this.getSettings();

    // Check if it is after 5 PM and student is trying to mark
    if (markedBy === 'student' && settings.autoResetAfter5PM !== false && this.isAfter5PM()) {
      return { isPresent: false, record: null, after5PM: true };
    }

    const records = this.getAttendanceRecords();
    const existingIndex = records.findIndex(
      (r) => r.studentId === studentId && r.date === date
    );

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (existingIndex >= 0) {
      const current = records[existingIndex];

      // "balak ek var hajri pure pachi purai nsi dhake" (એક વાર પુરાયા પછી બાળક ફરી બદલી ના શકે)
      if (markedBy === 'student' && current.status === 'present' && settings.lockAfterFirstMark !== false) {
        return { isPresent: true, record: current, alreadyMarked: true };
      }

      if (current.status === 'present') {
        // Toggle to absent (allowed for teacher or if lock is explicitly turned off)
        current.status = 'absent';
        current.timestamp = timeString;
        current.markedBy = markedBy;
        this.saveAttendanceRecords(records);
        return { isPresent: false, record: current };
      } else {
        // Toggle back to present
        current.status = 'present';
        current.timestamp = timeString;
        current.markedBy = markedBy;
        this.saveAttendanceRecords(records);
        return { isPresent: true, record: current };
      }
    } else {
      // New record -> mark present
      const newRecord: AttendanceRecord = {
        id: `${date}_${studentId}_${Date.now()}`,
        date,
        studentId,
        status: 'present',
        timestamp: timeString,
        markedBy,
      };
      records.push(newRecord);
      this.saveAttendanceRecords(records);
      return { isPresent: true, record: newRecord };
    }
  }

  // 5 PM Auto-Reset helpers
  static isAfter5PM(): boolean {
    const hour = new Date().getHours();
    return hour >= 17;
  }

  static getLast5PMResetDate(): string | null {
    try {
      return localStorage.getItem('nzps_last_5pm_autoreset_date');
    } catch {
      return null;
    }
  }

  static record5PMReset(date: string): void {
    try {
      localStorage.setItem('nzps_last_5pm_autoreset_date', date);
    } catch (e) {
      console.error('Failed to save 5PM reset timestamp', e);
    }
  }

  static perform5PMAutoReset(date: string): boolean {
    try {
      const records = this.getAttendanceRecords();
      const todayRecords = records.filter((r) => r.date === date);

      // Save an archive snapshot of today's attendance so reports/history are never lost
      if (todayRecords.length > 0) {
        localStorage.setItem(`nzps_archive_${date}`, JSON.stringify(todayRecords));
      }

      // Clear today's active attendance from the live board
      const remainingRecords = records.filter((r) => r.date !== date);
      this.saveAttendanceRecords(remainingRecords);
      this.record5PMReset(date);
      return true;
    } catch (e) {
      console.error('5PM auto-reset failed', e);
      return false;
    }
  }

  // Bulk actions for teacher
  static markAll(
    studentIds: string[],
    date: string,
    status: 'present' | 'absent'
  ): void {
    const records = this.getAttendanceRecords();
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    studentIds.forEach((studentId) => {
      const idx = records.findIndex((r) => r.studentId === studentId && r.date === date);
      if (idx >= 0) {
        records[idx].status = status;
        records[idx].timestamp = timeString;
        records[idx].markedBy = 'teacher';
      } else {
        records.push({
          id: `${date}_${studentId}_${Date.now()}`,
          date,
          studentId,
          status,
          timestamp: timeString,
          markedBy: 'teacher',
        });
      }
    });

    this.saveAttendanceRecords(records);
  }

  static clearDateAttendance(date: string, studentIds?: string[]): void {
    let records = this.getAttendanceRecords();
    if (studentIds && studentIds.length > 0) {
      records = records.filter(
        (r) => !(r.date === date && studentIds.includes(r.studentId))
      );
    } else {
      records = records.filter((r) => r.date !== date);
    }
    this.saveAttendanceRecords(records);
  }
}
