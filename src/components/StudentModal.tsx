import React, { useState, useEffect } from 'react';
import { X, Upload, Camera, Check, Lock } from 'lucide-react';
import { Student, StudentCategory } from '../types';
import { StudentAvatar } from './StudentAvatar';
import { StorageService } from '../services/storage';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id'>, id?: string) => void;
  initialData?: Student | null;
  defaultStandard?: number;
  nextRollNo?: number;
}

const AVATAR_OPTIONS = [
  { icon: 'boy1', bg: '#dbeafe', gender: 'male' as const, label: 'Boy 1' },
  { icon: 'boy2', bg: '#fef3c7', gender: 'male' as const, label: 'Boy 2' },
  { icon: 'boy3', bg: '#d1fae5', gender: 'male' as const, label: 'Boy 3' },
  { icon: 'girl1', bg: '#fce7f3', gender: 'female' as const, label: 'Girl 1' },
  { icon: 'girl2', bg: '#ede9fe', gender: 'female' as const, label: 'Girl 2' },
  { icon: 'girl3', bg: '#ffedd5', gender: 'female' as const, label: 'Girl 3' },
];

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultStandard = 7,
  nextRollNo,
}) => {
  const [rollNo, setRollNo] = useState<number>(nextRollNo || 1);
  const [nameGu, setNameGu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [standard, setStandard] = useState<number>(defaultStandard);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [category, setCategory] = useState<StudentCategory>('OBC');
  const [parentPhone, setParentPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [avatarBg, setAvatarBg] = useState('#dbeafe');
  const [avatarIcon, setAvatarIcon] = useState('boy1');

  useEffect(() => {
    if (initialData) {
      setRollNo(initialData.rollNo);
      setNameGu(initialData.nameGu);
      setNameEn(initialData.nameEn);
      setStandard(initialData.standard);
      setGender(initialData.gender);
      setCategory(initialData.category || 'OBC');
      setParentPhone(initialData.parentPhone || '');
      const lockedPhoto = initialData.photoUrl || StorageService.getStudentPhoto(initialData.id) || '';
      setPhotoUrl(lockedPhoto);
      setAvatarBg(initialData.avatarBg || '#dbeafe');
      setAvatarIcon(initialData.avatarIcon || 'boy1');
    } else {
      setRollNo(nextRollNo || 1);
      setNameGu('');
      setNameEn('');
      setStandard(defaultStandard);
      setGender('male');
      setCategory('OBC');
      setParentPhone('');
      setPhotoUrl('');
      setAvatarBg('#dbeafe');
      setAvatarIcon('boy1');
    }
  }, [initialData, defaultStandard, nextRollNo, isOpen]);

  if (!isOpen) return null;

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 360;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result as string);
        fr.readAsDataURL(file);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploadingPhoto(true);
        const compressedUrl = await compressImageFile(file);
        setPhotoUrl(compressedUrl);
      } catch (err) {
        console.error('Error compressing image', err);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameGu.trim()) return;

    onSave(
      {
        rollNo: Number(rollNo) || 1,
        nameGu: nameGu.trim(),
        nameEn: nameEn.trim() || nameGu.trim(),
        standard: Number(standard) || 7,
        gender,
        category,
        parentPhone: parentPhone.trim(),
        photoUrl: photoUrl || undefined,
        avatarBg,
        avatarIcon,
      },
      initialData?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-xl border border-slate-100 p-5 sm:p-6 my-auto scrollbar-thin">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {initialData ? 'વિદ્યાર્થીની માહિતી અને ફોટો સુધારો' : 'નવો વિદ્યાર્થી ઉમેરો'}
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          {initialData
            ? 'અહીં ઉમેરેલી કે સુધારેલી તમામ માહિતી (નામ, ફોટો, કેટેગરી, રોલ નં.) કાયમ માટે લૉક રહેશે અને ક્યારેય બદલાશે નહીં.'
            : 'નવા બાળકની ઉમેરેલી તમામ માહિતી અને ફોટો કાયમ માટે હાજરી પત્રકમાં સુરક્ષિત રહેશે.'}
        </p>

        {initialData && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-xs font-bold text-amber-950 mb-4 shadow-2xs">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              લૉક કરેલ પ્રોફાઇલ: બાળકની માહિતી માત્ર અહીં 'સુધારો' (Edit) માંથી જ બદલી શકાશે.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Preview & Photo Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
            <StudentAvatar
              photoUrl={photoUrl}
              nameGu={nameGu || 'વિદ્યાર્થી'}
              gender={gender}
              avatarIcon={avatarIcon}
              avatarBg={avatarBg}
              size="lg"
            />
            <div className="flex-1 text-center sm:text-left space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                વિદ્યાર્થીનો ફોટો (Student Profile Photo)
              </span>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isUploadingPhoto ? 'તૈયાર થાય છે...' : 'ફોટો અપલોડ કરો'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {/* Camera capture option for mobile/tablet */}
                <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>કેમેરાથી લો</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    ફોટો હટાવો
                  </button>
                )}
              </div>
              {photoUrl ? (
                <div className="space-y-0.5">
                  <p className="text-[11px] text-emerald-800 font-extrabold flex items-center justify-center sm:justify-start gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>અપલોડ કરેલો ફોટો સફળતાપૂર્વક સેટ થયો છે ✓</span>
                  </p>
                  <p className="text-[10px] text-amber-900 font-semibold flex items-center justify-center sm:justify-start gap-1 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/80">
                    <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                    <span>કાયમી લોક: આ ફોટો હાજરી પત્રક અને રજિસ્ટરમાં ક્યારેય બદલાશે નહીં</span>
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500">
                  અથવા નીચે આપેલા કાર્ટૂન અવતારમાંથી પસંદ કરો
                </p>
              )}
            </div>
          </div>

          {/* Quick Avatar selection if no custom photo */}
          {!photoUrl && (
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                ડિફોલ્ટ અવતાર પસંદ કરો (Select Avatar):
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.icon}
                    type="button"
                    onClick={() => {
                      setAvatarIcon(opt.icon);
                      setAvatarBg(opt.bg);
                      setGender(opt.gender);
                    }}
                    className={`p-1 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      avatarIcon === opt.icon
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <StudentAvatar
                      nameGu={opt.label}
                      gender={opt.gender}
                      avatarIcon={opt.icon}
                      avatarBg={opt.bg}
                      size="sm"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row: Standard & Roll No */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                ધોરણ (Standard) *
              </label>
              <select
                value={standard}
                onChange={(e) => setStandard(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((std) => (
                  <option key={std} value={std}>
                    ધોરણ {std} (Std {std})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                રોલ નંબર (Roll No) *
              </label>
              <input
                type="number"
                min="1"
                max="99"
                required
                value={rollNo}
                onChange={(e) => setRollNo(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Gujarati Name & English Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                વિદ્યાર્થીનું નામ (ગુજરાતીમાં) *
              </label>
              <input
                type="text"
                placeholder="દા.ત. આર્યન પટેલ"
                required
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                નામ (અંગ્રેજીમાં)
              </label>
              <input
                type="text"
                placeholder="e.g. Aryan Patel"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Gender & Parent Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                જાતિ (Gender) *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    gender === 'male'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold ring-2 ring-blue-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  કુમાર (Boy)
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                    gender === 'female'
                      ? 'bg-pink-50 border-pink-400 text-pink-900 font-bold ring-2 ring-pink-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  કન્યા (Girl)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                વાલીનો મોબાઈલ (Parent Mobile)
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Caste Category: ST, SC, OBC, Other */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
              <span>સામાજિક વર્ગ / જાતિ કેટેગરી (Category) *</span>
              <span className="text-[11px] font-normal text-slate-500">ST, SC, OBC, Other</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  {
                    key: 'ST',
                    name: 'ST',
                    desc: 'અનુ. જનજાતિ',
                    activeStyle: 'bg-emerald-100 border-emerald-500 text-emerald-900 ring-2 ring-emerald-300 font-black',
                  },
                  {
                    key: 'SC',
                    name: 'SC',
                    desc: 'અનુ. જાતિ',
                    activeStyle: 'bg-purple-100 border-purple-500 text-purple-900 ring-2 ring-purple-300 font-black',
                  },
                  {
                    key: 'OBC',
                    name: 'OBC',
                    desc: 'સા. શૈ. પછાત',
                    activeStyle: 'bg-amber-100 border-amber-500 text-amber-900 ring-2 ring-amber-300 font-black',
                  },
                  {
                    key: 'Other',
                    name: 'Other',
                    desc: 'સામાન્ય / અન્ય',
                    activeStyle: 'bg-blue-100 border-blue-500 text-blue-900 ring-2 ring-blue-300 font-black',
                  },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key as StudentCategory)}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                    category === cat.key
                      ? `${cat.activeStyle} shadow-xs`
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-extrabold">{cat.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              રદ કરો (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialData ? 'માહિતી સાચવો (Update)' : 'વિદ્યાર્થી ઉમેરો (Save)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
