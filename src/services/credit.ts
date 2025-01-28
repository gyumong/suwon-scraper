import type { Page } from 'playwright-core';
import type { Credit, ProcessedSemesterGrade, ProcessedTotalGrade } from '../types';
import { logger } from '../utils/logger';
export async function scrapeCredits(page: Page, username: string): Promise<{
  credits: Credit[];
  academicRecords: {
    semesters: ProcessedSemesterGrade[];
    total: ProcessedTotalGrade;
  };
}> {
  const headers = {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0',
    Referer: 'https://info.suwon.ac.kr/websquare/websquare_mobile.html?' +
             'w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117',
  };

  const gradeResponse = await page.request.post(
    'https://info.suwon.ac.kr/smrCretSum/listSmrCretSumTabYearSmrStud.do',
    {
      headers,
      data: { sno: username },
    }
  );
  logger.info('Response status:', gradeResponse.status());
  logger.info('Response data:', await gradeResponse.json());
  if (!gradeResponse.ok()) {
    logger.error('Failed to fetch grade info:', gradeResponse.status());
    throw new Error(`Failed to fetch grade info: ${gradeResponse.status()}`);
  }

  const gradeData = await gradeResponse.json();
  const credits: Credit[] = [];

  for (const item of gradeData.listSmrCretSumTabYearSmr || []) {
    const response = await page.request.post(
      'https://info.suwon.ac.kr/cretBas/listSmrCretSumTabSubjt.do',
      {
        headers,
        data: {
          sno: username,
          cretGainYear: item.cretGainYear,
          cretSmrCd: item.cretSmrCd,
        },
      }
    );

    logger.info('Response status:', response.status());
    logger.info('Response data:', await response.json());
    
    if (!response.ok()) {
      logger.error('Failed to fetch credit info:', response.status());
      throw new Error(`Failed to fetch credit info: ${response.status()}`);
    }

    const data = await response.json();
    const semesterCredits = (data.listSmrCretSumTabSubjt || []).map((entry: any) => ({
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

function processGradeData(gradeData: any) {
  const semesters = (gradeData.listSmrCretSumTabYearSmr || []).map((item: any) => ({
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