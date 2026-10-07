import React, { useEffect } from 'react';
import { X, CheckCircle2, Sparkles, User, Award, Phone, Lock, Clock, Edit2, Trash2 } from 'lucide-react';
import { Student, AttendanceRecord } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { toGujaratiNum } from '../utils/gujarati';
import { StorageService } from '../services/storage';
import { isLateAttendance } from '../utils/time';

interface PhotoFrame3DPopupProps {
  isOpen: boolean;
  student: Student | null;
  attendanceRecord?: AttendanceRecord;
  lateTimeCutoff?: string;
  onClose: () => void;
  onMarkPresent?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PhotoFrame3DPopup: React.FC<PhotoFrame3DPopupProps> = ({
  isOpen,
  student,
  attendanceRecord,
  lateTimeCutoff = '09:30 AM',
  onClose,
  onMarkPresent,
  onEdit,
  onDelete,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const isPresent = attendanceRecord?.status === 'present';
  const isGirl = student.gender === 'female';

  const categoryNameMap = {
    ST: 'અનુસૂચિત જનજાતિ (ST)',
    SC: 'અનુસૂચિત જાતિ (SC)',
    OBC: 'સામાજિક અને શૈક્ષણિક પછાત વર્ગ (OBC)',
    Other: 'સામાન્ય / અન્ય (Other)',
  };

  const categoryColorMap = {
    ST: 'bg-emerald-100 text-emerald-900 border-emerald-400',
    SC: 'bg-purple-100 text-purple-900 border-purple-400',
    OBC: 'bg-amber-100 text-amber-900 border-amber-400',
    Other: 'bg-blue-100 text-blue-900 border-blue-400',
  };

  const studentCat = student.category || 'OBC';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* 3D POP-UP CONTAINER - Auto Adjustable for any viewport */}
      <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto bg-gradient-to-b from-white via-slate-50 to-slate-100 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.8)] border-4 border-amber-400/90 animate-3d-pop z-10 text-center scrollbar-thin">
        {/* Top Gold Corner Badges */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-900 px-4 py-1 rounded-full text-xs font-black shadow-md border-2 border-white flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-900" />
          <span>ધોરણ ૭ · ૩D ફોટો ફ્રેમ</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-900" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs"
          title="બંધ કરો (Close)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 3D EMBOSSED PHOTO FRAME */}
        <div className="relative mx-auto mt-4 mb-4 w-44 h-44 rounded-3xl p-3 bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 shadow-[0_15px_30px_-5px_rgba(245,158,11,0.4),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(0,0,0,0.2)] flex items-center justify-center">
          {/* Inner metallic bevel */}
          <div className="w-full h-full rounded-2xl bg-white p-1.5 shadow-[inset_0_4px_8px_rgba(0,0,0,0.25)] flex items-center justify-center overflow-hidden relative">
            <StudentAvatar
              studentId={student.id}
              photoUrl={student.photoUrl}
              nameGu={student.nameGu}
              gender={student.gender}
              avatarIcon={student.avatarIcon}
              avatarBg={student.avatarBg}
              size="2xl"
              className="w-full h-full object-cover rounded-xl"
            />

            {/* Glossy reflection slant */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/60 pointer-events-none rounded-xl"></div>

            {/* Present Check Badge overlay */}
            {isPresent && (
              <div className="absolute bottom-1 right-1 bg-emerald-600 text-white rounded-full p-1.5 shadow-lg border-2 border-white animate-cheerful-pop">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        {/* STUDENT DETAILS IN 3D CARD */}
        <div className="space-y-2 mt-2">
          {/* Badges: Roll No & Class */}
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black shadow-xs">
              રોલ નં. {toGujaratiNum(student.rollNo)}
            </span>
            <span className="px-3 py-1 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs">
              ધોરણ {toGujaratiNum(student.standard)} (Std {student.standard})
            </span>
          </div>

          {/* Student Names */}
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {student.nameGu}
          </h3>
          <p className="text-xs font-semibold text-slate-500">
            {student.nameEn}
          </p>

          {/* Gender (Kumar / Kanya) & Category (ST/SC/OBC/Other) Badges */}
          <div className="grid grid-cols-2 gap-2 pt-2 pb-1">
            {/* Gender: Kumar or Kanya */}
            <div
              className={`p-2 rounded-2xl border text-center ${
                isGirl
                  ? 'bg-pink-50 border-pink-300 text-pink-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
              }`}
            >
              <div className="text-[10px] text-slate-500 font-medium">જાતિ (Gender)</div>
              <div className="text-xs font-black flex items-center justify-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5" />
                <span>{isGirl ? 'કન્યા (Girl)' : 'કુમાર (Boy)'}</span>
              </div>
            </div>

            {/* Category: ST, SC, OBC, Other */}
            <div
              className={`p-2 rounded-2xl border text-center ${categoryColorMap[studentCat]}`}
            >
              <div className="text-[10px] opacity-75 font-medium">કેટેગરી (Category)</div>
              <div className="text-xs font-black flex items-center justify-center gap-1 mt-0.5">
                <Award className="w-3.5 h-3.5" />
                <span>{studentCat}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium bg-slate-100/80 px-2.5 py-1 rounded-xl">
            {categoryNameMap[studentCat]}
          </div>

          {student.parentPhone && (
            <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>વાલીનો સંપર્ક: {student.parentPhone}</span>
            </div>
          )}
        </div>

        {/* STATUS & ACTION FOOTER */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          {isPresent ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-emerald-900">
              <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>આજની હાજરી નોંધાઈ ગઈ છે! 🎉</span>
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 py-1 px-2.5 rounded-xl border border-emerald-200">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>હાજરી લોક છે (પુનઃ ફેરફાર થઈ શકશે નહીં)</span>
              </div>
              {isLateAttendance(attendanceRecord?.timestamp, lateTimeCutoff) && (
                <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300/80 py-1 px-2.5 rounded-xl shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>મોડા આવ્યા (Late Arrival: {attendanceRecord?.timestamp})</span>
                </div>
              )}
              <div className="text-[11px] text-emerald-700 mt-1">
                સમય: {attendanceRecord?.timestamp || 'પ્રાતઃ કાળ'} · નવા ઝાંખરીયા પ્રાથમિક શાળા
              </div>
            </div>
          ) : StorageService.isAfter5PM() ? (
            <div className="space-y-1.5 text-center">
              <div className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200 py-2 px-3 rounded-2xl flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>સાંજે ૫:૦૦ વાગ્યા પછી હાજરી બંધ છે (શાળા સમય પૂર્ણ)</span>
              </div>
              <p className="text-[10px] text-slate-500">
                હાજરી સાંજે ૫ વાગ્યે ઓટો રીસેટ થાય છે.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-rose-700 font-semibold bg-rose-50 border border-rose-200 py-1.5 rounded-xl">
                હાલ હાજરી બાકી છે
              </div>
              {onMarkPresent && (
                <button
                  onClick={() => {
                    onMarkPresent();
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>અહીં ક્લિક કરી હાજરી પૂરો</span>
                </button>
              )}
            </div>
          )}

          {/* Teacher Edit & Delete Actions */}
          {(onEdit || onDelete) && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>માહિતી સુધારો (Edit)</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>કાઢી નાખો (Delete)</span>
                </button>
              )}
            </div>
          )}

          {/* Security lock notice */}
          <div className="mt-2.5 py-1.5 px-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <Lock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>પ્રોફાઇલ લૉક: ફેરફાર માત્ર શિક્ષક લૉગિન -&gt; 'સુધારો' માંથી જ શક્ય છે</span>
          </div>
        </div>
      </div>
    </div>
  );
};
