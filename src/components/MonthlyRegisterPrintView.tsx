import React, { useState, useMemo } from 'react';
import { Printer, Download, X, Calendar, Check, School, ShieldCheck, Camera } from 'lucide-react';
import { Student, AttendanceRecord, SchoolInfo } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { toGujaratiNum, getGujaratiMonthName } from '../utils/gujarati';
import { calculateCategoryGenderBreakdown } from '../utils/studentStats';

interface MonthlyRegisterPrintViewProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  schoolInfo: SchoolInfo;
  currentDate: string; // e.g., '2026-09-29'
  onClose?: () => void;
}

export const MonthlyRegisterPrintView: React.FC<MonthlyRegisterPrintViewProps> = ({
  students,
  attendanceRecords,
  schoolInfo,
  currentDate,
  onClose,
}) => {
  const [showPhotos, setShowPhotos] = useState(true);

  // Parse year and month
  const [yearStr, monthStr] = currentDate.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = parseInt(monthStr, 10) || new Date().getMonth() + 1;

  // Calculate days in this month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Gujarati short day names
  const gujaratiDayInitials = ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ'];

  // Days array for the table headers
  const daysArray = useMemo(() => {
    const days: {
      dayNum: number;
      dateStr: string;
      dayOfWeek: string;
      isSunday: boolean;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayIndex = new Date(year, month - 1, d).getDay();
      days.push({
        dayNum: d,
        dateStr: dStr,
        dayOfWeek: gujaratiDayInitials[dayIndex],
        isSunday: dayIndex === 0,
      });
    }
    return days;
  }, [year, month, daysInMonth]);

  // Attendance lookup: Map<studentId_date, status>
  const attendanceLookup = useMemo(() => {
    const map = new Map<string, 'present' | 'absent' | 'leave'>();
    attendanceRecords.forEach((r) => {
      if (r.date.startsWith(`${yearStr}-${monthStr}`)) {
        map.set(`${r.studentId}_${r.date}`, r.status);
      }
    });
    return map;
  }, [attendanceRecords, yearStr, monthStr]);

  // Category and Gender breakdown for all students
  const catGenderStats = useMemo(() => {
    return calculateCategoryGenderBreakdown(students);
  }, [students]);

  // Student rows with day-by-day attendance and totals
  const studentRows = useMemo(() => {
    const sorted = [...students].sort((a, b) => a.rollNo - b.rollNo);
    return sorted.map((st) => {
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let workingDays = 0;

      const dayMarks = daysArray.map((day) => {
        if (day.isSunday) {
          return { mark: 'રવિ', status: 'sunday' as const };
        }
        workingDays++;
        const status = attendanceLookup.get(`${st.id}_${day.dateStr}`);
        if (status === 'present') {
          presentCount++;
          return { mark: 'P', status: 'present' as const };
        } else if (status === 'leave') {
          leaveCount++;
          return { mark: 'L', status: 'leave' as const };
        } else if (status === 'absent') {
          absentCount++;
          return { mark: 'A', status: 'absent' as const };
        } else {
          // If no explicit record, mark as absent if date is in past/today, or blank
          const today = new Date().toISOString().split('T')[0];
          if (day.dateStr <= today) {
            absentCount++;
            return { mark: 'A', status: 'absent' as const };
          }
          return { mark: '-', status: 'empty' as const };
        }
      });

      const totalRecorded = presentCount + absentCount + leaveCount;
      const percentage =
        totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;

      return {
        student: st,
        dayMarks,
        presentCount,
        absentCount,
        leaveCount,
        percentage,
      };
    });
  }, [students, daysArray, attendanceLookup]);

  // Daily totals row (Boys present, Girls present, Total present, Total absent)
  const dailyTotals = useMemo(() => {
    return daysArray.map((day) => {
      if (day.isSunday) {
        return { isSunday: true, boysPresent: 0, girlsPresent: 0, totalPresent: 0, totalAbsent: 0 };
      }

      let boysPresent = 0;
      let girlsPresent = 0;
      let totalPresent = 0;
      let totalAbsent = 0;

      students.forEach((st) => {
        const status = attendanceLookup.get(`${st.id}_${day.dateStr}`);
        const isMale = st.gender === 'male';

        if (status === 'present') {
          totalPresent++;
          if (isMale) boysPresent++;
          else girlsPresent++;
        } else {
          totalAbsent++;
        }
      });

      return {
        isSunday: false,
        boysPresent,
        girlsPresent,
        totalPresent,
        totalAbsent,
      };
    });
  }, [daysArray, students, attendanceLookup]);

  // Grand summary totals across the whole month
  const monthSummary = useMemo(() => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;

    studentRows.forEach((r) => {
      totalPresent += r.presentCount;
      totalAbsent += r.absentCount;
      totalLeave += r.leaveCount;
    });

    const totalDaysCount = totalPresent + totalAbsent + totalLeave;
    const overallPercentage =
      totalDaysCount > 0 ? Math.round((totalPresent / totalDaysCount) * 100) : 0;

    return {
      totalPresent,
      totalAbsent,
      totalLeave,
      overallPercentage,
    };
  }, [studentRows]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900">
      {/* Top Action Toolbar (Hidden during actual print) */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900">
                માસિક હાજરી રજિસ્ટર પત્રક (A4 પ્રિન્ટ લેઆઉટ)
              </h2>
              <p className="text-xs text-slate-500">
                શાળાના ફિઝિકલ રેકોર્ડ અને ફાઇલિંગ માટે સત્તાવાર A4 Landscape લેઆઉટ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Toggle Student Photos in Register */}
            <button
              onClick={() => setShowPhotos(!showPhotos)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                showPhotos
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="પત્રકમાં બાળકના અપલોડ કરેલા ફોટા દર્શાવો અથવા છુપાવો"
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>{showPhotos ? '📸 ફોટા સાથે પત્રક' : '📄 માત્ર લખાણ'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>પ્રિન્ટ કરો / PDF ડાઉનલોડ (A4 PDF)</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                પાછા જાઓ (Close)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* A4 PRINT CONTAINER */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6 print:p-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print:p-0 print:border-none print:shadow-none overflow-x-auto text-[11px] print:text-[9px]">
          {/* Official Gujarat Primary School Header */}
          <div className="text-center border-b-2 border-slate-800 pb-3 mb-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
              <span>ગુજરાત રાજ્ય શિક્ષણ વિભાગ · સર્વ શિક્ષા અભિયાન (SSA)</span>
              <span>UDISE કોડ: <strong className="text-slate-900 font-mono">{schoolInfo.udiseCode}</strong></span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {schoolInfo.nameGu}
            </h1>
            <p className="text-xs font-medium text-slate-700 mt-0.5">
              ગામ: {schoolInfo.village} · તા. {schoolInfo.taluka} · જિ. {schoolInfo.district}
            </p>

            {/* Sub-header Banner */}
            <div className="mt-2.5 pt-2 border-t border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800 bg-slate-100/90 py-1.5 px-3 rounded-lg print:border print:border-slate-400">
              <div>
                માસ અને વર્ષ: <span className="text-amber-800 font-extrabold">{getGujaratiMonthName(month)} {toGujaratiNum(year)}</span> ({yearStr}-{monthStr})
              </div>
              <div>
                ધોરણ: <span className="font-extrabold">૭ (સાત)</span> · કુલ વિદ્યાર્થીઓ: <span className="font-extrabold">{toGujaratiNum(students.length)}</span> (કુમાર: {toGujaratiNum(catGenderStats.total.kumar)}, કન્યા: {toGujaratiNum(catGenderStats.total.kanya)})
              </div>
              <div>
                સરેરાશ માસિક હાજરી: <span className="font-extrabold text-emerald-800">{monthSummary.overallPercentage}%</span>
              </div>
            </div>
          </div>

          {/* MAIN ATTENDANCE REGISTER MATRIX TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-700 text-center leading-tight">
              <thead>
                {/* Row 1: Day numbers */}
                <tr className="bg-slate-200/90 font-bold border-b border-slate-700 text-slate-900">
                  <th className="border border-slate-700 py-1.5 px-1 w-8 text-center" rowSpan={2}>
                    રોલ
                  </th>
                  <th className="border border-slate-700 py-1.5 px-2 min-w-[130px] text-left" rowSpan={2}>
                    વિદ્યાર્થીનું નામ
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-7 text-center" rowSpan={2}>
                    જાતિ
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-9 text-center" rowSpan={2}>
                    વર્ગ
                  </th>
                  {/* Days 1 to 30/31 */}
                  {daysArray.map((d) => (
                    <th
                      key={d.dayNum}
                      className={`border border-slate-700 px-0.5 py-1 w-6 text-center ${
                        d.isSunday ? 'bg-rose-100 text-rose-900 font-black' : 'bg-slate-100'
                      }`}
                    >
                      {d.dayNum}
                    </th>
                  ))}
                  {/* Summary Totals */}
                  <th className="border border-slate-700 py-1 px-1 w-9 bg-emerald-100 text-emerald-950 font-black" rowSpan={2}>
                    હાજર (P)
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-8 bg-amber-100 text-amber-950 font-black" rowSpan={2}>
                    રજા (L)
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-8 bg-rose-100 text-rose-950 font-black" rowSpan={2}>
                    ગેર. (A)
                  </th>
                  <th className="border border-slate-700 py-1 px-1 w-10 bg-blue-100 text-blue-950 font-black" rowSpan={2}>
                    ટકા (%)
                  </th>
                </tr>

                {/* Row 2: Day of Week initials */}
                <tr className="bg-slate-100 font-semibold border-b-2 border-slate-800 text-[9px] print:text-[8px]">
                  {daysArray.map((d) => (
                    <th
                      key={d.dayNum}
                      className={`border border-slate-700 py-0.5 px-0.5 ${
                        d.isSunday ? 'bg-rose-200 text-rose-900 font-black' : 'text-slate-600'
                      }`}
                    >
                      {d.dayOfWeek.slice(0, 2)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-400 font-medium">
                {studentRows.map((row) => {
                  const isGirl = row.student.gender === 'female';
                  return (
                    <tr
                      key={row.student.id}
                      className={`hover:bg-slate-50 ${
                        row.student.rollNo % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'
                      }`}
                    >
                      {/* Roll No */}
                      <td className="border border-slate-700 py-1 px-0.5 font-bold font-mono">
                        {row.student.rollNo}
                      </td>

                      {/* Name & Photo */}
                      <td className="border border-slate-700 py-1 px-1.5 text-left font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {showPhotos && (
                            <StudentAvatar
                              studentId={row.student.id}
                              photoUrl={row.student.photoUrl}
                              nameGu={row.student.nameGu}
                              gender={row.student.gender}
                              avatarIcon={row.student.avatarIcon}
                              avatarBg={row.student.avatarBg}
                              size="xs"
                              className="w-6 h-6 shrink-0 print:w-5 print:h-5 shadow-2xs border border-slate-300"
                            />
                          )}
                          <div className="truncate max-w-[140px]">
                            <div className="truncate leading-tight font-bold text-slate-900 text-xs print:text-[10px]">
                              {row.student.nameGu}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium truncate leading-tight print:hidden">
                              {row.student.nameEn}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="border border-slate-700 py-1 px-0.5 text-center text-[10px] font-semibold">
                        {isGirl ? 'ક' : 'કુ'}
                      </td>

                      {/* Category */}
                      <td className="border border-slate-700 py-1 px-0.5 text-center text-[9px] font-black">
                        {row.student.category || 'OBC'}
                      </td>

                      {/* Attendance marks for each day */}
                      {row.dayMarks.map((d, idx) => {
                        const isSunday = d.status === 'sunday';
                        const isP = d.status === 'present';
                        const isL = d.status === 'leave';
                        const isA = d.status === 'absent';

                        return (
                          <td
                            key={idx}
                            className={`border border-slate-700 py-0.5 px-0.5 font-bold text-[10px] print:text-[8px] ${
                              isSunday
                                ? 'bg-rose-50 text-rose-600'
                                : isP
                                ? 'text-emerald-700 font-black bg-emerald-50/40'
                                : isL
                                ? 'text-amber-700 font-black bg-amber-50/40'
                                : isA
                                ? 'text-rose-700 font-black'
                                : 'text-slate-300'
                            }`}
                          >
                            {isSunday ? '•' : d.mark}
                          </td>
                        );
                      })}

                      {/* Totals */}
                      <td className="border border-slate-700 py-1 px-1 font-black bg-emerald-50 text-emerald-950">
                        {row.presentCount}
                      </td>
                      <td className="border border-slate-700 py-1 px-1 font-bold bg-amber-50 text-amber-950">
                        {row.leaveCount}
                      </td>
                      <td className="border border-slate-700 py-1 px-1 font-bold bg-rose-50 text-rose-950">
                        {row.absentCount}
                      </td>
                      <td className="border border-slate-700 py-1 px-1 font-black bg-blue-50 text-blue-950">
                        {row.percentage}%
                      </td>
                    </tr>
                  );
                })}

                {/* BOTTOM SUMMARY ROW 1: TOTAL BOYS PRESENT */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-[10px] print:text-[8px]">
                  <td colSpan={4} className="border border-slate-700 py-1 px-2 text-right text-blue-900">
                    હાજર કુમાર (Boys):
                  </td>
                  {dailyTotals.map((tot, idx) => (
                    <td
                      key={idx}
                      className={`border border-slate-700 py-0.5 px-0.5 ${
                        tot.isSunday ? 'bg-rose-100' : 'text-blue-950 font-bold'
                      }`}
                    >
                      {tot.isSunday ? '-' : tot.boysPresent}
                    </td>
                  ))}
                  <td colSpan={4} className="border border-slate-700 bg-slate-200"></td>
                </tr>

                {/* BOTTOM SUMMARY ROW 2: TOTAL GIRLS PRESENT */}
                <tr className="bg-slate-100 font-bold text-[10px] print:text-[8px]">
                  <td colSpan={4} className="border border-slate-700 py-1 px-2 text-right text-pink-900">
                    હાજર કન્યા (Girls):
                  </td>
                  {dailyTotals.map((tot, idx) => (
                    <td
                      key={idx}
                      className={`border border-slate-700 py-0.5 px-0.5 ${
                        tot.isSunday ? 'bg-rose-100' : 'text-pink-950 font-bold'
                      }`}
                    >
                      {tot.isSunday ? '-' : tot.girlsPresent}
                    </td>
                  ))}
                  <td colSpan={4} className="border border-slate-700 bg-slate-200"></td>
                </tr>

                {/* BOTTOM SUMMARY ROW 3: GRAND TOTAL PRESENT */}
                <tr className="bg-slate-200 font-black text-[10px] print:text-[9px]">
                  <td colSpan={4} className="border border-slate-700 py-1 px-2 text-right text-slate-900">
                    કુલ દૈનિક હાજર:
                  </td>
                  {dailyTotals.map((tot, idx) => (
                    <td
                      key={idx}
                      className={`border border-slate-700 py-1 px-0.5 ${
                        tot.isSunday ? 'bg-rose-200 text-rose-900' : 'bg-emerald-100 text-emerald-950 font-black'
                      }`}
                    >
                      {tot.isSunday ? 'રજા' : tot.totalPresent}
                    </td>
                  ))}
                  <td className="border border-slate-700 py-1 px-1 font-black bg-emerald-200 text-emerald-950">
                    {monthSummary.totalPresent}
                  </td>
                  <td className="border border-slate-700 py-1 px-1 font-bold bg-amber-200 text-amber-950">
                    {monthSummary.totalLeave}
                  </td>
                  <td className="border border-slate-700 py-1 px-1 font-bold bg-rose-200 text-rose-950">
                    {monthSummary.totalAbsent}
                  </td>
                  <td className="border border-slate-700 py-1 px-1 font-black bg-blue-200 text-blue-950">
                    {monthSummary.overallPercentage}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LOWER SECTION: CATEGORY MATRIX & OFFICIAL SIGNATURES */}
          <div className="mt-4 pt-4 border-t-2 border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            {/* Category x Gender Breakdown Table */}
            <div>
              <div className="text-xs font-black text-slate-900 mb-1.5 flex items-center gap-1.5">
                <span>સામાજિક વર્ગ અને જાતિ મુજબ આંકડાકીય સારાંશ (Category & Gender Breakdown):</span>
              </div>
              <table className="w-full text-xs border border-slate-700 border-collapse text-center">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-700">
                    <th className="py-1 px-2 border-r border-slate-700 text-left">સામાજિક વર્ગ</th>
                    <th className="py-1 px-2 border-r border-slate-700 text-blue-900">કુમાર</th>
                    <th className="py-1 px-2 border-r border-slate-700 text-pink-900">કન્યા</th>
                    <th className="py-1 px-2 font-black">કુલ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="py-1 px-2 border-r border-slate-700 text-left font-medium">ST (અનુ. જનજાતિ)</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.ST.kumar}</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.ST.kanya}</td>
                    <td className="py-1 px-2 font-black bg-slate-50">{catGenderStats.ST.total}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 border-r border-slate-700 text-left font-medium">SC (અનુ. જાતિ)</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.SC.kumar}</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.SC.kanya}</td>
                    <td className="py-1 px-2 font-black bg-slate-50">{catGenderStats.SC.total}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 border-r border-slate-700 text-left font-medium">OBC (બક્ષીપંચ)</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.OBC.kumar}</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.OBC.kanya}</td>
                    <td className="py-1 px-2 font-black bg-slate-50">{catGenderStats.OBC.total}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-2 border-r border-slate-700 text-left font-medium">Other (સામાન્ય)</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.Other.kumar}</td>
                    <td className="py-1 px-2 border-r border-slate-700 font-bold">{catGenderStats.Other.kanya}</td>
                    <td className="py-1 px-2 font-black bg-slate-50">{catGenderStats.Other.total}</td>
                  </tr>
                  <tr className="bg-slate-200 font-black">
                    <td className="py-1 px-2 border-r border-slate-700 text-left">કુલ વિદ્યાર્થીઓ</td>
                    <td className="py-1 px-2 border-r border-slate-700 text-blue-900">{catGenderStats.total.kumar}</td>
                    <td className="py-1 px-2 border-r border-slate-700 text-pink-900">{catGenderStats.total.kanya}</td>
                    <td className="py-1 px-2 bg-amber-100 font-black">{catGenderStats.total.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures & School Stamp */}
            <div className="flex justify-between items-end pb-2 pt-6 px-4 text-xs font-bold text-slate-800">
              <div className="text-center">
                <div className="w-40 border-b-2 border-slate-700 mb-2"></div>
                <span>વર્ગશિક્ષકની સહી</span>
                <div className="text-[10px] text-slate-500 font-normal">ધોરણ ૭ વર્ગશિક્ષક</div>
              </div>

              <div className="text-center">
                <div className="w-20 h-14 border border-dashed border-slate-400 rounded-lg flex items-center justify-center text-[9px] text-slate-400 mx-auto mb-2">
                  શાળાનો સિક્કો
                </div>
              </div>

              <div className="text-center">
                <div className="w-40 border-b-2 border-slate-700 mb-2"></div>
                <span>આચાર્યશ્રીની સહી & સિક્કો</span>
                <div className="text-[10px] text-slate-500 font-normal">{schoolInfo.nameGu}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
