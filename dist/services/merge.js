"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeCreditCourse = mergeCreditCourse;
function mergeCreditCourse(creditData, courseData) {
    const semesterMap = {};
    for (const c of courseData) {
        const semesterKey = c.semester;
        if (!semesterMap[semesterKey]) {
            semesterMap[semesterKey] = {
                semester: semesterKey,
                courses: {},
            };
        }
        semesterMap[semesterKey].courses[c.subjectCode] = { ...c };
    }
    for (const cc of creditData) {
        const semesterKey = cc.semester;
        if (!semesterMap[semesterKey]) {
            semesterMap[semesterKey] = {
                semester: semesterKey,
                courses: {},
            };
        }
        const existing = semesterMap[semesterKey].courses[cc.courseCode];
        if (existing) {
            Object.assign(existing, cc);
        }
        else {
            semesterMap[semesterKey].courses[cc.courseCode] = { ...cc };
        }
    }
    return Object.values(semesterMap).map(sem => ({
        semester: sem.semester,
        courses: Object.values(sem.courses),
    }));
}
