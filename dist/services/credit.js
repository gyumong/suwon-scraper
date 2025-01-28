"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeCredits = scrapeCredits;
async function scrapeCredits(page, username) {
    const headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://info.suwon.ac.kr/websquare/websquare_mobile.html?' +
            'w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117',
    };
    const gradeResponse = await page.request.post('https://info.suwon.ac.kr/smrCretSum/listSmrCretSumTabYearSmrStud.do', {
        headers,
        data: { sno: username },
    });
    const gradeData = await gradeResponse.json();
    const credits = [];
    for (const item of gradeData.listSmrCretSumTabYearSmr || []) {
        const response = await page.request.post('https://info.suwon.ac.kr/cretBas/listSmrCretSumTabSubjt.do', {
            headers,
            data: {
                sno: username,
                cretGainYear: item.cretGainYear,
                cretSmrCd: item.cretSmrCd,
            },
        });
        const data = await response.json();
        const semesterCredits = (data.listSmrCretSumTabSubjt || []).map((entry) => ({
            courseCode: entry.subjtCd,
            courseName: entry.subjtNm,
            credit: parseFloat(entry.cret),
            grade: entry.cretGrade,
            semester: `${item.cretGainYear}-${item.cretSmrCd}`,
        }));
        credits.push(...semesterCredits);
    }
    const academicRecords = processGradeData(gradeData);
    return { credits, academicRecords };
}
function processGradeData(gradeData) {
    const semesters = (gradeData.listSmrCretSumTabYearSmr || []).map((item) => ({
        year: item.cretGainYear,
        semester: item.cretSmrCd,
        averageGrade: parseFloat(item.avgGrade),
        totalCredits: parseInt(item.gainCret, 10),
    }));
    const total = {
        averageGrade: parseFloat(gradeData.totAvgGrade || '0'),
        totalCredits: parseInt(gradeData.totGainCret || '0', 10),
    };
    return { semesters, total };
}
