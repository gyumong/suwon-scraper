// src/dtos/CreditDTO.ts
export interface CreditDTO {
  sno: string; // Student number
  cretGrdCd: string; // Credit grade (e.g., "A+", "B0", etc.)
  gainGpa: number; // GPA for this subject
  subjtNm: string; // Subject name
  estbDpmjNm: string; // Department name offering the subject
  facDvnm: string; // Professor name (or faculty division name)
  gainPoint?: number; // Earned credits
  gainPont: number; // Original score (if applicable)
  subjtCd: string; // Subject code
  cretSmrNm: string; // Semester name (e.g., "2024-2학기")
  totalPoint: number; // Total score (if available)
  cretGainYear: string; // Year part (e.g., "2024")
  cretSmrCd: string; // Semester code (e.g., "10", "15", "20", or "25")
  cltTerrCd?: number; // Optional: normalized area code
  cltTerrNm?: string; // Optional: area name
  cretDelCd?: string; // Optional: retake deletion code
  cretDelNm?: string; // Optional: retake deletion name
}
