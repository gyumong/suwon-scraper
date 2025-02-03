import { CourseDTO } from "./CourseDTO";
import { CreditDTO } from "./CreditDTO";

export interface MergedSemesterDTO {
  semester: string; // 예: "2024-20"
  courses: MergedSemesterCourseDTO[];
}

export type MergedSemesterCourseDTO = Partial<CreditDTO> & Partial<CourseDTO>;
