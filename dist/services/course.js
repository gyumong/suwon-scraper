"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeCourses = scrapeCourses;
async function scrapeCourses(page, username) {
    const headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://info.suwon.ac.kr/websquare/websquare_mobile.html?' +
            'w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117',
    };
    const response1 = await page.request.post('https://info.suwon.ac.kr/atlecApplDtai/listAtlecApplDtaiTabYearSmr.do', {
        headers,
        data: { sno: username },
    });
    const data1 = await response1.json();
    const courses = [];
    for (const info of data1.listAtlecApplDtaiTabYearSmr || []) {
        const response2 = await page.request.post('https://info.suwon.ac.kr/atlecApplDtai/listAtlecApplDtaiTabSubjt.do', {
            headers,
            data: {
                sno: username,
                subjtEstbYear: info.subjtEstbYear,
                subjtEstbSmrCd: info.subjtEstbSmrCd,
            },
        });
        const data2 = await response2.json();
        const semesterCourses = (data2.listAtlecApplDtaiTabSubjt || []).map((item) => ({
            subjectCode: item.subjtCd,
            subjectName: item.subjtNm,
            semester: `${info.subjtEstbYear}-${info.subjtEstbSmrCd}`,
            subjectEstablishmentYear: info.subjtEstbYear,
            subjectEstablishmentSemesterCode: info.subjtEstbSmrCd,
        }));
        courses.push(...semesterCourses);
    }
    return courses;
}
//# sourceMappingURL=course.js.map