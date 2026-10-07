import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Users,
  Award,
  CalendarCheck,
} from 'lucide-react';
import { Student, AttendanceRecord } from '../types';
import { toGujaratiNum, getGujaratiMonthName } from '../utils/gujarati';

interface MonthlyAttendanceCalendarCardProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export const MonthlyAttendanceCalendarCard: React.FC<MonthlyAttendanceCalendarCardProps> = ({
  students,
  attendanceRecords,
  selectedDate,
  onSelectDate,
}) => {
  // Current view month/year in the calendar
  const initialDate = useMemo(() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
    return new Date();
  }, [selectedDate]);

  const [viewDate, setViewDate] = useState<Date>(initialDate);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth() + 1; // 1-indexed

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 2, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayStr = now.toISOString().split('T')[0];
    onSelectDate(todayStr);
  };

  // Prefix string for filtering records of the view month: "YYYY-MM"
  const monthPrefix = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;

  // Pre-calculate attendance stats for this month
  const monthStats = useMemo(() => {
    const filtered = attendanceRecords.filter((r) => r.date.startsWith(monthPrefix));

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;

    // Set of dates where at least one student attendance was recorded
    const datesRecordedSet = new Set<string>();

    // Map of date -> { present: number, absent: number, leave: number, total: number }
    const dateStatsMap = new Map<string, { present: number; absent: number; leave: number; total: number }>();

    filtered.forEach((r) => {
      datesRecordedSet.add(r.date);

      if (!dateStatsMap.has(r.date)) {
        dateStatsMap.set(r.date, { present: 0, absent: 0, leave: 0, total: 0 });
      }
      const st = dateStatsMap.get(r.date)!;
      st.total++;

      if (r.status === 'present') {
        totalPresent++;
        st.present++;
      } else if (r.status === 'leave') {
        totalLeave++;
        st.leave++;
      } else {
        totalAbsent++;
        st.absent++;
      }
    });

    const totalRecords = totalPresent + totalAbsent + totalLeave;
    const attendancePercentage =
      totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

    return {
      totalPresent,
      totalAbsent,
      totalLeave,
      totalRecords,
      attendancePercentage,
      workingDaysCount: datesRecordedSet.size,
      dateStatsMap,
      datesRecordedSet,
    };
  }, [attendanceRecords, monthPrefix]);

  // Calendar matrix calculations
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth - 1, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];

    const cells: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasRecord: boolean;
      stats?: { present: number; absent: number; leave: number; total: number };
      percentage?: number;
    }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevY = viewMonth === 1 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(prevY, prevM - 1, day).getDay();

      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: false,
        isSunday: dayOfWeek === 0,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        hasRecord: false,
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(viewYear, viewMonth - 1, day).getDay();
      const stats = monthStats.dateStatsMap.get(dateStr);
      const hasRecord = monthStats.datesRecordedSet.has(dateStr);
      const percentage =
        stats && stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : undefined;

      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: true,
        isSunday: dayOfWeek === 0,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        hasRecord,
        stats,
        percentage,
      });
    }

    // Trailing days from next month to complete 7-day grid rows (35 or 42 cells)
    const totalCellsNeeded = cells.length <= 35 ? 35 : 42;
    const remaining = totalCellsNeeded - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextM = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextY = viewMonth === 12 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(nextY, nextM - 1, day).getDay();

      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: false,
        isSunday: dayOfWeek === 0,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        hasRecord: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth, selectedDate, monthStats]);

  // SVG Circular progress bar measurements
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (monthStats.attendancePercentage / 100) * circumference;

  const gujaratiDayHeaders = ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ'];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/70 space-y-6">
      {/* CARD TOP HEADER & MONTH SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-2xl">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              માસિક હાજરી કેલેન્ડર & સારાંશ (Monthly Calendar & Attendance)
            </h2>
            <p className="text-xs text-slate-500">
              તારીખ પર ક્લિક કરીને ભૂતકાળની હાજરી તરત તપાસો અને સંપાદિત કરો
            </p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="ગત મહિનો"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 min-w-[140px] text-center">
            {getGujaratiMonthName(viewMonth)} {toGujaratiNum(viewYear)}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="આગામી મહિનો"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            આજ (Today)
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID: CIRCULAR SUMMARY CARD (LEFT) & INTERACTIVE CALENDAR (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CIRCULAR PROGRESS BAR & STATS CARD (4 COLS) */}
        <div className="lg:col-span-4 bg-gradient-to-b from-slate-50 to-amber-50/30 rounded-3xl p-5 border border-slate-200/80 flex flex-col items-center">
          <div className="w-full text-center mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
              {getGujaratiMonthName(viewMonth)} {toGujaratiNum(viewYear)} ની હાજરી
            </span>
          </div>

          {/* CIRCULAR PROGRESS BAR (SVG) */}
          <div className="relative my-2 flex items-center justify-center">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 130 130">
              {/* Background Track */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress Stroke */}
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>

            {/* Centered Percentage & Label */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {monthStats.attendancePercentage}%
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">
                સરેરાશ હાજરી
              </span>
            </div>
          </div>

          {/* ATTENDANCE COUNTERS BREAKDOWN (PRESENT VS ABSENT) */}
          <div className="w-full grid grid-cols-2 gap-2.5 mt-4">
            {/* Total Present */}
            <div className="bg-white rounded-2xl p-3 border border-emerald-100 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[11px] font-bold">કુલ હાજર</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-xl font-black text-emerald-950 font-mono">
                {toGujaratiNum(monthStats.totalPresent)}
              </span>
              <span className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                વિદ્યાર્થી-દિવસ હાજરી
              </span>
            </div>

            {/* Total Absent */}
            <div className="bg-white rounded-2xl p-3 border border-rose-100 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-[11px] font-bold">કુલ ગેરહાજર</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <span className="text-xl font-black text-rose-950 font-mono">
                {toGujaratiNum(monthStats.totalAbsent)}
              </span>
              <span className="text-[9px] font-semibold text-rose-600 mt-0.5">
                ગેરહાજરી દિવસો
              </span>
            </div>

            {/* Total Leaves */}
            <div className="bg-white rounded-2xl p-2.5 border border-amber-100 shadow-2xs flex flex-col">
              <span className="text-[10px] font-bold text-amber-700">રજા (Leaves)</span>
              <span className="text-base font-black text-amber-950 font-mono">
                {toGujaratiNum(monthStats.totalLeave)}
              </span>
            </div>

            {/* Working Days Recorded */}
            <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-2xs flex flex-col">
              <span className="text-[10px] font-bold text-slate-600">નોંધાયેલ દિવસો</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {toGujaratiNum(monthStats.workingDaysCount)} દિવસ
              </span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="w-full mt-3 text-center text-[10px] font-medium text-slate-500">
            ધોરણ ૭ ના કુલ <strong className="text-slate-800 font-bold">{toGujaratiNum(students.length)}</strong> વિદ્યાર્થીઓની માસિક ગણતરી
          </div>
        </div>

        {/* RIGHT COLUMN: VISUAL INTERACTIVE MONTHLY CALENDAR GRID (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
            {gujaratiDayHeaders.map((dh, idx) => (
              <div
                key={dh}
                className={`py-2 text-[11px] font-black rounded-xl ${
                  idx === 0
                    ? 'bg-rose-50 text-rose-800 border border-rose-200/50'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {dh}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell, idx) => {
              const {
                dayNum,
                dateStr,
                isCurrentMonth,
                isSunday,
                isToday,
                isSelected,
                hasRecord,
                stats,
                percentage,
              } = cell;

              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  disabled={!isCurrentMonth}
                  className={`relative p-2 sm:p-2.5 min-h-[64px] sm:min-h-[76px] rounded-2xl transition-all duration-200 flex flex-col justify-between text-left cursor-pointer border ${
                    !isCurrentMonth
                      ? 'opacity-30 bg-slate-50/50 border-transparent cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400 font-bold scale-[1.02] z-10'
                      : isToday
                      ? 'bg-amber-50/80 border-amber-300 text-slate-900 shadow-xs'
                      : hasRecord
                      ? 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 hover:border-amber-300 shadow-2xs'
                      : isSunday
                      ? 'bg-rose-50/40 border-rose-100 text-slate-400'
                      : 'bg-white/60 hover:bg-slate-50 border-dashed border-slate-200 text-slate-500'
                  }`}
                  title={`${dateStr} ની હાજરી જુઓ`}
                >
                  {/* Top: Day Number and Indicators */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-black font-mono leading-none ${
                        isSelected
                          ? 'text-slate-950'
                          : isToday
                          ? 'text-amber-800'
                          : isSunday
                          ? 'text-rose-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {toGujaratiNum(dayNum)}
                    </span>

                    {/* Today badge or Sunday icon */}
                    {isToday && (
                      <span
                        className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-slate-950 text-white'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        આજ
                      </span>
                    )}

                    {isSunday && !isToday && (
                      <span className="text-[9px] text-rose-400 font-medium">રવિ</span>
                    )}
                  </div>

                  {/* Bottom: Attendance Status Indicator */}
                  <div className="w-full mt-1.5">
                    {hasRecord && stats ? (
                      <div className="space-y-0.5">
                        <div
                          className={`text-[10px] font-black flex items-center justify-between leading-none ${
                            isSelected ? 'text-slate-950' : 'text-emerald-700'
                          }`}
                        >
                          <span className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                            <span>{toGujaratiNum(stats.present)}/{toGujaratiNum(students.length)}</span>
                          </span>
                          <span className="text-[9px] opacity-90">{percentage}%</span>
                        </div>
                        {/* Progress mini bar */}
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              isSelected ? 'bg-slate-900' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    ) : isSunday ? (
                      <div className="text-[9px] text-rose-500/80 font-medium">શાળા રજા</div>
                    ) : isCurrentMonth ? (
                      <div className="text-[9px] text-slate-400 font-normal">બાકી</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CALENDAR LEGEND & SHORTCUT NOTICES */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[11px]">હાજરી પુરાયેલ (Marked)</span>
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-[11px]">પસંદ કરેલ તારીખ (Selected)</span>
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                <span className="text-[11px]">રવિવાર / રજા (Sunday)</span>
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="text-[11px]">હાજરી બાકી (Pending)</span>
              </span>
            </div>

            <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              પસંદ કરેલ: {selectedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
