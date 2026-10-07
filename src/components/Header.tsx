import React, { useState, useEffect } from 'react';
import { Lock, Unlock, GraduationCap, Camera, ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { SchoolInfo } from '../types';
import { toGujaratiNum } from '../utils/gujarati';

interface HeaderProps {
  schoolInfo: SchoolInfo;
  studentsCount?: number;
  currentMode: 'student' | 'teacher';
  isTeacherAuthenticated: boolean;
  onOpenTeacherLogin: () => void;
  onGoToStudentMode: () => void;
  onLockOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  schoolInfo,
  studentsCount = 43,
  currentMode,
  isTeacherAuthenticated,
  onOpenTeacherLogin,
  onGoToStudentMode,
  onLockOut,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('gu-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95">
      <div className="max-w-[1700px] w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* School Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight block truncate">
                {schoolInfo.nameGu}
              </h1>
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                ધોરણ ૭ (કુલ {toGujaratiNum(studentsCount)} વિદ્યાર્થીઓ)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {schoolInfo.nameEn} · Std 7 · {schoolInfo.taluka}, {schoolInfo.district}
            </p>
          </div>
        </div>

        {/* Right Action: Depending on Mode */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Live Clock Display */}
          <div className="hidden md:flex items-center text-xs font-mono font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            {currentTime}
          </div>

          {/* Fullscreen Auto-Adjust Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
            title={isFullscreen ? 'સામાન્ય સ્ક્રીન (Exit Fullscreen)' : 'ફુલ સ્ક્રીન / ઓટો એડજસ્ટ (Fullscreen Fit)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden sm:inline text-[11px]">
              {isFullscreen ? 'સામાન્ય' : 'ફુલ સ્ક્રીન'}
            </span>
          </button>

          {currentMode === 'student' ? (
            /* Teacher Access Lock Button */
            <button
              onClick={onOpenTeacherLogin}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 transition-all flex items-center gap-2 active:scale-95 shadow-2xs"
              title="શિક્ષક લૉગિન (Teacher Dashboard)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>શિક્ષક લૉગિન</span>
            </button>
          ) : (
            /* When inside Teacher Dashboard */
            <div className="flex items-center gap-2">
              <button
                onClick={onGoToStudentMode}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center gap-1.5 shadow-xs"
                title="વિદ્યાર્થી ફોટો હાજરી પેજ પર પાછા જાઓ"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ફોટો હાજરી પેજ</span>
              </button>

              <button
                onClick={onLockOut}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1.5"
                title="ડેશબોર્ડ લૉક કરો"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">લૉક કરો</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
