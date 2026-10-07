/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StudentAttendanceSection } from './components/StudentAttendanceSection';
import { TeacherDashboard } from './components/TeacherDashboard';
import { PinModal } from './components/PinModal';
import { StorageService } from './services/storage';
import { Student, AttendanceRecord, AttendanceStatus, SchoolInfo, AppSettings } from './types';
import { getTodayDateString } from './utils/gujarati';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(StorageService.getSchoolInfo());
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [currentMode, setCurrentMode] = useState<'student' | 'teacher'>('student');
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [todayDate, setTodayDate] = useState<string>(getTodayDateString());

  // Load initial data on mount
  useEffect(() => {
    setStudents(StorageService.getStudents());
    setAttendanceRecords(StorageService.getAttendanceRecords());
    setSchoolInfo(StorageService.getSchoolInfo());
    setSettings(StorageService.getSettings());

    // Hydrate & permanently lock all uploaded photos from IndexedDB safely
    StorageService.syncPhotosWithStorage().then((hydrated) => {
      setStudents((current) => {
        if (!current || current.length === 0) return hydrated;
        const map = new Map<string, Student>();
        hydrated.forEach((s) => map.set(s.id, s));
        current.forEach((s) => map.set(s.id, s));
        return Array.from(map.values()).sort((a, b) => a.rollNo - b.rollNo);
      });
    });

    // Update today's date if day changes
    const timer = setInterval(() => {
      setTodayDate(getTodayDateString());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 5 PM Daily Auto-Reset Effect (દરરોજ સાંજે ૫ વાગ્યા પછી ઓટો રીસેટ)
  useEffect(() => {
    const run5PMCheck = () => {
      if (settings.autoResetAfter5PM !== false && StorageService.isAfter5PM()) {
        const currentDate = getTodayDateString();
        const lastReset = StorageService.getLast5PMResetDate();
        if (lastReset !== currentDate) {
          StorageService.perform5PMAutoReset(currentDate);
          setAttendanceRecords(StorageService.getAttendanceRecords());
        }
      }
    };

    run5PMCheck();
    const interval = setInterval(run5PMCheck, 20000); // Check every 20 seconds
    return () => clearInterval(interval);
  }, [settings.autoResetAfter5PM]);

  // Handle student photo click attendance
  const handleToggleAttendance = useCallback(
    (studentId: string): { isPresent: boolean; alreadyMarked?: boolean; after5PM?: boolean } => {
      const result = StorageService.toggleAttendance(studentId, todayDate, 'student');
      setAttendanceRecords(StorageService.getAttendanceRecords());
      return {
        isPresent: result.isPresent,
        alreadyMarked: result.alreadyMarked,
        after5PM: result.after5PM,
      };
    },
    [todayDate]
  );

  // Teacher manual update attendance status
  const handleUpdateAttendanceStatus = useCallback(
    (studentId: string, date: string, status: AttendanceStatus) => {
      const records = StorageService.getAttendanceRecords();
      const existingIdx = records.findIndex(
        (r) => r.studentId === studentId && r.date === date
      );
      const timeString = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      if (existingIdx >= 0) {
        records[existingIdx].status = status;
        records[existingIdx].timestamp = timeString;
        records[existingIdx].markedBy = 'teacher';
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
      StorageService.saveAttendanceRecords(records);
      setAttendanceRecords(records);
    },
    []
  );

  // Bulk mark attendance
  const handleBulkMark = useCallback(
    (studentIds: string[], date: string, status: AttendanceStatus) => {
      StorageService.markAll(studentIds, date, status === 'present' ? 'present' : 'absent');
      setAttendanceRecords(StorageService.getAttendanceRecords());
    },
    []
  );

  // Clear date attendance
  const handleClearDate = useCallback((date: string, studentIds?: string[]) => {
    StorageService.clearDateAttendance(date, studentIds);
    setAttendanceRecords(StorageService.getAttendanceRecords());
  }, []);

  // Student CRUD
  const handleAddStudent = useCallback((newStudentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `std_${Date.now()}`,
    };
    StorageService.markStudentLocked(newStudent.id);
    setStudents((prev) => {
      const updated = [...prev, newStudent];
      StorageService.saveStudents(updated);
      return updated;
    });
  }, []);

  const handleEditStudent = useCallback(
    (id: string, updatedData: Omit<Student, 'id'>) => {
      StorageService.markStudentLocked(id);
      setStudents((prev) => {
        const updated = prev.map((s) =>
          s.id === id ? { ...updatedData, id } : s
        );
        StorageService.saveStudents(updated);
        return updated;
      });
    },
    []
  );

  const handleDeleteStudent = useCallback((id: string) => {
    StorageService.deleteStudent(id);
    setStudents(StorageService.getStudents());
  }, []);

  // School info & settings
  const handleUpdateSchoolInfo = useCallback((newInfo: SchoolInfo) => {
    StorageService.saveSchoolInfo(newInfo);
    setSchoolInfo(newInfo);
  }, []);

  const handleUpdateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      StorageService.saveSettings(updated);
      setSettings(updated);
    },
    [settings]
  );

  // Reset to seed data (retaining permanent locked student profiles & photos)
  const handleResetSeedData = useCallback(async () => {
    const lockedStudents = StorageService.getStudents().filter((s) => StorageService.isStudentLocked(s.id));
    localStorage.clear();
    const studentsWithPhotos = await StorageService.syncPhotosWithStorage();
    // Re-lock all customized students
    lockedStudents.forEach((s) => StorageService.markStudentLocked(s.id));
    const merged = StorageService.getStudents();
    setStudents(merged);
    setAttendanceRecords(StorageService.getAttendanceRecords());
    setSchoolInfo(StorageService.getSchoolInfo());
    setSettings(StorageService.getSettings());
  }, []);

  // Restore JSON backup
  const handleRestoreData = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.students && Array.isArray(parsed.students)) {
        StorageService.saveStudents(parsed.students);
        setStudents(parsed.students);
      }
      if (parsed.attendanceRecords && Array.isArray(parsed.attendanceRecords)) {
        StorageService.saveAttendanceRecords(parsed.attendanceRecords);
        setAttendanceRecords(parsed.attendanceRecords);
      }
      if (parsed.schoolInfo) {
        StorageService.saveSchoolInfo(parsed.schoolInfo);
        setSchoolInfo(parsed.schoolInfo);
      }
      if (parsed.settings) {
        StorageService.saveSettings(parsed.settings);
        setSettings(parsed.settings);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);


  const handlePinSuccess = () => {
    setIsTeacherAuthenticated(true);
    setIsPinModalOpen(false);
    setCurrentMode('teacher');
  };

  const handleLockOut = () => {
    setIsTeacherAuthenticated(false);
    setCurrentMode('student');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        schoolInfo={schoolInfo}
        studentsCount={students.length}
        currentMode={currentMode}
        isTeacherAuthenticated={isTeacherAuthenticated}
        onOpenTeacherLogin={() => {
          if (isTeacherAuthenticated) {
            setCurrentMode('teacher');
          } else {
            setIsPinModalOpen(true);
          }
        }}
        onGoToStudentMode={() => setCurrentMode('student')}
        onLockOut={handleLockOut}
      />

      {/* Main Container - Auto Adjustable for all screens */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-2 sm:p-4 md:p-6 transition-all duration-300">
        {currentMode === 'student' ? (
          <StudentAttendanceSection
            students={students}
            attendanceRecords={attendanceRecords}
            todayDate={todayDate}
            onToggleAttendance={handleToggleAttendance}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        ) : (
          <TeacherDashboard
            students={students}
            attendanceRecords={attendanceRecords}
            schoolInfo={schoolInfo}
            settings={settings}
            todayDate={todayDate}
            onLockOut={handleLockOut}
            onBackToAttendance={() => setCurrentMode('student')}
            onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
            onBulkMark={handleBulkMark}
            onClearDate={handleClearDate}
            onAddStudent={handleAddStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
            onUpdateSettings={handleUpdateSettings}
            onResetSeedData={handleResetSeedData}
            onRestoreData={handleRestoreData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} {schoolInfo.nameGu} · {schoolInfo.village}, {schoolInfo.taluka}, {schoolInfo.district}
        </p>
      </footer>

      {/* Teacher PIN Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        correctPin={settings.teacherPin}
        soundEnabled={settings.soundEffects}
      />
    </div>
  );
}
