import type { Page } from 'playwright-core';
import type { Course } from '../types';
import { logger } from '../utils/logger';
export async function scrapeCourses(page: Page, username: string): Promise<Course[]> {
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0',
    Referer: 'https://info.suwon.ac.kr/websquare/websquare_mobile.html?' +
             'w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117',
  };

  const response1 = await page.request.post(
    'https://info.suwon.ac.kr/atlecApplDtai/listAtlecApplDtaiTabYearSmr.do',
    {
      headers,
      data: { sno: username },
    }
  );
  logger.info('Response status:', response1.status());
  if (!response1.ok()) {
    logger.error('Failed to fetch course info:', response1.status());
    throw new Error(`Failed to fetch course info: ${response1.status()}`);
  }

  const data1 = await response1.json();
  const courses: Course[] = [];

  for (const info of data1.listAtlecApplDtaiTabYearSmr || []) {
    const response2 = await page.request.post(
      'https://info.suwon.ac.kr/atlecApplDtai/listAtlecApplDtaiTabSubjt.do',
      {
        headers,
        data: {
          sno: username,
          subjtEstbYear: info.subjtEstbYear,
          subjtEstbSmrCd: info.subjtEstbSmrCd,
        },
      }
    );
    logger.info('Response status:', response2.status());
    if (!response2.ok()) {
      logger.error('Failed to fetch course info:', response2.status());
      throw new Error(`Failed to fetch course info: ${response2.status()}`);
    }

    const data2 = await response2.json();
    const semesterCourses = (data2.listAtlecApplDtaiTabSubjt || []).map((item: any) => ({
      subjectCode: item.subjtCd,
      subjectName: item.subjtNm,
      semester: `${info.subjtEstbYear}-${info.subjtEstbSmrCd}`,
      subjectEstablishmentYear: info.subjtEstbYear,
      subjectEstablishmentSemesterCode: info.subjtEstbSmrCd,
    }));

    logger.info('Semester courses:', semesterCourses);
    courses.push(...semesterCourses);
  }

  return courses;
}