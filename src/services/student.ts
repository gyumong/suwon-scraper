import type { Page } from 'playwright-core';
import type { Student } from '../types';

export async function scrapeStudent(page: Page, username: string): Promise<Student> {
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0',
    Referer: 'https://info.suwon.ac.kr/websquare/websquare_mobile.html?' +
             'w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117',
  };

  const response = await page.request.post(
    'https://info.suwon.ac.kr/scrgBas/selectScrgBas.do',
    {
      headers,
      data: { sno: username },
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to fetch student info: ${response.status()}`);
  }

  const responseData = await response.json();
  const studentInfo = responseData?.studentInfo;

  if (!studentInfo) {
    throw new Error('No studentInfo found in response.');
  }

  return {
    studentNumber: studentInfo.sno,
    name: studentInfo.nm,
    college: studentInfo.colNm,
    department: studentInfo.deptNm,
    major: studentInfo.majorNm,
    studentStatus: studentInfo.studStatNm,
    grade: studentInfo.grade,
    semester: studentInfo.smr,
    admissionYear: studentInfo.entYear,
  };
}