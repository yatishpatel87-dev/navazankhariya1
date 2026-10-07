import React, { useState } from 'react';
import { Lock, Delete, X, AlertCircle } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
  soundEnabled: boolean;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin,
  soundEnabled,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (soundEnabled) soundEffects.playTap();
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          if (soundEnabled) soundEffects.playUnlock();
          setTimeout(() => {
            onSuccess();
            setPin('');
          }, 150);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    if (soundEnabled) soundEffects.playTap();
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    if (soundEnabled) soundEffects.playTap();
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 scrollbar-thin">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon & Title */}
        <div className="text-center pt-2 pb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            શિક્ષક ડેશબોર્ડ લોગિન
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Teacher Dashboard Access (PIN)
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 scale-110 animate-bounce'
                    : isFilled
                    ? 'bg-indigo-600 scale-110'
                    : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-600 mb-3 animate-pulse">
            <AlertCircle className="w-4 h-4" />
            <span>ખોટો પિન! ફરીથી પ્રયાસ કરો (Incorrect PIN)</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-semibold transition-colors flex items-center justify-center shadow-xs border border-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 text-xs font-medium transition-colors flex items-center justify-center border border-slate-100"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-semibold transition-colors flex items-center justify-center shadow-xs border border-slate-100"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center border border-slate-100"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Default hint for user */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            પ્રથમ ઉપયોગ માટે ડિફોલ્ટ પિન:{' '}
            <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
              {correctPin}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
