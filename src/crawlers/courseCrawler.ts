import type { Page } from "playwright-core";
import type { CourseDTO } from "../dtos/CourseDTO";
import { logger } from "../utils/logger";

const COURSE_HEADERS = {
  "Content-Type": "application/json;charset=UTF-8",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0",
  Referer:
    "https://info.suwon.ac.kr/websquare/websquare_mobile.html?w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117",
};

export async function scrapeCourses(page: Page, username: string): Promise<CourseDTO[]> {
  const response = await page.request.post("https://info.suwon.ac.kr/atlecApplDtai/listAtlecApplDtaiTabYearSmr.do", {
    headers: COURSE_HEADERS,
    data: { sno: username },
  });
  logger.info("Course list response status:", response.status());
  if (!response.ok()) {
    logger.error("Failed to fetch course list. Status:", response.status());
    throw new Error(`Failed to fetch course list: ${response.status()}`);
  }
  const data1 = await response.json();
  const detailedDTOs: CourseDTO[] = [];
  for (const info of data1.listAtlecApplDtaiTabYearSmr || []) {
    const response2 = await page.request.post("https://info.suwon.ac.kr/atlecApplDtai/listAtlecApplDtaiTabSubjt.do", {
      headers: COURSE_HEADERS,
      data: {
        sno: username,
        subjtEstbYear: info.subjtEstbYear,
        subjtEstbSmrCd: info.subjtEstbSmrCd,
      },
    });
    if (!response2.ok()) {
      logger.error("Failed to fetch course details. Status:", response2.status());
      throw new Error(`Failed to fetch course details: ${response2.status()}`);
    }
    const data2 = await response2.json();
    detailedDTOs.push(...(data2.listAtlecApplDtaiTabSubjt || []));
  }
  return detailedDTOs;
}
