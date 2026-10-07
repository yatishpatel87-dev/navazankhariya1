import React, { useState, useMemo } from 'react';
import {
  Lock,
  Calendar,
  Users,
  UserPlus,
  CheckCheck,
  XCircle,
  RotateCcw,
  Download,
  Printer,
  ShieldCheck,
  School,
  Edit2,
  Trash2,
  MessageCircle,
  Search,
  Check,
  AlertTriangle,
  BarChart3,
  Eye,
  Clock,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import {
  Student,
  StudentCategory,
  AttendanceRecord,
  AttendanceStatus,
  SchoolInfo,
  AppSettings,
} from '../types';
import { StudentAvatar } from './StudentAvatar';
import { StudentModal } from './StudentModal';
import { MonthlyAttendanceReport } from './MonthlyAttendanceReport';
import { PhotoFrame3DPopup } from './PhotoFrame3DPopup';
import { MonthlyRegisterPrintView } from './MonthlyRegisterPrintView';
import { MonthlyAttendanceCalendarCard } from './MonthlyAttendanceCalendarCard';
import { toGujaratiNum, formatGujaratiDate } from '../utils/gujarati';
import { calculateCategoryGenderBreakdown } from '../utils/studentStats';
import { isLateAttendance } from '../utils/time';

interface TeacherDashboardProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  schoolInfo: SchoolInfo;
  settings: AppSettings;
  todayDate: string;
  onLockOut: () => void;
  onBackToAttendance?: () => void;
  onUpdateAttendanceStatus: (
    studentId: string,
    date: string,
    status: AttendanceStatus
  ) => void;
  onBulkMark: (studentIds: string[], date: string, status: AttendanceStatus) => void;
  onClearDate: (date: string, studentIds?: string[]) => void;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onEditStudent: (id: string, updated: Omit<Student, 'id'>) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onResetSeedData: () => void;
  onRestoreData: (jsonData: string) => boolean;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  students,
  attendanceRecords,
  schoolInfo,
  settings,
  todayDate,
  onLockOut,
  onBackToAttendance,
  onUpdateAttendanceStatus,
  onBulkMark,
  onClearDate,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onUpdateSchoolInfo,
  onUpdateSettings,
  onResetSeedData,
  onRestoreData,
}) => {
  type ActiveTab = 'register' | 'students' | 'monthly' | 'settings';
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [selectedStandard, setSelectedStandard] = useState<number | 'all'>(7);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<StudentCategory | 'all'>('all');
  const [searchStudent, setSearchStudent] = useState('');

  // 3D Photo Frame Pop-up state
  const [selected3DStudent, setSelected3DStudent] = useState<Student | null>(null);

  // A4 Monthly Attendance Register Print View state
  const [showMonthlyRegisterPrint, setShowMonthlyRegisterPrint] = useState(false);

  // Category & Gender (Kumar / Kanya) Breakdown for all students
  const catGenderStats = useMemo(() => {
    return calculateCategoryGenderBreakdown(students);
  }, [students]);

  // Category counts for all students
  const categoryStats = useMemo(() => {
    return {
      ST: catGenderStats.ST.total,
      SC: catGenderStats.SC.total,
      OBC: catGenderStats.OBC.total,
      Other: catGenderStats.Other.total,
    };
  }, [catGenderStats]);

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Settings PIN change state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // School info form state
  const [editingSchoolInfo, setEditingSchoolInfo] = useState<SchoolInfo>(schoolInfo);
  const [schoolSavedMsg, setSchoolSavedMsg] = useState(false);

  // Standards list
  const standards = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.standard))).sort((a, b) => a - b);
  }, [students]);

  // Filter students based on standard, category and search
  const displayedStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchStd = selectedStandard === 'all' || s.standard === selectedStandard;
        const matchCat =
          selectedCategoryFilter === 'all' || (s.category || 'OBC') === selectedCategoryFilter;
        const q = searchStudent.trim().toLowerCase();
        const matchSearch =
          !q ||
          s.nameGu.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.rollNo.toString() === q;
        return matchStd && matchCat && matchSearch;
      })
      .sort((a, b) => a.standard - b.standard || a.rollNo - b.rollNo);
  }, [students, selectedStandard, selectedCategoryFilter, searchStudent]);

  // Attendance lookup for selectedDate: studentId -> record
  const currentAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (r.date === selectedDate) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [attendanceRecords, selectedDate]);

  // Stats for the selected standard and date
  const registerStats = useMemo(() => {
    const currentClassStudents =
      selectedStandard === 'all'
        ? students
        : students.filter((s) => s.standard === selectedStandard);
    const total = currentClassStudents.length;
    let present = 0;
    let absent = 0;
    let leave = 0;

    currentClassStudents.forEach((s) => {
      const rec = currentAttendanceMap.get(s.id);
      if (rec?.status === 'present') present++;
      else if (rec?.status === 'leave') leave++;
      else absent++; // unrecorded or marked absent
    });

    return { total, present, absent, leave };
  }, [students, selectedStandard, currentAttendanceMap]);

  // Absent students for WhatsApp notifications
  const absentStudents = useMemo(() => {
    const currentClassStudents =
      selectedStandard === 'all'
        ? students
        : students.filter((s) => s.standard === selectedStandard);

    return currentClassStudents.filter((s) => {
      const rec = currentAttendanceMap.get(s.id);
      return !rec || rec.status === 'absent';
    });
  }, [students, selectedStandard, currentAttendanceMap]);

  // Save new or edited student
  const handleSaveStudent = (data: Omit<Student, 'id'>, id?: string) => {
    if (id) {
      onEditStudent(id, data);
    } else {
      onAddStudent(data);
    }
    setEditingStudent(null);
  };

  // Change PIN handler
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPinInput !== settings.teacherPin) {
      setPinChangeMsg({ text: 'ચાલુ પિન ખોટો છે! (Current PIN incorrect)', isError: true });
      return;
    }
    if (newPinInput.length !== 4 || !/^\d+$/.test(newPinInput)) {
      setPinChangeMsg({ text: 'પિન ૪ અંકનો હોવો જોઈએ (Must be 4 digits)', isError: true });
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeMsg({ text: 'નવા પિન સરખા નથી (PINs do not match)', isError: true });
      return;
    }
    onUpdateSettings({ teacherPin: newPinInput });
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinChangeMsg({ text: 'પિન સફળતાપૂર્વક બદલાઈ ગયો છે! (PIN updated)', isError: false });
  };

  // Save School Info handler
  const handleSaveSchoolInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolInfo(editingSchoolInfo);
    setSchoolSavedMsg(true);
    setTimeout(() => setSchoolSavedMsg(false), 3000);
  };

  // Export full JSON database
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      schoolInfo,
      settings,
      students,
      attendanceRecords,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NZPS_Attendance_Backup_${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV for current selected date or month
  const handleExportCSV = () => {
    const headers = ['રોલ નંબર', 'વિદ્યાર્થીનું નામ', 'ધોરણ', 'કેટેગરી (Category)', 'જાતિ (Gender)', 'તારીખ', 'હાજરી સ્થિતિ', 'નોંધણી સમય'];
    const rows = displayedStudents.map((s) => {
      const rec = currentAttendanceMap.get(s.id);
      const statusLabel =
        rec?.status === 'present'
          ? 'હાજર'
          : rec?.status === 'leave'
          ? 'રજા'
          : 'ગેરહાજર';
      return [
        s.rollNo,
        `"${s.nameGu} (${s.nameEn})"`,
        s.standard,
        s.category || 'OBC',
        s.gender === 'male' ? 'કુમાર' : 'કન્યા',
        selectedDate,
        statusLabel,
        rec?.timestamp || '-',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hajari_Patrak_${selectedDate}_Std_${selectedStandard}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate WhatsApp absentee notification message
  const getWhatsAppLink = (student: Student) => {
    const phone = student.parentPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `નમસ્તે વાલીશ્રી,\n\nઆજે તારીખ ${selectedDate} ના રોજ આપનો પાલ્ય *${student.nameGu}* (ધોરણ ${student.standard}, રોલ નં. ${student.rollNo}) *${schoolInfo.nameGu}* માં ગેરહાજર છે.\n\nજો કોઈ કારણસર રજા હોય તો શાળાને જાણ કરવા નમ્ર વિનંતી.\n- આચાર્ય/વર્ગશિક્ષક શ્રી`
    );
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  // If teacher clicked Print Monthly Register, display clean A4 Print Layout
  if (showMonthlyRegisterPrint) {
    return (
      <MonthlyRegisterPrintView
        students={students}
        attendanceRecords={attendanceRecords}
        schoolInfo={schoolInfo}
        currentDate={selectedDate}
        onClose={() => setShowMonthlyRegisterPrint(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header with Lock Out button */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>શિક્ષક નિયંત્રણ કેન્દ્ર · સુરક્ષિત લોગિન (Secure Session)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            શિક્ષક ડેશબોર્ડ (Teacher Dashboard)
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            {schoolInfo.nameGu} · UDISE: {schoolInfo.udiseCode}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* A4 Monthly Attendance Register Print Button */}
          <button
            onClick={() => setShowMonthlyRegisterPrint(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
            title="A4 સાઈઝ માસિક હાજરી રજિસ્ટર પ્રિન્ટ કરો / PDF ડાઉનલોડ"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>માસિક રજિસ્ટર પ્રિન્ટ (A4 PDF)</span>
          </button>

          {onBackToAttendance && (
            <button
              onClick={onBackToAttendance}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>📸 ફોટો હાજરી પેજ</span>
            </button>
          )}

          <button
            onClick={onLockOut}
            className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/40 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>લોક કરો (Lock)</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-2xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'register'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>આજનું રજીસ્ટર (Daily Register)</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-500" />
          <span>વિદ્યાર્થી સંચાલન (Students)</span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'monthly'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          <span>માસિક અહેવાલ & ગ્રાફ (Monthly & Trends)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <School className="w-4 h-4 text-purple-500" />
          <span>શાળા સેટિંગ્સ & પિન (Settings)</span>
        </button>
      </div>

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeTab === 'register' && (
        <div className="space-y-5">
          {/* Visual Monthly Calendar & Attendance Summary Card with Circular Progress Bar */}
          <MonthlyAttendanceCalendarCard
            students={students}
            attendanceRecords={attendanceRecords}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />

          {/* Controls Bar: Date Picker, Class Selector, Bulk Actions */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Date & Standard Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    તારીખ પસંદ કરો (Select Date)
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    ધોરણ (Standard)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedStandard('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        selectedStandard === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      બધા (All)
                    </button>
                    {standards.map((std) => (
                      <button
                        key={std}
                        onClick={() => setSelectedStandard(std)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          selectedStandard === std
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ધોરણ {std}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <button
                  onClick={() => {
                    const ids = displayedStudents.map((s) => s.id);
                    onBulkMark(ids, selectedDate, 'present');
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>બધાને હાજર કરો (All Present)</span>
                </button>

                <button
                  onClick={() => {
                    const absentIds = displayedStudents
                      .filter((s) => {
                        const rec = currentAttendanceMap.get(s.id);
                        return !rec || rec.status !== 'present';
                      })
                      .map((s) => s.id);
                    onBulkMark(absentIds, selectedDate, 'absent');
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>બાકી રહેલા ગેરહાજર (Mark Absent)</span>
                </button>

                <button
                  onClick={() => setShowMonthlyRegisterPrint(true)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="A4 સાઈઝ માસિક હાજરી રજિસ્ટર પ્રિન્ટ"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>માસિક રજિસ્ટર (A4 PDF)</span>
                </button>

                <button
                  onClick={() => {
                    if (confirm('શું તમે આ તારીખની હાજરી સાફ કરવા માંગો છો?')) {
                      const ids = displayedStudents.map((s) => s.id);
                      onClearDate(selectedDate, ids);
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="રીસેટ"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>રીસેટ</span>
                </button>
              </div>
            </div>

            {/* Quick summary chips */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
              <span className="text-slate-500 font-medium">
                {formatGujaratiDate(selectedDate)}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700">
                કુલ: <strong>{registerStats.total}</strong>
              </span>
              <span className="text-emerald-700">
                હાજર: <strong>{registerStats.present}</strong>
              </span>
              <span className="text-rose-700">
                ગેરહાજર: <strong>{registerStats.absent}</strong>
              </span>
              <span className="text-amber-700">
                રજા: <strong>{registerStats.leave}</strong>
              </span>
            </div>
          </div>

          {/* Student Attendance Table */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4 w-14">રોલ નં.</th>
                    <th className="py-3 px-4 w-16">ફોટો</th>
                    <th className="py-3 px-4">વિદ્યાર્થીનું નામ</th>
                    <th className="py-3 px-3 w-16">ધોરણ</th>
                    <th className="py-3 px-3 w-20 text-center">કેટેગરી</th>
                    <th className="py-3 px-4 w-64 text-center">હાજરી સ્થિતિ (Status)</th>
                    <th className="py-3 px-4 w-28">સમય</th>
                    <th className="py-3 px-4 w-24">વાલી સંપર્ક</th>
                    <th className="py-3 px-4 w-36 text-center">એક્શન (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedStudents.map((student) => {
                    const record = currentAttendanceMap.get(student.id);
                    const status = record?.status || 'absent';

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          status === 'present' ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-700 font-mono">
                          {toGujaratiNum(student.rollNo)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setSelected3DStudent(student)}
                            className="cursor-pointer group relative block"
                            title="વિદ્યાર્થીનો ૩D ફોટો અને પ્રોફાઇલ જુઓ (View Photo)"
                          >
                            <StudentAvatar
                              studentId={student.id}
                              photoUrl={student.photoUrl}
                              nameGu={student.nameGu}
                              gender={student.gender}
                              avatarIcon={student.avatarIcon}
                              avatarBg={student.avatarBg}
                              size="sm"
                              className="group-hover:scale-110 transition-transform shadow-xs ring-2 ring-amber-300/80 rounded-2xl"
                            />
                            {student.photoUrl && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"
                                title="અપલોડ કરેલો ફોટો સક્રિય છે"
                              />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => setSelected3DStudent(student)}
                            className="text-left cursor-pointer group"
                            title="પ્રોફાઇલ જુઓ"
                          >
                            <div className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors flex items-center gap-1">
                              <span>{student.nameGu}</span>
                              {StorageService.isStudentLocked(student.id) && (
                                <span title="પ્રોફાઇલ લૉક છે: ફેરફાર માત્ર 'સુધારો' (Edit) બટનથી જ થશે" className="inline-flex items-center">
                                  <Lock className="w-3 h-3 text-amber-600 inline shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {student.nameEn}
                            </div>
                          </button>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          ધો. {toGujaratiNum(student.standard)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded border inline-block ${
                              student.category === 'SC'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : student.category === 'ST'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : student.category === 'OBC'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {student.category || 'OBC'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-[240px] mx-auto">
                            <button
                              onClick={() =>
                                onUpdateAttendanceStatus(student.id, selectedDate, 'present')
                              }
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
                                status === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              હાજર
                            </button>
                            <button
                              onClick={() =>
                                onUpdateAttendanceStatus(student.id, selectedDate, 'absent')
                              }
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
                                status === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              ગેરહાજર
                            </button>
                            <button
                              onClick={() =>
                                onUpdateAttendanceStatus(student.id, selectedDate, 'leave')
                              }
                              className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
                                status === 'leave'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              રજા
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <span>{record?.timestamp || '-'}</span>
                            {status === 'present' &&
                              isLateAttendance(record?.timestamp, settings.lateTimeCutoff || '09:30 AM') && (
                                <span
                                  className="px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold"
                                  title={`${settings.lateTimeCutoff || '૦૯:૩૦ AM'} પછી મોડા આવ્યા`}
                                >
                                  Late
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {student.parentPhone ? (
                            <a
                              href={getWhatsAppLink(student)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-medium border border-emerald-200"
                              title="વોટ્સએપ મેસેજ મોકલો"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>સૂચના</span>
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStudent(student);
                                setIsStudentModalOpen(true);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="વિદ્યાર્થી માહિતી સુધારો (Edit)"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                              <span>સુધારો</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`શું તમે વિદ્યાર્થી "${student.nameGu}" (રોલ નં. ${student.rollNo}) ને ખરેખર કાઢી નાખવા માંગો છો?`)) {
                                  onDeleteStudent(student.id);
                                }
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="વિદ્યાર્થી કાઢી નાખો (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>કાઢી નાખો</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Absentee Parent Alert Card */}
          {absentStudents.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-2 text-amber-900 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  ગેરહાજર વિદ્યાર્થીઓના વાલીઓને જાણ કરો ({absentStudents.length} ગેરહાજર)
                </span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                બાળક શાળામાં ગેરહાજર હોય ત્યારે વાલીને એક ક્લિકમાં વોટ્સએપ પર સત્તાવાર મેસેજ મોકલો.
              </p>
              <div className="flex flex-wrap gap-2">
                {absentStudents.map((st) => (
                  <a
                    key={st.id}
                    href={getWhatsAppLink(st)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 rounded-xl text-xs font-medium shadow-2xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {st.nameGu} (રોલ {st.rollNo})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE STUDENTS (CRUD) */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Category & Gender Breakdown Statistics (ST, SC, OBC, Other - Kumar / Kanya) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* ST Box */}
            <div className="bg-emerald-50/90 border-2 border-emerald-300 rounded-3xl p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">ST (અનુ. જનજાતિ)</span>
                <span className="text-[10px] font-black bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-300">
                  ST
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 my-1 flex items-baseline gap-1">
                <span>{toGujaratiNum(catGenderStats.ST.total)}</span>
                <span className="text-xs font-normal text-emerald-700">કુલ</span>
              </div>
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કુમાર: <strong className="text-blue-700 font-bold">{toGujaratiNum(catGenderStats.ST.kumar)}</strong>
                </span>
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કન્યા: <strong className="text-pink-700 font-bold">{toGujaratiNum(catGenderStats.ST.kanya)}</strong>
                </span>
              </div>
            </div>

            {/* SC Box */}
            <div className="bg-purple-50/90 border-2 border-purple-300 rounded-3xl p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">SC (અનુ. જાતિ)</span>
                <span className="text-[10px] font-black bg-purple-200 text-purple-950 px-2 py-0.5 rounded-lg border border-purple-300">
                  SC
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-950 my-1 flex items-baseline gap-1">
                <span>{toGujaratiNum(catGenderStats.SC.total)}</span>
                <span className="text-xs font-normal text-purple-700">કુલ</span>
              </div>
              <div className="pt-2 border-t border-purple-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કુમાર: <strong className="text-blue-700 font-bold">{toGujaratiNum(catGenderStats.SC.kumar)}</strong>
                </span>
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કન્યા: <strong className="text-pink-700 font-bold">{toGujaratiNum(catGenderStats.SC.kanya)}</strong>
                </span>
              </div>
            </div>

            {/* OBC Box */}
            <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">OBC (સા.શૈ. પછાત)</span>
                <span className="text-[10px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-lg border border-amber-300">
                  OBC
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 my-1 flex items-baseline gap-1">
                <span>{toGujaratiNum(catGenderStats.OBC.total)}</span>
                <span className="text-xs font-normal text-amber-700">કુલ</span>
              </div>
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કુમાર: <strong className="text-blue-700 font-bold">{toGujaratiNum(catGenderStats.OBC.kumar)}</strong>
                </span>
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કન્યા: <strong className="text-pink-700 font-bold">{toGujaratiNum(catGenderStats.OBC.kanya)}</strong>
                </span>
              </div>
            </div>

            {/* Other Box */}
            <div className="bg-blue-50/90 border-2 border-blue-300 rounded-3xl p-3.5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Other (સામાન્ય/અન્ય)</span>
                <span className="text-[10px] font-black bg-blue-200 text-blue-950 px-2 py-0.5 rounded-lg border border-blue-300">
                  Other
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 my-1 flex items-baseline gap-1">
                <span>{toGujaratiNum(catGenderStats.Other.total)}</span>
                <span className="text-xs font-normal text-blue-700">કુલ</span>
              </div>
              <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-xs">
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કુમાર: <strong className="text-blue-700 font-bold">{toGujaratiNum(catGenderStats.Other.kumar)}</strong>
                </span>
                <span className="text-slate-700 font-semibold bg-white/80 px-2 py-0.5 rounded-md">
                  કન્યા: <strong className="text-pink-700 font-bold">{toGujaratiNum(catGenderStats.Other.kanya)}</strong>
                </span>
              </div>
            </div>

            {/* Grand Total Box */}
            <div className="col-span-2 sm:col-span-1 bg-slate-900 text-white rounded-3xl p-3.5 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">કુલ વિદ્યાર્થી (Std 7)</span>
                <span className="text-[10px] font-black bg-amber-500 text-slate-900 px-2 py-0.5 rounded-lg">
                  કુલ
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white my-1 flex items-baseline gap-1">
                <span>{toGujaratiNum(catGenderStats.total.total)}</span>
                <span className="text-xs font-normal text-slate-300">બાળકો</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium">
                  કુમાર: <strong className="text-amber-300">{toGujaratiNum(catGenderStats.total.kumar)}</strong>
                </span>
                <span className="text-slate-200 font-medium">
                  કન્યા: <strong className="text-pink-300">{toGujaratiNum(catGenderStats.total.kanya)}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="નામ અથવા રોલ નંબર શોધો..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  બધા ({students.length})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('ST')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryFilter === 'ST'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  ST ({categoryStats.ST})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('SC')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryFilter === 'SC'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 border border-purple-200'
                  }`}
                >
                  SC ({categoryStats.SC})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('OBC')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryFilter === 'OBC'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  OBC ({categoryStats.OBC})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('Other')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategoryFilter === 'Other'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  Other ({categoryStats.Other})
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingStudent(null);
                setIsStudentModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>નવો વિદ્યાર્થી ઉમેરો (Add Student)</span>
            </button>
          </div>

          {/* Students Grid / List - Auto Adjustable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
            {displayedStudents.map((st) => (
              <div
                key={st.id}
                className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <button
                  type="button"
                  onClick={() => setSelected3DStudent(st)}
                  className="cursor-pointer group/avatar relative shrink-0"
                  title="૩D ફોટો ફ્રેમ જુઓ (View 3D Frame)"
                >
                  <StudentAvatar
                    studentId={st.id}
                    photoUrl={st.photoUrl}
                    nameGu={st.nameGu}
                    gender={st.gender}
                    avatarIcon={st.avatarIcon}
                    avatarBg={st.avatarBg}
                    size="md"
                    className="shadow-sm group-hover/avatar:scale-105 transition-transform ring-2 ring-amber-300"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-0.5 shadow-2xs">
                    <Eye className="w-2.5 h-2.5" />
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      રોલ {toGujaratiNum(st.rollNo)}
                    </span>
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      ધોરણ {toGujaratiNum(st.standard)}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                        st.gender === 'female'
                          ? 'bg-pink-50 text-pink-800 border-pink-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {st.gender === 'female' ? 'કન્યા' : 'કુમાર'}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                        st.category === 'SC'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : st.category === 'ST'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : st.category === 'OBC'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {st.category || 'OBC'}
                    </span>
                    {st.photoUrl ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <span>📸 ફોટો સેટ</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        અવતાર
                      </span>
                    )}
                    {StorageService.isStudentLocked(st.id) && (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="એક વાર ફેરફાર કર્યા પછી માત્ર 'સુધારો' બટનથી જ બદલી શકાશે">
                        <Lock className="w-2.5 h-2.5 text-amber-700" />
                        <span>લૉક</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 truncate mt-1">{st.nameGu}</h4>
                  <p className="text-xs text-slate-400 truncate">{st.nameEn}</p>
                  {st.parentPhone && (
                    <p className="text-[11px] text-slate-500 mt-1">📞 {st.parentPhone}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected3DStudent(st)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer"
                    title="૩D ફોટો ફ્રેમ પોપ-અપ (3D Frame)"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-500" />
                    <span>૩D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStudent(st);
                      setIsStudentModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-bold cursor-pointer shadow-2xs"
                    title="વિદ્યાર્થી માહિતી સુધારો (Edit)"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>સુધારો</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`શું તમે વિદ્યાર્થી "${st.nameGu}" (રોલ નં. ${st.rollNo}) ને ખરેખર કાઢી નાખવા માંગો છો?`)) {
                        onDeleteStudent(st.id);
                      }
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg transition-colors flex items-center justify-center gap-1 text-xs font-bold cursor-pointer shadow-2xs"
                    title="વિદ્યાર્થી કાઢી નાખો (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>કાઢી નાખો</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY ATTENDANCE REPORT & TRENDS (RECHARTS BAR CHART) */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Recharts Monthly Attendance Report View */}
          <MonthlyAttendanceReport
            students={students}
            attendanceRecords={attendanceRecords}
            schoolInfo={schoolInfo}
            currentDate={selectedDate}
            onExportCSV={handleExportCSV}
            onPrint={() => setShowMonthlyRegisterPrint(true)}
          />

          {/* Banner for A4 Monthly Register Physical School Record */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3 py-0.5 rounded-full text-xs font-bold mb-1.5">
                <Printer className="w-3.5 h-3.5" />
                <span>સત્તાવાર A4 ફિઝિકલ રેકોર્ડ (Official School Register)</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                ચાલુ માસનું સમગ્ર હાજરી રજિસ્ટર A4 PDF પ્રિન્ટ મેળવો
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                ૧ થી ૪૩ તમામ વિદ્યાર્થીઓ, ૧ થી ૩૦ તારીખનું સમગ્ર કોષ્ટક, કુમાર-કન્યા દૈનિક સરવાળો, સામાજિક વર્ગ વિશ્લેષણ અને સહી-સિક્કા સાથે.
              </p>
            </div>
            <button
              onClick={() => setShowMonthlyRegisterPrint(true)}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-amber-50 font-black text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Printer className="w-4 h-4 text-amber-600" />
              <span>માસિક રજિસ્ટર પ્રિન્ટ (A4 PDF)</span>
            </button>
          </div>

          {/* Printable Official Register Sheet (પત્રક-અ) */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/70 overflow-x-auto print:border-none print:shadow-none print:p-0">
            {/* Header for official print */}
            <div className="text-center pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">{schoolInfo.nameGu}</h2>
              <p className="text-xs text-slate-600">
                {schoolInfo.village}, {schoolInfo.taluka}, {schoolInfo.district} · UDISE: {schoolInfo.udiseCode}
              </p>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                દૈનિક હાજરી પત્રક · તારીખ: {selectedDate} ({formatGujaratiDate(selectedDate)})
              </p>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-300 text-slate-700 font-bold">
                  <th className="py-2.5 px-3 w-12 border-r border-slate-200">રોલ નં.</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">વિદ્યાર્થીનું પૂરું નામ</th>
                  <th className="py-2.5 px-3 w-14 border-r border-slate-200 text-center">ધોરણ</th>
                  <th className="py-2.5 px-3 w-16 border-r border-slate-200 text-center">જાતિ</th>
                  <th className="py-2.5 px-3 w-16 border-r border-slate-200 text-center">કેટેગરી</th>
                  <th className="py-2.5 px-3 w-28 border-r border-slate-200 text-center">હાજરી સ્થિતિ</th>
                  <th className="py-2.5 px-3 w-24 border-r border-slate-200">નોંધાયેલ સમય</th>
                  <th className="py-2.5 px-3 w-28">સહી / ટીકા</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedStudents.map((st) => {
                  const rec = currentAttendanceMap.get(st.id);
                  const isP = rec?.status === 'present';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold">
                        {st.rollNo}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-900">
                        {st.nameGu} <span className="text-slate-400 font-normal">({st.nameEn})</span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        {st.standard}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        {st.gender === 'male' ? 'કુમાર' : 'કન્યા'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">
                        {st.category || 'OBC'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">
                        {isP ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">હાજર (P)</span>
                        ) : rec?.status === 'leave' ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">રજા (L)</span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded">ગેરહાજર (A)</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px]">
                        {rec?.timestamp || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-400"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Category x Gender Summary Matrix Table for Government inspection */}
            <div className="mt-6 pt-4 border-t border-slate-300">
              <h4 className="text-xs font-bold text-slate-800 mb-2">
                જાતિ અને સામાજિક વર્ગ મુજબ વિશ્લેષણ પત્રક (Category & Gender Breakdown):
              </h4>
              <table className="w-full max-w-xl text-xs border border-slate-300 border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300">
                    <th className="py-1.5 px-3 border-r border-slate-300 text-left">સામાજિક વર્ગ (Category)</th>
                    <th className="py-1.5 px-3 border-r border-slate-300 text-blue-800">કુમાર (Boys)</th>
                    <th className="py-1.5 px-3 border-r border-slate-300 text-pink-800">કન્યા (Girls)</th>
                    <th className="py-1.5 px-3 font-black">કુલ (Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-left font-medium">ST (અનુસૂચિત જનજાતિ)</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.ST.kumar}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.ST.kanya}</td>
                    <td className="py-1.5 px-3 font-black bg-slate-50">{catGenderStats.ST.total}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-left font-medium">SC (અનુસૂચિત જાતિ)</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.SC.kumar}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.SC.kanya}</td>
                    <td className="py-1.5 px-3 font-black bg-slate-50">{catGenderStats.SC.total}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-left font-medium">OBC (સામાજિક & શૈક્ષણિક પછાત વર્ગ)</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.OBC.kumar}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.OBC.kanya}</td>
                    <td className="py-1.5 px-3 font-black bg-slate-50">{catGenderStats.OBC.total}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-left font-medium">Other (જનરલ / અન્ય)</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.Other.kumar}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 font-bold">{catGenderStats.Other.kanya}</td>
                    <td className="py-1.5 px-3 font-black bg-slate-50">{catGenderStats.Other.total}</td>
                  </tr>
                  <tr className="bg-slate-200/80 font-black">
                    <td className="py-1.5 px-3 border-r border-slate-300 text-left">કુલ સરવાળો (Grand Total)</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-blue-900">{catGenderStats.total.kumar}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300 text-pink-900">{catGenderStats.total.kanya}</td>
                    <td className="py-1.5 px-3 bg-amber-100 text-amber-950 font-black">{catGenderStats.total.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures footer */}
            <div className="mt-8 pt-8 flex justify-between items-end text-xs text-slate-700">
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span>વર્ગશિક્ષકની સહી</span>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span>આચાર્યશ્રીની સહી & સિક્કો</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Photo Frame Pop-up Modal */}
      <PhotoFrame3DPopup
        isOpen={!!selected3DStudent}
        student={selected3DStudent}
        attendanceRecord={
          selected3DStudent
            ? currentAttendanceMap.get(selected3DStudent.id)
            : undefined
        }
        lateTimeCutoff={settings.lateTimeCutoff || '09:30 AM'}
        onClose={() => setSelected3DStudent(null)}
        onMarkPresent={() => {
          if (selected3DStudent) {
            onUpdateAttendanceStatus(selected3DStudent.id, selectedDate, 'present');
          }
        }}
        onEdit={() => {
          if (selected3DStudent) {
            setEditingStudent(selected3DStudent);
            setSelected3DStudent(null);
            setIsStudentModalOpen(true);
          }
        }}
        onDelete={() => {
          if (selected3DStudent) {
            if (
              confirm(
                `શું તમે વિદ્યાર્થી "${selected3DStudent.nameGu}" (રોલ નં. ${selected3DStudent.rollNo}) ને ખરેખર કાઢી નાખવા માંગો છો?`
              )
            ) {
              onDeleteStudent(selected3DStudent.id);
              setSelected3DStudent(null);
            }
          }
        }}
      />

      {/* TAB 4: SCHOOL SETTINGS & PIN MANAGEMENT */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change Teacher PIN */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/70">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
              <Lock className="w-5 h-5 text-amber-500" />
              <span>શિક્ષક પિન બદલો (Change PIN)</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              શિક્ષક ડેશબોર્ડ ખોલવા માટે ૪ અંકનો સુરક્ષિત પિન રાખો.
            </p>

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  હાલનો પિન (Current PIN)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  નવો પિન (New 4-digit PIN)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  નવો પિન ફરીથી દાખલ કરો (Confirm PIN)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {pinChangeMsg && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium ${
                    pinChangeMsg.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {pinChangeMsg.text}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors mt-2"
              >
                પિન બદલો (Save PIN)
              </button>
            </form>
          </div>

          {/* School Details */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/70">
            <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-base">
              <School className="w-5 h-5 text-blue-500" />
              <span>શાળાની માહિતી (School Details)</span>
            </div>

            <form onSubmit={handleSaveSchoolInfo} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  શાળાનું નામ (ગુજરાતીમાં)
                </label>
                <input
                  type="text"
                  required
                  value={editingSchoolInfo.nameGu}
                  onChange={(e) =>
                    setEditingSchoolInfo({ ...editingSchoolInfo, nameGu: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    UDISE કોડ
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSchoolInfo.udiseCode}
                    onChange={(e) =>
                      setEditingSchoolInfo({ ...editingSchoolInfo, udiseCode: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    ગામ (Village)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSchoolInfo.village}
                    onChange={(e) =>
                      setEditingSchoolInfo({ ...editingSchoolInfo, village: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    તાલુકો (Taluka)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSchoolInfo.taluka}
                    onChange={(e) =>
                      setEditingSchoolInfo({ ...editingSchoolInfo, taluka: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    જિલ્લો (District)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSchoolInfo.district}
                    onChange={(e) =>
                      setEditingSchoolInfo({ ...editingSchoolInfo, district: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              {schoolSavedMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>શાળાની માહિતી સાચવી લીધી છે!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors mt-2"
              >
                માહિતી સાચવો (Save Information)
              </button>
            </form>
          </div>

          {/* Daily 5 PM Auto-Reset & Student Lock Rules Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/70 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-2xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    દૈનિક ઓટો-રીસેટ & હાજરી લોક નિયમો (Attendance Rules & 5 PM Auto-Reset)
                  </h3>
                  <p className="text-xs text-slate-500">
                    સાંજે ૫:૦૦ વાગ્યા પછી ઓટો-રીસેટ અને વિદ્યાર્થી માટે એકવાર હાજરી લોકના સેટિંગ્સ
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 bg-slate-50">
                <span className={`w-2 h-2 rounded-full ${StorageService.isAfter5PM() ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                <span>
                  {StorageService.isAfter5PM()
                    ? 'સાંજે ૫ PM પછી: ઓટો રીસેટ સક્રિય'
                    : 'સાંજે ૫ PM પહેલાં: હાજરી ખુલ્લી છે'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle 1: 5 PM Auto Reset */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>દરરોજ સાંજે ૫:૦૦ વાગ્યા પછી ઓટો રીસેટ (5 PM Auto-Reset)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    સાંજે ૫:૦૦ વાગ્યા પછી આજની હાજરી આપમેળે રીસેટ થશે અને આગલા દિવસ માટે તૈયાર થશે. (જૂનો રેકોર્ડ ઇતિહાસમાં સચવાઈ રહેશે).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ autoResetAfter5PM: !(settings.autoResetAfter5PM !== false) })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.autoResetAfter5PM !== false ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.autoResetAfter5PM !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Lock after first attendance */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>એક વાર હાજરી પુરાયા પછી લોક (Lock After Mark)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    બાળક પોતાની હાજરી એકવાર પૂરે પછી તે જાતે બદલી શકશે નહીં. હાજરીમાં ફેરફાર માત્ર શિક્ષક ડેશબોર્ડમાંથી જ થઈ શકશે.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ lockAfterFirstMark: !(settings.lockAfterFirstMark !== false) })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.lockAfterFirstMark !== false ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.lockAfterFirstMark !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Setting 3: Late Cutoff Time */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-start justify-between gap-3 md:col-span-2">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>મોડા આવવાનો સમય નિયંત્રણ (Late Attendance Cutoff Time)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    આ સમય પછી હાજરી પૂરનાર બાળક પર વિદ્યાર્થી કાર્ડ અને રજિસ્ટરમાં 'Late (મોડા)' બેજ દર્શાવવામાં આવે છે.
                  </p>
                </div>
                <select
                  value={settings.lateTimeCutoff || '09:30 AM'}
                  onChange={(e) => onUpdateSettings({ lateTimeCutoff: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="09:15 AM">09:15 AM</option>
                  <option value="09:30 AM">09:30 AM (નિયમિત શાળા સમય)</option>
                  <option value="09:45 AM">09:45 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="10:15 AM">10:15 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                </select>
              </div>
            </div>

            {/* Quick manual trigger */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                અંતિમ ૫:૦૦ PM ઓટો રીસેટ તારીખ: <strong>{StorageService.getLast5PMResetDate() || 'હજુ સુધી નથી'}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('શું તમે આજની હાજરીને સાંજે ૫ PM ઓટો-રીસેટ મુજબ અત્યારે જ રીસેટ કરવા માંગો છો? (આજનું બેકઅપ સચવાઈ જશે).')) {
                    StorageService.perform5PMAutoReset(todayDate);
                    onClearDate(todayDate);
                    alert('સાંજે ૫:૦૦ વાગ્યાનો ઓટો-રીસેટ સફળતાપૂર્વક લાગુ થયો છે!');
                  }
                }}
                className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>હમણાં જ ૫:૦૦ PM રીસેટ ટેસ્ટ કરો (Trigger 5 PM Reset)</span>
              </button>
            </div>
          </div>

          {/* Backup, Restore & Reset */}
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/70 md:col-span-2">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              ડેટા સુરક્ષા અને બેકઅપ (Data Backup & Reset)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              તમારી શાળાનો તમામ વિદ્યાર્થીઓ અને હાજરીનો ડેટા સુરક્ષિત રીતે ડાઉનલોડ અથવા રિસ્ટોર કરો.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>તમામ ડેટા બેકઅપ ડાઉનલોડ કરો (JSON)</span>
              </button>

              <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors">
                <RotateCcw className="w-4 h-4 text-slate-600" />
                <span>બેકઅપ ફાઇલ રિસ્ટોર કરો (Restore)</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content && onRestoreData(content)) {
                          alert('ડેટા સફળતાપૂર્વક રિસ્ટોર થયો છે!');
                        } else {
                          alert('ખોટી ફાઇલ ફોર્મેટ!');
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>

              <button
                onClick={() => {
                  if (confirm('શું તમે ડેમો વિદ્યાર્થીઓનો મૂળ ડેટા ફરીથી લોડ કરવા માંગો છો?')) {
                    onResetSeedData();
                  }
                }}
                className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors"
              >
                મૂળ ડેમો ડેટા રીસેટ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Add / Edit Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setEditingStudent(null);
        }}
        onSave={handleSaveStudent}
        initialData={editingStudent}
        defaultStandard={typeof selectedStandard === 'number' ? selectedStandard : 7}
        nextRollNo={Math.max(0, ...students.map((s) => s.rollNo)) + 1}
      />
    </div>
  );
};
