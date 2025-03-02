import type { Page } from "playwright-core";
import { logger } from "../utils/logger";
import type { CreditDTO } from "../dtos/CreditDTO";
import type { GradeResponseDTO } from "../dtos/GradeResponseDTO";

const CREDIT_HEADERS = {
  "Content-Type": "application/json;charset=UTF-8",
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0",
  Referer:
    "https://info.suwon.ac.kr/websquare/websquare_mobile.html?w2xPath=/views/usw/sa/hj/SA_HJ_1230.xml&menuSeq=3818&progSeq=1117",
};

export async function scrapeCredits(
  page: Page,
  username: string
): Promise<{ creditDTOs: CreditDTO[]; gradeResponse: GradeResponseDTO }> {
  const gradeResponse = await page.request.post("https://info.suwon.ac.kr/smrCretSum/listSmrCretSumTabYearSmrStud.do", {
    headers: CREDIT_HEADERS,
    data: { sno: username },
  });
  logger.info(`Grade response status:${username}`, gradeResponse.status());
  if (!gradeResponse.ok()) {
    logger.error(`Failed to fetch grade info:${username}`, gradeResponse.status());
    throw new Error(`Failed to fetch grade info: ${gradeResponse.status()}`);
  }
  const gradeData = await gradeResponse.json();
  logger.info(`Grade data received:${username}`, JSON.stringify(gradeData, null, 2));
  const creditDTOs: CreditDTO[] = [];
  for (const item of gradeData.listSmrCretSumTabYearSmr || []) {
    const response = await page.request.post("https://info.suwon.ac.kr/cretBas/listSmrCretSumTabSubjt.do", {
      headers: CREDIT_HEADERS,
      data: {
        sno: username,
        cretGainYear: item.cretGainYear,
        cretSmrCd: item.cretSmrCd,
      },
    });
    logger.info(`Credit detail response status:${username}`, response.status());
    const data = await response.json();
    logger.info(`Credit detail data received:${username}`, JSON.stringify(data, null, 2));
    if (!response.ok()) {
      logger.error(`Failed to fetch credit:${username}`, data);
      logger.error(`Failed to fetch detailed credit info:${username}`, response.status());
      throw new Error(`Failed to fetch credit detail info:${username} ${response.status()}`);
    }
    const semesterCredits = (data.listSmrCretSumTabSubjt || []).map((entry: any) => ({
      ...entry,
      cretGainYear: item.cretGainYear, // 상위 항목에서 가져옴
      cretSmrCd: item.cretSmrCd, // 상위 항목에서 가져옴
    }));
    creditDTOs.push(...semesterCredits);
  }
  return { creditDTOs, gradeResponse: gradeData as GradeResponseDTO };
}
