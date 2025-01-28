import type { Page } from 'playwright-core';
import type { Student } from '../types';
import { logger } from '../utils/logger';

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
  logger.info('Response status:', response.status());
  if (!response.ok()) {
    logger.error('Failed to fetch student info:', response.status());
    throw new Error(`Failed to fetch student info: ${response.status()}`);
  }

  const responseData = await response.json();
  logger.info('Response data structure:', {
    hasStudentInfo: !!responseData?.studentInfo,
    keys: Object.keys(responseData || {})
  });
  const studentInfo = responseData?.studentInfo;

  if (!studentInfo) {
    logger.error('No studentInfo found in response:', responseData);
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