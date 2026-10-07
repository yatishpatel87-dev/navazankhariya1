import { Student } from '../types';

export interface GenderCount {
  kumar: number; // male
  kanya: number; // female
  total: number;
}

export interface CategoryBreakdownStats {
  ST: GenderCount;
  SC: GenderCount;
  OBC: GenderCount;
  Other: GenderCount;
  total: GenderCount;
}

export function calculateCategoryGenderBreakdown(students: Student[]): CategoryBreakdownStats {
  const stats: CategoryBreakdownStats = {
    ST: { kumar: 0, kanya: 0, total: 0 },
    SC: { kumar: 0, kanya: 0, total: 0 },
    OBC: { kumar: 0, kanya: 0, total: 0 },
    Other: { kumar: 0, kanya: 0, total: 0 },
    total: { kumar: 0, kanya: 0, total: 0 },
  };

  students.forEach((student) => {
    const cat = (student.category || 'OBC') as 'ST' | 'SC' | 'OBC' | 'Other';
    const isMale = student.gender === 'male';

    if (stats[cat]) {
      if (isMale) {
        stats[cat].kumar++;
        stats.total.kumar++;
      } else {
        stats[cat].kanya++;
        stats.total.kanya++;
      }
      stats[cat].total++;
      stats.total.total++;
    }
  });

  return stats;
}
