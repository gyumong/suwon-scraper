// src/dtos/GradeResponseDTO.ts
export interface SemesterGradeDTO {
  sno: string;
  cretGainYear: string; // Year (e.g., "2024")
  cretSmrCd: string; // Semester code (e.g., "10", "15", etc.)
  gainPoint: number; // Earned credits for the semester
  applPoint: number; // Attempted credits for the semester
  gainAvmk: number; // GPA for the semester
  gainTavgPont: string; // Percentile score for the semester
  dpmjOrdp: string; // Class rank info (e.g., "6/33")
}

export interface TotalGradeDTO {
  gainPoint: string; // Total earned credits
  applPoint: string; // Total attempted credits
  gainAvmk: string; // Cumulative GPA
  gainTavgPont: string; // Overall percentile
}

export interface GradeResponseDTO {
  listSmrCretSumTabYearSmr: SemesterGradeDTO[];
  selectSmrCretSumTabSjTotal: TotalGradeDTO;
}
