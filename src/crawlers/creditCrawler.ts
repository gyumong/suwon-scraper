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
  logger.info("Grade response status:", gradeResponse.status());
  if (!gradeResponse.ok()) {
    logger.error("Failed to fetch grade info. Status:", gradeResponse.status());
    throw new Error(`Failed to fetch grade info: ${gradeResponse.status()}`);
  }
  const gradeData = await gradeResponse.json();
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
    logger.info("Credit detail response status:", response.status());
    if (!response.ok()) {
      logger.error("Failed to fetch detailed credit info. Status:", response.status());
      throw new Error(`Failed to fetch credit detail info: ${response.status()}`);
    }
    const data = await response.json();
    const semesterCredits = (data.listSmrCretSumTabSubjt || []).map((entry: any) => ({
      ...entry,
      cretGainYear: item.cretGainYear,
      cretSmrCd: item.cretSmrCd,
      semester: `${item.cretGainYear}-${item.cretSmrCd}`,
    }));
    creditDTOs.push(...semesterCredits);
  }

  return { creditDTOs, gradeResponse: gradeData as GradeResponseDTO };
}
