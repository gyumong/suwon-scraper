export interface Student {
    studentNumber: string;
    name: string;
    college: string;
    department: string;
    major: string;
    studentStatus: string;
    grade: string;
    semester: string;
    admissionYear: string;
  }
  
  export interface Credit {
    courseCode: string;
    courseName: string;
    credit: number;
    grade: string;
    semester: string;
  }
  
  export interface Course {
    subjectCode: string;
    subjectName: string;
    semester: string;
    subjectEstablishmentYear: string;
    subjectEstablishmentSemesterCode: string;
  }
  
  export interface MergedSemester {
    semester: string;
    courses: Array<Credit & Partial<Course>>;
  }
  
  export interface ProcessedSemesterGrade {
    year: string;
    semester: string;
    averageGrade: number;
    totalCredits: number;
  }
  
  export interface ProcessedTotalGrade {
    averageGrade: number;
    totalCredits: number;
  }