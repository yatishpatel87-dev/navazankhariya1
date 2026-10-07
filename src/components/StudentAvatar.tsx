import React, { useState, useEffect } from 'react';
import { PhotoStorage } from '../services/photoStorage';

interface StudentAvatarProps {
  studentId?: string;
  photoUrl?: string;
  nameGu: string;
  gender: 'male' | 'female';
  avatarIcon?: string;
  avatarBg?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  studentId,
  photoUrl,
  nameGu,
  gender,
  avatarIcon = 'boy1',
  avatarBg = '#e0f2fe',
  size = 'lg',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Retrieve effective photo: from prop or directly from permanent storage by studentId
  const effectivePhoto = photoUrl || (studentId ? PhotoStorage.getPhotoSync(studentId) : undefined);

  // Reset image error if effectivePhoto updates
  useEffect(() => {
    setImageError(false);
  }, [effectivePhoto]);

  const sizeClasses = {
    xs: 'w-7 h-7 text-xs rounded-full',
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-3xl',
    '2xl': 'w-40 h-40 text-4xl',
  };

  // If user uploaded a valid photo
  if (effectivePhoto && !imageError) {
    return (
      <div
        className={`relative overflow-hidden shrink-0 shadow-sm border border-slate-200/80 bg-slate-100 flex items-center justify-center ${
          size === 'xs' ? 'rounded-full' : 'rounded-2xl'
        } ${sizeClasses[size]} ${className}`}
      >
        <img
          src={effectivePhoto}
          alt={nameGu}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            // Only set error if not a data URI
            if (!effectivePhoto.startsWith('data:')) {
              setImageError(true);
            }
          }}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Built-in Indian primary school student SVGs
  const isGirl = gender === 'female' || avatarIcon.startsWith('girl');

  return (
    <div
      style={{ backgroundColor: avatarBg }}
      className={`relative rounded-2xl overflow-hidden shrink-0 shadow-sm border border-slate-200/80 flex items-center justify-center transition-transform ${sizeClasses[size]} ${className}`}
      aria-label={nameGu}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-4/5 h-4/5 drop-shadow-sm select-none pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isGirl ? (
          // Indian Schoolgirl with earrings & two neat braided plaits / ribbons
          <g>
            <circle cx="50" cy="98" r="38" fill="#e11d48" />
            <path d="M42 60 L50 75 L58 60 Z" fill="#ffffff" />
            <rect x="44" y="52" width="12" height="15" fill="#fbcfe8" rx="2" />
            <ellipse cx="50" cy="40" rx="22" ry="24" fill="#fbcfe8" />
            <path d="M28 35 C28 20 72 20 72 35 C72 28 65 20 50 20 C35 20 28 28 28 35 Z" fill="#1e1b4b" />
            <path d="M30 36 C35 30 45 28 50 34 C55 28 65 30 70 36 C65 31 56 31 50 36 C44 31 35 31 30 36 Z" fill="#1e1b4b" />
            <circle cx="41" cy="40" r="2.5" fill="#1e1b4b" />
            <circle cx="59" cy="40" r="2.5" fill="#1e1b4b" />
            <circle cx="42" cy="39" r="0.8" fill="#ffffff" />
            <circle cx="60" cy="39" r="0.8" fill="#ffffff" />
            <path d="M44 48 Q50 54 56 48" stroke="#be123c" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="50" cy="36" r="1.5" fill="#dc2626" />
            <circle cx="27" cy="43" r="2" fill="#fbbf24" />
            <circle cx="73" cy="43" r="2" fill="#fbbf24" />
            <path d="M28 42 C20 48 20 65 24 75" stroke="#1e1b4b" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M72 42 C80 48 80 65 76 75" stroke="#1e1b4b" strokeWidth="5.5" strokeLinecap="round" />
            <rect x="21" y="70" width="6" height="4" rx="2" fill="#e11d48" />
            <rect x="73" y="70" width="6" height="4" rx="2" fill="#e11d48" />
          </g>
        ) : (
          // Indian Schoolboy with school uniform collar and necktie
          <g>
            <circle cx="50" cy="98" r="38" fill="#1d4ed8" />
            <path d="M38 60 L50 78 L62 60 Z" fill="#ffffff" />
            <path d="M47 62 L53 62 L52 82 L50 86 L48 82 Z" fill="#dc2626" />
            <rect x="44" y="52" width="12" height="15" fill="#fed7aa" rx="2" />
            <ellipse cx="50" cy="39" rx="21" ry="23" fill="#fed7aa" />
            <path d="M29 34 C29 18 71 18 71 34 C71 25 64 16 50 16 C36 16 29 25 29 34 Z" fill="#1e1b4b" />
            <path d="M30 33 C38 23 46 29 55 24 C62 26 69 31 70 34 C64 27 57 26 51 28 C43 30 37 27 30 33 Z" fill="#1e1b4b" />
            <circle cx="42" cy="40" r="2.5" fill="#1e1b4b" />
            <circle cx="58" cy="40" r="2.5" fill="#1e1b4b" />
            <circle cx="43" cy="39" r="0.8" fill="#ffffff" />
            <circle cx="59" cy="39" r="0.8" fill="#ffffff" />
            <path d="M44 49 Q50 55 56 49" stroke="#9a3412" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="28" cy="40" rx="3" ry="5" fill="#fed7aa" />
            <ellipse cx="72" cy="40" rx="3" ry="5" fill="#fed7aa" />
          </g>
        )}
      </svg>
    </div>
  );
};
