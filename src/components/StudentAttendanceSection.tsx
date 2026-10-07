import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Users,
  Check,
  Calendar,
  Mic,
  MicOff,
  UserCheck,
  UserX,
  Eye,
  User,
  Lock,
  Clock,
  Maximize2,
  Minimize2,
  Monitor,
} from 'lucide-react';
import { Student, AttendanceRecord, AppSettings } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { PhotoFrame3DPopup } from './PhotoFrame3DPopup';
import { soundEffects, speakGreeting } from '../utils/audio';
import { triggerConfetti } from '../utils/confetti';
import { toGujaratiNum, formatGujaratiDate } from '../utils/gujarati';
import { calculateCategoryGenderBreakdown } from '../utils/studentStats';
import { StorageService } from '../services/storage';
import { isLateAttendance } from '../utils/time';

interface StudentAttendanceSectionProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  todayDate: string;
  onToggleAttendance: (studentId: string) => {
    isPresent: boolean;
    alreadyMarked?: boolean;
    after5PM?: boolean;
  };
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

type FilterType = 'all' | 'pending' | 'present' | 'late' | 'roll_1_21' | 'roll_22_43';

export const StudentAttendanceSection: React.FC<StudentAttendanceSectionProps> = ({
  students,
  attendanceRecords,
  todayDate,
  onToggleAttendance,
  settings,
  onUpdateSettings,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPopupStudent, setSelectedPopupStudent] = useState<Student | null>(null);
  const [recentCelebration, setRecentCelebration] = useState<{
    nameGu: string;
    rollNo: number;
    standard: number;
  } | null>(null);

  // Notice notification state for 5 PM reset or locked attendance
  const [noticeMsg, setNoticeMsg] = useState<{ type: 'lock' | 'time'; text: string } | null>(null);

  // Auto-adjustable screen view density & Fullscreen mode
  const [screenDensity, setScreenDensity] = useState<'auto' | 'compact' | 'normal' | 'large'>('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const gridClasses = useMemo(() => {
    switch (screenDensity) {
      case 'compact':
        return 'grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 min-[1800px]:grid-cols-9 gap-2 sm:gap-2.5';
      case 'normal':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 min-[1800px]:grid-cols-7 gap-3 sm:gap-4';
      case 'large':
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5';
      case 'auto':
      default:
        return 'grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 min-[1800px]:grid-cols-8 gap-2.5 sm:gap-3.5';
    }
  }, [screenDensity]);

  const avatarSize = useMemo(() => {
    if (screenDensity === 'compact') return 'md';
    if (screenDensity === 'large') return 'xl';
    return 'lg';
  }, [screenDensity]);

  // Attendance lookup map for today: studentId -> record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      if (r.date === todayDate) {
        map.set(r.studentId, r);
      }
    });
    return map;
  }, [attendanceRecords, todayDate]);

  // Overall stats for Std 7 (43 students)
  const stats = useMemo(() => {
    const total = students.length;
    let lateCount = 0;
    const cutoff = settings.lateTimeCutoff || '09:30 AM';
    const present = students.filter((s) => {
      const rec = attendanceMap.get(s.id);
      if (rec && rec.status === 'present') {
        if (isLateAttendance(rec.timestamp, cutoff)) {
          lateCount++;
        }
        return true;
      }
      return false;
    }).length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, percentage, lateCount };
  }, [students, attendanceMap, settings.lateTimeCutoff]);

  // Category and Gender Breakdown (Kumar / Kanya)
  const catGenderStats = useMemo(() => {
    return calculateCategoryGenderBreakdown(students);
  }, [students]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const rec = attendanceMap.get(s.id);
      const isPresent = rec?.status === 'present';
      const cutoff = settings.lateTimeCutoff || '09:30 AM';

      // Status/Range filter
      let matchFilter = true;
      if (activeFilter === 'present') {
        matchFilter = isPresent;
      } else if (activeFilter === 'pending') {
        matchFilter = !isPresent;
      } else if (activeFilter === 'late') {
        matchFilter = isPresent && isLateAttendance(rec?.timestamp, cutoff);
      } else if (activeFilter === 'roll_1_21') {
        matchFilter = s.rollNo >= 1 && s.rollNo <= 21;
      } else if (activeFilter === 'roll_22_43') {
        matchFilter = s.rollNo >= 22;
      }

      // Search query filter
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.nameGu.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.rollNo.toString() === q ||
        toGujaratiNum(s.rollNo) === q;

      return matchFilter && matchSearch;
    }).sort((a, b) => a.rollNo - b.rollNo);
  }, [students, activeFilter, searchQuery, attendanceMap]);

  // Handle student photo click
  const handleCardClick = (student: Student, event: React.MouseEvent<HTMLButtonElement>) => {
    const existingRec = attendanceMap.get(student.id);
    const isAlreadyPresent = existingRec?.status === 'present';
    const isAfter5 = StorageService.isAfter5PM() && settings.autoResetAfter5PM !== false;

    // Check 1: 5 PM Auto-Reset rule (સાંજે ૫ વાગ્યા પછી ઓટો રીસેટ)
    if (isAfter5) {
      setNoticeMsg({
        type: 'time',
        text: '⏰ સાંજે ૫:૦૦ વાગ્યા પછી આજની હાજરી ઓટો-રીસેટ થયેલ છે (શાળા સમય પૂર્ણ). નવી હાજરી પૂરી શકાશે નહીં.',
      });
      setTimeout(() => setNoticeMsg(null), 5000);
      return;
    }

    // Check 2: Lock after first attendance (બાળક એક વાર હાજરી પૂરે પછી પુરાઈ / બદલાઈ ના શકે)
    if (isAlreadyPresent && settings.lockAfterFirstMark !== false) {
      setNoticeMsg({
        type: 'lock',
        text: `🔒 ${student.nameGu} ની આજની હાજરી પહેલેથી નોંધાઈ ગઈ છે (લોક છે). બાળક દ્વારા પુનઃ ફેરફાર થઈ શકશે નહીં.`,
      });
      setTimeout(() => setNoticeMsg(null), 5000);
      // Open 3D popup in view mode so the student can enjoy viewing their card
      setSelectedPopupStudent(student);
      if (settings.soundEffects) {
        soundEffects.playTap();
      }
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const result = onToggleAttendance(student.id);

    if (result.after5PM) {
      setNoticeMsg({
        type: 'time',
        text: '⏰ સાંજે ૫:૦૦ વાગ્યા પછી હાજરી પૂરી શકાતી નથી (શાળા સમય પૂર્ણ).',
      });
      setTimeout(() => setNoticeMsg(null), 5000);
      return;
    }

    if (result.alreadyMarked) {
      setNoticeMsg({
        type: 'lock',
        text: `🔒 ${student.nameGu} ની આજની હાજરી પહેલેથી નોંધાઈ ગઈ છે (લોક છે).`,
      });
      setTimeout(() => setNoticeMsg(null), 5000);
      setSelectedPopupStudent(student);
      return;
    }

    if (result.isPresent) {
      // Audio chime
      if (settings.soundEffects) {
        soundEffects.playSuccessChime();
      }

      // Visual confetti burst
      triggerConfetti(x, y);

      // Voice greeting in Gujarati
      if (settings.voiceGreeting) {
        speakGreeting(student.nameGu, student.nameEn, settings.language);
      }

      // Show celebratory 3D Photo Frame Pop-up Modal!
      setSelectedPopupStudent(student);

      // Celebration banner
      setRecentCelebration({
        nameGu: student.nameGu,
        rollNo: student.rollNo,
        standard: student.standard,
      });
      setTimeout(() => {
        setRecentCelebration((prev) => (prev?.nameGu === student.nameGu ? null : prev));
      }, 4500);
    } else {
      if (settings.soundEffects) {
        soundEffects.playTap();
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 3D POP-UP MODAL */}
      <PhotoFrame3DPopup
        isOpen={!!selectedPopupStudent}
        student={selectedPopupStudent}
        attendanceRecord={
          selectedPopupStudent ? attendanceMap.get(selectedPopupStudent.id) : undefined
        }
        lateTimeCutoff={settings.lateTimeCutoff || '09:30 AM'}
        onClose={() => setSelectedPopupStudent(null)}
        onMarkPresent={() => {
          if (selectedPopupStudent) {
            onToggleAttendance(selectedPopupStudent.id);
            if (settings.soundEffects) soundEffects.playSuccessChime();
          }
        }}
      />

      {/* Informational Toast Notice for Lock / 5 PM */}
      {noticeMsg && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-md transition-all animate-bounce-subtle ${
            noticeMsg.type === 'lock'
              ? 'bg-amber-500 text-slate-950 border border-amber-400'
              : 'bg-rose-600 text-white border border-rose-500'
          }`}
        >
          {noticeMsg.type === 'lock' ? (
            <Lock className="w-5 h-5 shrink-0 text-slate-950" />
          ) : (
            <Clock className="w-5 h-5 shrink-0 text-white" />
          )}
          <span className="flex-1 text-xs md:text-sm font-bold">{noticeMsg.text}</span>
          <button
            onClick={() => setNoticeMsg(null)}
            className="px-2.5 py-1 bg-black/20 hover:bg-black/30 rounded-xl text-xs font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Friendly Top Header Banner for Standard 7 */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-5 md:p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatGujaratiDate(todayDate)}</span>
              <span className="opacity-75">·</span>
              <span className="font-mono opacity-90">{todayDate}</span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                ધોરણ ૭ - ૩D બાળ ફોટો હાજરી
              </h1>
              <span className="bg-white text-amber-900 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs">
                કુલ ૪૩ વિદ્યાર્થીઓ
              </span>
            </div>

            <p className="text-amber-100 text-xs md:text-sm mt-1">
              બાળકો પોતાના ૩D ફોટો ફ્રેમ પર ક્લિક કરીને હાજરી પૂરી શકે છે.
            </p>

            {/* Automation Badges */}
            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              <span className="inline-flex items-center gap-1.5 bg-black/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>સાંજે ૫:૦૦ વાગ્યા પછી ઓટો રીસેટ</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-black/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl">
                <Lock className="w-3.5 h-3.5 text-emerald-300" />
                <span>૧ વાર હાજરી પુરાયા પછી લોક</span>
              </span>
            </div>
          </div>

          {/* Quick Sound Toggles */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onUpdateSettings({ soundEffects: !settings.soundEffects })}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs ${
                settings.soundEffects
                  ? 'bg-white text-amber-900 font-semibold'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
              title="સાઉન્ડ ઇફેક્ટ્સ શરૂ/બંધ"
            >
              {settings.soundEffects ? (
                <Volume2 className="w-4 h-4 text-amber-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/70" />
              )}
              <span>અવાજ {settings.soundEffects ? 'ચાલુ' : 'બંધ'}</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ voiceGreeting: !settings.voiceGreeting })}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs ${
                settings.voiceGreeting
                  ? 'bg-white text-emerald-900 font-semibold'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
              title="ગુજરાતી બોલીને અભિવાદન શરૂ/બંધ"
            >
              {settings.voiceGreeting ? (
                <Mic className="w-4 h-4 text-emerald-600" />
              ) : (
                <MicOff className="w-4 h-4 text-white/70" />
              )}
              <span>બોલવું {settings.voiceGreeting ? 'ચાલુ' : 'બંધ'}</span>
            </button>
          </div>
        </div>

        {/* Live Attendance Stats Counter */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center">
            <div className="text-[11px] sm:text-xs font-medium text-amber-100">કુલ વિદ્યાર્થીઓ</div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {toGujaratiNum(stats.total)}{' '}
              <span className="text-xs font-normal opacity-80">(ધો. ૭)</span>
            </div>
            <div className="text-[10px] text-amber-100/90 mt-1 font-semibold">
              કુમાર: {toGujaratiNum(catGenderStats.total.kumar)} | કન્યા: {toGujaratiNum(catGenderStats.total.kanya)}
            </div>
          </div>

          <div className="bg-emerald-950/30 backdrop-blur-md rounded-2xl p-3 border border-emerald-300/40 text-center">
            <div className="text-[11px] sm:text-xs font-bold text-emerald-200 flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>હાજર બાળકો</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-100 mt-0.5">
              {toGujaratiNum(stats.present)}{' '}
              <span className="text-xs font-normal opacity-80">({stats.percentage}%)</span>
            </div>
            <div className="text-[10px] text-emerald-200/90 mt-1 font-semibold flex items-center justify-center gap-1">
              {stats.lateCount > 0 ? (
                <span className="bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded font-black inline-flex items-center gap-0.5 shadow-2xs">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{toGujaratiNum(stats.lateCount)} મોડા (Late)</span>
                </span>
              ) : (
                <span>આજની નોંધાયેલ હાજરી</span>
              )}
            </div>
          </div>

          <div className="bg-rose-950/30 backdrop-blur-md rounded-2xl p-3 border border-rose-300/40 text-center">
            <div className="text-[11px] sm:text-xs font-bold text-rose-200">બાકી બાળકો</div>
            <div className="text-xl sm:text-2xl font-black text-rose-100 mt-0.5">
              {toGujaratiNum(stats.absent)}
            </div>
            <div className="text-[10px] text-rose-200/90 mt-1 font-semibold">
              હાજરી બાકી છે
            </div>
          </div>
        </div>

        {/* Late Attendance Alert Strip */}
        {stats.lateCount > 0 && (
          <div className="mt-3 bg-amber-500/20 border border-amber-300/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-amber-100 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {settings.lateTimeCutoff || '૦૯:૩૦ AM'} પછી મોડા આવેલા વિદ્યાર્થીઓ: <strong>{toGujaratiNum(stats.lateCount)}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'late' ? 'all' : 'late')}
              className="text-[11px] font-bold text-amber-200 hover:text-white underline cursor-pointer"
            >
              {activeFilter === 'late' ? 'બધાં ૪૩ બાળકો જુઓ' : 'મોડા બાળકો ફિલ્ટર કરો →'}
            </button>
          </div>
        )}

        {/* CATEGORY & GENDER BREAKDOWN BOXES (ST, SC, OBC, OTHER - KUMAR / KANYA) */}
        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="text-xs font-bold text-amber-100 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>સામાજિક વર્ગ મુજબ કુમાર-કન્યા વિગત (ST, SC, OBC, Other):</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* ST Box */}
            <div className="bg-emerald-900/40 backdrop-blur-md rounded-xl p-2.5 border border-emerald-300/30 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-200">ST (અનુ. જનજાતિ)</span>
                <span className="text-xs font-black bg-emerald-400 text-emerald-950 px-1.5 py-0.2 rounded">
                  {toGujaratiNum(catGenderStats.ST.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-100 mt-1 font-medium">
                <span>કુમાર: <strong>{toGujaratiNum(catGenderStats.ST.kumar)}</strong></span>
                <span>કન્યા: <strong>{toGujaratiNum(catGenderStats.ST.kanya)}</strong></span>
              </div>
            </div>

            {/* SC Box */}
            <div className="bg-purple-900/40 backdrop-blur-md rounded-xl p-2.5 border border-purple-300/30 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-purple-200">SC (અનુ. જાતિ)</span>
                <span className="text-xs font-black bg-purple-300 text-purple-950 px-1.5 py-0.2 rounded">
                  {toGujaratiNum(catGenderStats.SC.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-purple-100 mt-1 font-medium">
                <span>કુમાર: <strong>{toGujaratiNum(catGenderStats.SC.kumar)}</strong></span>
                <span>કન્યા: <strong>{toGujaratiNum(catGenderStats.SC.kanya)}</strong></span>
              </div>
            </div>

            {/* OBC Box */}
            <div className="bg-amber-900/40 backdrop-blur-md rounded-xl p-2.5 border border-amber-300/30 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-200">OBC (બક્ષીપંચ)</span>
                <span className="text-xs font-black bg-amber-300 text-amber-950 px-1.5 py-0.2 rounded">
                  {toGujaratiNum(catGenderStats.OBC.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-amber-100 mt-1 font-medium">
                <span>કુમાર: <strong>{toGujaratiNum(catGenderStats.OBC.kumar)}</strong></span>
                <span>કન્યા: <strong>{toGujaratiNum(catGenderStats.OBC.kanya)}</strong></span>
              </div>
            </div>

            {/* Other Box */}
            <div className="bg-blue-900/40 backdrop-blur-md rounded-xl p-2.5 border border-blue-300/30 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-200">Other (સામાન્ય)</span>
                <span className="text-xs font-black bg-blue-300 text-blue-950 px-1.5 py-0.2 rounded">
                  {toGujaratiNum(catGenderStats.Other.total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-blue-100 mt-1 font-medium">
                <span>કુમાર: <strong>{toGujaratiNum(catGenderStats.Other.kumar)}</strong></span>
                <span>કન્યા: <strong>{toGujaratiNum(catGenderStats.Other.kanya)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Cheerful recent mark celebration toast */}
        {recentCelebration && (
          <div className="mt-4 p-3 bg-white text-emerald-900 rounded-2xl text-sm font-semibold flex items-center justify-between animate-cheerful-pop shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
              <span>
                ખૂબ સરસ! રોલ નં. {toGujaratiNum(recentCelebration.rollNo)} -{' '}
                <strong className="font-extrabold text-emerald-700">{recentCelebration.nameGu}</strong> ની હાજરી પુરાઈ ગઈ! 🎉
              </span>
            </div>
            <span className="text-xs text-emerald-700 font-bold hidden sm:inline">ધોરણ ૭ - Welcome!</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Quick Filter Buttons for 43 students */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>બધાં ૪૩ બાળકો</span>
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'pending'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>બાકી ({toGujaratiNum(stats.absent)})</span>
          </button>

          <button
            onClick={() => setActiveFilter('present')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'present'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>હાજર ({toGujaratiNum(stats.present)})</span>
          </button>

          {stats.lateCount > 0 && (
            <button
              onClick={() => setActiveFilter('late')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'late'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
              }`}
              title="૯:૩૦ પછી મોડા આવેલા વિદ્યાર્થીઓ"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>મોડા ({toGujaratiNum(stats.lateCount)})</span>
            </button>
          )}

          <button
            onClick={() => setActiveFilter('roll_1_21')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'roll_1_21'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>રોલ ૧ થી ૨૧</span>
          </button>

          <button
            onClick={() => setActiveFilter('roll_22_43')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'roll_22_43'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>રોલ ૨૨ થી આગળ</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="નામ અથવા રોલ નં. શોધો..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SCREEN AUTO-ADJUST & VIEW CONTROLS TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-2xl text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <Monitor className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">સ્ક્રીન ઓટો-એડજસ્ટ (Auto Screen Fit):</span>
            <span className="sm:hidden">સ્ક્રીન ફિટ:</span>
          </div>

          {/* Density Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setScreenDensity('auto')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                screenDensity === 'auto'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
              title="સ્ક્રીન સાઈઝ મુજબ આપમેળે એડજસ્ટ (Auto Responsive Fit)"
            >
              ⚡ ઓટો
            </button>
            <button
              type="button"
              onClick={() => setScreenDensity('compact')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                screenDensity === 'compact'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
              title="નાની સાઈઝ / બધા બાળકો એક સ્ક્રીનમાં (Compact)"
            >
              📱 નાની
            </button>
            <button
              type="button"
              onClick={() => setScreenDensity('normal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                screenDensity === 'normal'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
              title="મધ્યમ સામાન્ય સાઈઝ (Comfortable Standard)"
            >
              🖥️ સામાન્ય
            </button>
            <button
              type="button"
              onClick={() => setScreenDensity('large')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                screenDensity === 'large'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white'
              }`}
              title="મોટી સાઈઝ / સ્માર્ટબોર્ડ અને પ્રોજેક્ટર માટે (Smart Board / TV)"
            >
              📺 સ્માર્ટબોર્ડ
            </button>
          </div>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
          title={isFullscreen ? 'સામાન્ય વિન્ડો મોડ' : 'સંપૂર્ણ સ્ક્રીન પર ફિટ કરો (Full Screen Mode)'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>{isFullscreen ? 'નાની સ્ક્રીન' : 'ફુલ સ્ક્રીન મોડ'}</span>
        </button>
      </div>

      {/* Grid of 43 Student Photo Cards with 3D FRAME EFFECT */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">કોઈ વિદ્યાર્થી મળ્યા નથી</h3>
          <p className="text-xs text-slate-400 mt-1">
            શોધ શબ્દ તપાસો અથવા બધાં બાળકો ફિલ્ટર પસંદ કરો.
          </p>
        </div>
      ) : (
        <div className={`${gridClasses} transition-all duration-300`}>
          {filteredStudents.map((student) => {
            const record = attendanceMap.get(student.id);
            const isPresent = record?.status === 'present';
            const isGirl = student.gender === 'female';
            const cat = student.category || 'OBC';
            const cutoff = settings.lateTimeCutoff || '09:30 AM';
            const isLate = isPresent && isLateAttendance(record?.timestamp, cutoff);

            return (
              <div
                key={student.id}
                className={`relative group rounded-3xl ${
                  screenDensity === 'compact'
                    ? 'p-2 sm:p-2.5'
                    : screenDensity === 'large'
                    ? 'p-4 sm:p-5'
                    : 'p-2.5 sm:p-3.5'
                } transition-all duration-300 flex flex-col items-center select-none ${
                  isPresent ? 'photo-frame-3d-present' : 'photo-frame-3d'
                }`}
              >
                {/* Roll No, Category, Gender & Late status badges */}
                <div className="w-full flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 bg-white/90 px-1.5 sm:px-2 py-0.5 rounded-lg border border-slate-200/90 shadow-2xs">
                      રોલ {toGujaratiNum(student.rollNo)}
                    </span>
                    {/* Subtle Late Notification Badge */}
                    {isLate && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-900 border border-amber-400/60 text-[9px] font-extrabold tracking-tight"
                        title={`${cutoff} પછી મોડા આવ્યા (હાજરી સમય: ${record?.timestamp})`}
                      >
                        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        <span>Late</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        isGirl
                          ? 'bg-pink-100 text-pink-900 border border-pink-200'
                          : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}
                    >
                      {isGirl ? 'કન્યા' : 'કુમાર'}
                    </span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        cat === 'ST'
                          ? 'bg-emerald-100 text-emerald-900'
                          : cat === 'SC'
                          ? 'bg-purple-100 text-purple-900'
                          : cat === 'OBC'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {cat}
                    </span>
                  </div>
                </div>

                {/* 3D EMBOSSED PHOTO FRAME TRIGGER */}
                <div className="relative my-1">
                  <button
                    type="button"
                    onClick={(e) => handleCardClick(student, e)}
                    className="cursor-pointer group-hover:scale-105 transition-transform duration-300 focus:outline-none block"
                    title="હાજરી પૂરો અથવા ૩D જુઓ"
                  >
                    {/* Photo Frame Ring with bevel */}
                    <div
                      className={`p-1.5 rounded-2xl transition-all duration-300 ${
                        isPresent
                          ? 'bg-gradient-to-tr from-emerald-400 to-green-500 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-300'
                          : 'bg-gradient-to-tr from-slate-200 via-amber-200 to-slate-300 group-hover:from-amber-400 group-hover:to-orange-400 shadow-sm'
                      }`}
                    >
                      <StudentAvatar
                        studentId={student.id}
                        photoUrl={student.photoUrl}
                        nameGu={student.nameGu}
                        gender={student.gender}
                        avatarIcon={student.avatarIcon}
                        avatarBg={student.avatarBg}
                        size={avatarSize}
                        className="rounded-xl overflow-hidden shadow-inner"
                      />
                    </div>

                    {/* Present Checkmark icon & Lock indicator overlay */}
                    {isPresent && (
                      <>
                        <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white rounded-full p-1 shadow-md border-2 border-white animate-cheerful-pop">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div
                          className="absolute -top-1.5 -left-1.5 bg-emerald-700 text-white rounded-full p-1 shadow-md border-2 border-white z-10"
                          title="હાજરી લોક છે"
                        >
                          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        {isLate && (
                          <div
                            className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-1 shadow-md border-2 border-white z-10"
                            title={`મોડા આવ્યા: ${record?.timestamp}`}
                          >
                            <Clock className="w-3 h-3" />
                          </div>
                        )}
                      </>
                    )}
                  </button>

                  {/* Quick 3D Pop-up View indicator */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPopupStudent(student);
                    }}
                    className="absolute -top-1 -right-1 bg-white/95 text-slate-600 hover:text-amber-600 rounded-full p-1 shadow-sm border border-slate-200 hover:scale-110 transition-transform cursor-pointer z-10"
                    title="૩D ફોટો ફ્રેમ પોપ-અપ જુઓ"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>

                {/* Gujarati Name & English Name */}
                <div className="w-full text-center mt-2">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight line-clamp-1">
                    {student.nameGu}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                    {student.nameEn}
                  </div>
                </div>

                {/* Attendance Action Button Pill */}
                <div className="w-full mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => handleCardClick(student, e)}
                    className="w-full cursor-pointer focus:outline-none"
                  >
                    {isPresent ? (
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-1 rounded-xl w-full justify-center shadow-2xs">
                          <Lock className="w-3 h-3 text-emerald-700" />
                          <span>હાજર (લોક 🔒)</span>
                        </div>
                        {isLate && (
                          <div
                            className="flex items-center justify-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/90 px-1.5 py-0.5 rounded-lg shadow-2xs"
                            title={`મોડા આવ્યા (${cutoff} પછી): ${record?.timestamp}`}
                          >
                            <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            <span>મોડા આવ્યા · {record?.timestamp}</span>
                          </div>
                        )}
                      </div>
                    ) : StorageService.isAfter5PM() && settings.autoResetAfter5PM !== false ? (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-xl w-full justify-center">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>સમય પૂર્ણ (૫ PM)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-xl w-full justify-center transition-colors shadow-2xs">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>હાજરી પૂરો</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
