import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  Printer,
  TrendingUp,
  Award,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Student, AttendanceRecord, SchoolInfo } from '../types';
import { toGujaratiNum, formatGujaratiDate } from '../utils/gujarati';

interface MonthlyAttendanceReportProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  schoolInfo: SchoolInfo;
  currentDate: string;
  onExportCSV: () => void;
  onPrint: () => void;
}

interface DayTrend {
  date: string;
  dayNum: number;
  dayLabel: string;
  present: number;
  absent: number;
  leave: number;
  total: number;
  percentage: number;
}

export const MonthlyAttendanceReport: React.FC<MonthlyAttendanceReportProps> = ({
  students,
  attendanceRecords,
  schoolInfo,
  currentDate,
  onExportCSV,
  onPrint,
}) => {
  // Default to current year-month e.g. "2026-09"
  const defaultYearMonth = currentDate.slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYearMonth);

  // Month options for dropdown
  const monthOptions = [
    { value: '2026-06', label: 'જૂન ૨૦૨૬ (June 2026)' },
    { value: '2026-07', label: 'જુલાઈ ૨૦૨૬ (July 2026)' },
    { value: '2026-08', label: 'ઓગસ્ટ ૨૦૨૬ (August 2026)' },
    { value: '2026-09', label: 'સપ્ટેમ્બર ૨૦૨૬ (September 2026)' },
    { value: '2026-10', label: 'ઓક્ટોબર ૨૦૨૬ (October 2026)' },
  ];

  // Records for selected month
  const monthRecords = useMemo(() => {
    return attendanceRecords.filter((r) => r.date.startsWith(selectedMonth));
  }, [attendanceRecords, selectedMonth]);

  // Aggregate daily trend data for Recharts BarChart
  const dailyTrendData: DayTrend[] = useMemo(() => {
    const dayMap = new Map<string, { present: number; absent: number; leave: number }>();

    // Collect all distinct dates in monthRecords
    monthRecords.forEach((r) => {
      const existing = dayMap.get(r.date) || { present: 0, absent: 0, leave: 0 };
      if (r.status === 'present') existing.present++;
      else if (r.status === 'leave') existing.leave++;
      else existing.absent++;
      dayMap.set(r.date, existing);
    });

    const totalStudents = students.length || 43;

    const list: DayTrend[] = Array.from(dayMap.entries())
      .map(([date, counts]) => {
        const dayNum = parseInt(date.split('-')[2], 10);
        const dayTotal = counts.present + counts.absent + counts.leave || totalStudents;
        const percentage = Math.round((counts.present / dayTotal) * 100);

        return {
          date,
          dayNum,
          dayLabel: `${dayNum} તારીખ`,
          present: counts.present,
          absent: counts.absent,
          leave: counts.leave,
          total: dayTotal,
          percentage,
        };
      })
      .sort((a, b) => a.dayNum - b.dayNum);

    return list;
  }, [monthRecords, students.length]);

  // Monthly high-level stats
  const monthlyStats = useMemo(() => {
    const totalWorkingDays = dailyTrendData.length;
    if (totalWorkingDays === 0) {
      return {
        avgPercentage: 0,
        totalWorkingDays: 0,
        bestDay: null as DayTrend | null,
        lowestDay: null as DayTrend | null,
        totalPresentMarks: 0,
      };
    }

    const totalPresentMarks = dailyTrendData.reduce((sum, d) => sum + d.present, 0);
    const totalPossibleMarks = dailyTrendData.reduce((sum, d) => sum + d.total, 0);
    const avgPercentage =
      totalPossibleMarks > 0 ? Math.round((totalPresentMarks / totalPossibleMarks) * 100) : 0;

    let bestDay = dailyTrendData[0];
    let lowestDay = dailyTrendData[0];

    dailyTrendData.forEach((d) => {
      if (d.percentage > bestDay.percentage) bestDay = d;
      if (d.percentage < lowestDay.percentage) lowestDay = d;
    });

    return {
      avgPercentage,
      totalWorkingDays,
      bestDay,
      lowestDay,
      totalPresentMarks,
    };
  }, [dailyTrendData]);

  // Category-wise attendance rates in this month
  const categoryAttendance = useMemo(() => {
    const catMap = {
      ST: { present: 0, total: 0 },
      SC: { present: 0, total: 0 },
      OBC: { present: 0, total: 0 },
      Other: { present: 0, total: 0 },
    };

    const studentCatMap = new Map<string, 'ST' | 'SC' | 'OBC' | 'Other'>();
    students.forEach((s) => {
      studentCatMap.set(s.id, s.category || 'OBC');
    });

    monthRecords.forEach((r) => {
      const cat = studentCatMap.get(r.studentId) || 'OBC';
      catMap[cat].total++;
      if (r.status === 'present') {
        catMap[cat].present++;
      }
    });

    return [
      {
        category: 'ST',
        name: 'ST (અનુ. જનજાતિ)',
        color: 'emerald',
        rate: catMap.ST.total > 0 ? Math.round((catMap.ST.present / catMap.ST.total) * 100) : 0,
        count: students.filter((s) => s.category === 'ST').length,
        kumar: students.filter((s) => s.category === 'ST' && s.gender === 'male').length,
        kanya: students.filter((s) => s.category === 'ST' && s.gender === 'female').length,
      },
      {
        category: 'SC',
        name: 'SC (અનુ. જાતિ)',
        color: 'purple',
        rate: catMap.SC.total > 0 ? Math.round((catMap.SC.present / catMap.SC.total) * 100) : 0,
        count: students.filter((s) => s.category === 'SC').length,
        kumar: students.filter((s) => s.category === 'SC' && s.gender === 'male').length,
        kanya: students.filter((s) => s.category === 'SC' && s.gender === 'female').length,
      },
      {
        category: 'OBC',
        name: 'OBC (સા.શૈ. પછાત)',
        color: 'amber',
        rate: catMap.OBC.total > 0 ? Math.round((catMap.OBC.present / catMap.OBC.total) * 100) : 0,
        count: students.filter((s) => s.category === 'OBC').length,
        kumar: students.filter((s) => s.category === 'OBC' && s.gender === 'male').length,
        kanya: students.filter((s) => s.category === 'OBC' && s.gender === 'female').length,
      },
      {
        category: 'Other',
        name: 'Other (સામાન્ય/અન્ય)',
        color: 'blue',
        rate: catMap.Other.total > 0 ? Math.round((catMap.Other.present / catMap.Other.total) * 100) : 0,
        count: students.filter((s) => s.category === 'Other').length,
        kumar: students.filter((s) => s.category === 'Other' && s.gender === 'male').length,
        kanya: students.filter((s) => s.category === 'Other' && s.gender === 'female').length,
      },
    ];
  }, [students, monthRecords]);

  // Student ranking: Top regular students & students needing attention
  const studentRankings = useMemo(() => {
    const studentAttendanceMap = new Map<string, { present: number; total: number }>();

    students.forEach((s) => {
      studentAttendanceMap.set(s.id, { present: 0, total: 0 });
    });

    monthRecords.forEach((r) => {
      const stat = studentAttendanceMap.get(r.studentId);
      if (stat) {
        stat.total++;
        if (r.status === 'present') stat.present++;
      }
    });

    const calculated = students.map((s) => {
      const stat = studentAttendanceMap.get(s.id) || { present: 0, total: 0 };
      const pct = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
      return {
        student: s,
        presentDays: stat.present,
        totalDays: stat.total,
        percentage: pct,
      };
    });

    const sorted = [...calculated].sort((a, b) => b.percentage - a.percentage);
    const topStudents = sorted.slice(0, 5);
    const needAttention = [...calculated]
      .filter((s) => s.totalDays > 0)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5);

    return { topStudents, needAttention };
  }, [students, monthRecords]);

  // Custom Gujarati Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: DayTrend = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[180px]">
          <div className="font-bold text-amber-400 border-b border-slate-700/80 pb-1 flex items-center justify-between">
            <span>તારીખ: {toGujaratiNum(data.dayNum)} સપ્ટેમ્બર</span>
            <span className="font-mono text-[11px] text-slate-300">{data.date}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>હાજર વિદ્યાર્થી:</span>
            </span>
            <span className="font-black text-sm">{toGujaratiNum(data.present)}</span>
          </div>
          <div className="flex justify-between items-center text-rose-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>ગેરહાજર:</span>
            </span>
            <span className="font-bold">{toGujaratiNum(data.absent)}</span>
          </div>
          {data.leave > 0 && (
            <div className="flex justify-between items-center text-amber-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>રજા પર:</span>
              </span>
              <span className="font-bold">{toGujaratiNum(data.leave)}</span>
            </div>
          )}
          <div className="pt-1.5 border-t border-slate-700/80 flex justify-between items-center text-slate-300 font-semibold">
            <span>હાજરી દર:</span>
            <span className="text-amber-400 font-black">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar: Month Picker, Export CSV, Print */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
            <Calendar className="w-4 h-4" />
            <span>માસિક હાજરી અહેવાલ અને પૃથ્થકરણ · ધોરણ ૭</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            માસિક હાજરી પ્રગતિ અહેવાલ (Monthly Report)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {schoolInfo.nameGu} · કુલ ૪૩ વિદ્યાર્થીઓ · ગ્રાફ અને આંકડાકીય વિશ્લેષણ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="CSV / Excel ડાઉનલોડ"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV ડાઉનલોડ</span>
          </button>

          <button
            onClick={onPrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="હાજરી પત્રક-અ પ્રિન્ટ કાઢો"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>પત્રક-અ પ્રિન્ટ</span>
          </button>
        </div>
      </div>

      {/* Monthly KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold">સરેરાશ માસિક હાજરી</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950">
            {monthlyStats.avgPercentage}%
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            લક્ષ્યાંક: ૯૦% થી વધુ
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 mb-1">
            <span className="text-xs font-bold">કુલ કાર્યકારી દિવસો</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950">
            {toGujaratiNum(monthlyStats.totalWorkingDays)}{' '}
            <span className="text-xs font-normal text-blue-700">દિવસ</span>
          </div>
          <p className="text-[11px] text-blue-700 mt-1 font-medium">
            ચાલુ માસમાં નોંધાયેલ
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-bold">શ્રેષ્ઠ હાજરી દિવસ</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 truncate">
            {monthlyStats.bestDay
              ? `${toGujaratiNum(monthlyStats.bestDay.dayNum)} તારીખ (${monthlyStats.bestDay.percentage}%)`
              : '-'}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            {monthlyStats.bestDay
              ? `${toGujaratiNum(monthlyStats.bestDay.present)} વિદ્યાર્થી હાજર`
              : 'ડેટા ઉપલબ્ધ નથી'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 border border-purple-200 rounded-3xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-purple-800 mb-1">
            <span className="text-xs font-bold">કુલ વિદ્યાર્થી સંખ્યા</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-950">
            {toGujaratiNum(students.length)}{' '}
            <span className="text-xs font-normal text-purple-700">વિદ્યાર્થીઓ</span>
          </div>
          <p className="text-[11px] text-purple-700 mt-1 font-medium">
            ધોરણ ૭ (રોલ ૧ થી ૪૩)
          </p>
        </div>
      </div>

      {/* RECHARTS BAR CHART: STUDENT ATTENDANCE TRENDS FOR THE CURRENT MONTH */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>ચાલુ માસની દૈનિક હાજરી પ્રગતિ (Daily Attendance Trends)</span>
              <span className="text-xs font-normal bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                Recharts Bar Chart
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              તારીખ મુજબ હાજર (Present), રજા (Leave) અને ગેરહાજર (Absent) વિદ્યાર્થીઓનું દૈનિક વલણ
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
              <span className="text-slate-600 font-medium">હાજર</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span>
              <span className="text-slate-600 font-medium">રજા</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span>
              <span className="text-slate-600 font-medium">ગેરહાજર</span>
            </div>
          </div>
        </div>

        {dailyTrendData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">પસંદ કરેલ માસ માટે કોઈ હાજરી ડેટા ઉપલબ્ધ નથી.</p>
          </div>
        ) : (
          <div className="w-full h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyTrendData}
                margin={{ top: 15, right: 10, left: -20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="dayNum"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${toGujaratiNum(val)}`}
                  label={{
                    value: 'તારીખ (Day of Month)',
                    position: 'insideBottom',
                    offset: -12,
                    fontSize: 11,
                    fill: '#94a3b8',
                  }}
                />
                <YAxis
                  domain={[0, 43]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={39}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{
                    value: '૯૦% હાજરી લક્ષ્યાંક (39)',
                    position: 'top',
                    fill: '#059669',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
                <Bar
                  dataKey="present"
                  name="હાજર (Present)"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="leave"
                  name="રજા (Leave)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="absent"
                  name="ગેરહાજર (Absent)"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row: Category-wise Attendance Analysis & Ranking Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Attendance Rates */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>સામાજિક વર્ગ મુજબ માસિક હાજરી દર</span>
            <span className="text-[11px] font-normal text-slate-500">ST, SC, OBC, Other</span>
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            સરકારી પોર્ટલ/UDISE માટે કેટેગરી અનુસાર સરેરાશ ટકાવારી
          </p>

          <div className="space-y-3.5">
            {categoryAttendance.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        cat.category === 'ST'
                          ? 'bg-emerald-500'
                          : cat.category === 'SC'
                          ? 'bg-purple-500'
                          : cat.category === 'OBC'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    ></span>
                    <span>{cat.name}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      (કુમાર: {cat.kumar} | કન્યા: {cat.kanya} · કુલ {cat.count})
                    </span>
                  </span>
                  <span className="font-black text-slate-900">{cat.rate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      cat.category === 'ST'
                        ? 'bg-emerald-500'
                        : cat.category === 'SC'
                        ? 'bg-purple-500'
                        : cat.category === 'OBC'
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${cat.rate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regular High Achievers (Top Attendance) */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-slate-900">સતત હાજર તેજસ્વી તારલા</h4>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xs text-slate-400 mb-3">
            ચાલુ માસમાં મહત્તમ હાજરી ધરાવતા વિદ્યાર્થીઓ
          </p>

          <div className="space-y-2.5">
            {studentRankings.topStudents.map((item, idx) => (
              <div
                key={item.student.id}
                className="flex items-center justify-between p-2 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="font-bold text-slate-900 truncate">
                      {item.student.nameGu}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      રોલ {toGujaratiNum(item.student.rollNo)} · {item.student.category}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-emerald-700">{item.percentage}%</span>
                  <div className="text-[10px] text-emerald-600">
                    {toGujaratiNum(item.presentDays)}/{toGujaratiNum(item.totalDays)} દિવસ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Students needing attendance support */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-slate-900">ધ્યાન આપવા યોગ્ય વિદ્યાર્થી</h4>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xs text-slate-400 mb-3">
            વારંવાર ગેરહાજર રહેતા વિદ્યાર્થીઓ (વાલી સંપર્ક જરૂરી)
          </p>

          <div className="space-y-2.5">
            {studentRankings.needAttention.map((item) => (
              <div
                key={item.student.id}
                className="flex items-center justify-between p-2 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {item.student.nameGu}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    રોલ {toGujaratiNum(item.student.rollNo)} · 📞 {item.student.parentPhone || 'No Phone'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-rose-700">{item.percentage}%</span>
                  <div className="text-[10px] text-rose-600">
                    {toGujaratiNum(item.totalDays - item.presentDays)} દિવસ ગેરહાજર
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
