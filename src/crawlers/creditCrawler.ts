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
  try {
    logger.info(`[${username}] 성적 정보 크롤링 시작`);
    const gradeResponse = await page.request.post(
      "https://info.suwon.ac.kr/smrCretSum/listSmrCretSumTabYearSmrStud.do",
      {
        headers: CREDIT_HEADERS,
        data: { sno: username },
      }
    );
    logger.info(`[${username}] 성적 응답 상태: ${gradeResponse.status()}`);

    if (!gradeResponse.ok()) {
      logger.error(`[${username}] 성적 정보 가져오기 실패. 상태: ${gradeResponse.status()}`);
      throw new Error(`Failed to fetch grade info: ${gradeResponse.status()}`);
    }
    const gradeData = await gradeResponse.json();
    logger.info(`[${username}] 성적 데이터 응답:`, JSON.stringify(gradeData, null, 2));

    // 신입생 확인 로직
    const isNewStudent =
      !gradeData.selectSmrCretSumTabSjTotal ||
      !gradeData.listSmrCretSumTabYearSmr ||
      gradeData.listSmrCretSumTabYearSmr.length === 0;

    if (isNewStudent) {
      logger.info(`[${username}] 신입생으로 판단됨: 성적 데이터가 없거나 불완전합니다.`);

      // 신입생용 기본 성적 데이터 구조 생성
      const defaultGradeResponse: GradeResponseDTO = {
        listSmrCretSumTabYearSmr: [],
        selectSmrCretSumTabSjTotal: {
          gainPoint: "0",
          applPoint: "0",
          gainAvmk: "0",
          gainTavgPont: "0",
        },
      };

      // 원본 데이터에서 가능한 정보는 유지
      if (gradeData.listSmrCretSumTabYearSmr && Array.isArray(gradeData.listSmrCretSumTabYearSmr)) {
        defaultGradeResponse.listSmrCretSumTabYearSmr = gradeData.listSmrCretSumTabYearSmr;
      }

      // 빈 결과 반환 (신입생용)
      return {
        creditDTOs: [],
        gradeResponse: defaultGradeResponse,
      };
    }

    // 데이터 구조 검증 로깅
    logger.info(`[${username}] listSmrCretSumTabYearSmr 존재 여부:`, Boolean(gradeData.listSmrCretSumTabYearSmr));
    logger.info(`[${username}] selectSmrCretSumTabSjTotal 존재 여부:`, Boolean(gradeData.selectSmrCretSumTabSjTotal));

    // selectSmrCretSumTabSjTotal이 null인 경우 기본값 설정
    if (!gradeData.selectSmrCretSumTabSjTotal) {
      logger.info(`[${username}] selectSmrCretSumTabSjTotal이 null입니다. 기본값으로 설정합니다.`);
      gradeData.selectSmrCretSumTabSjTotal = {
        gainPoint: "0",
        applPoint: "0",
        gainAvmk: "0",
        gainTavgPont: "0",
      };
    } else {
      logger.info(`[${username}] 총 성적 데이터:`, JSON.stringify(gradeData.selectSmrCretSumTabSjTotal, null, 2));

      // gainPoint가 null인 경우 "0"으로 설정
      if (
        gradeData.selectSmrCretSumTabSjTotal.gainPoint === null ||
        gradeData.selectSmrCretSumTabSjTotal.gainPoint === undefined
      ) {
        logger.info(`[${username}] gainPoint가 null 또는 undefined입니다. "0"으로 설정합니다.`);
        gradeData.selectSmrCretSumTabSjTotal.gainPoint = "0";
      }
    }

    // listSmrCretSumTabYearSmr가 null이거나 배열이 아닌 경우 빈 배열로 설정
    if (!gradeData.listSmrCretSumTabYearSmr || !Array.isArray(gradeData.listSmrCretSumTabYearSmr)) {
      logger.info(`[${username}] listSmrCretSumTabYearSmr가 배열이 아니거나 null입니다. 빈 배열로 설정합니다.`);
      gradeData.listSmrCretSumTabYearSmr = [];
      return { creditDTOs: [], gradeResponse: gradeData as GradeResponseDTO };
    }

    logger.info(`[${username}] ${gradeData.listSmrCretSumTabYearSmr.length}개 학기 처리 중`);

    const creditDTOs: CreditDTO[] = [];
    for (const item of gradeData.listSmrCretSumTabYearSmr) {
      logger.info(`[${username}] 학기 처리 중: 년도=${item.cretGainYear}, 학기=${item.cretSmrCd}`);
      try {
        const response = await page.request.post("https://info.suwon.ac.kr/cretBas/listSmrCretSumTabSubjt.do", {
          headers: CREDIT_HEADERS,
          data: {
            sno: username,
            cretGainYear: item.cretGainYear,
            cretSmrCd: item.cretSmrCd,
          },
        });

        logger.info(`[${username}] 학점 상세 응답 상태:`, response.status());

        if (!response.ok()) {
          logger.error(`[${username}] 상세 학점 정보 가져오기 실패. 상태:`, response.status());
          continue; // 이 학기는 건너뛰고 다음 학기로 진행
        }

        const data = await response.json();
        logger.info(
          `[${username}] ${item.cretGainYear}-${item.cretSmrCd} 학기 학점 상세 데이터:`,
          JSON.stringify(data, null, 2)
        );

        if (!data.listSmrCretSumTabSubjt) {
          logger.info(`[${username}] ${item.cretGainYear}-${item.cretSmrCd} 학기에 학점 상세 정보가 없습니다`);
          continue;
        }

        const semesterCredits = data.listSmrCretSumTabSubjt.map((entry: any) => ({
          ...entry,
          cretGainYear: item.cretGainYear,
          cretSmrCd: item.cretSmrCd,
        }));

        logger.info(
          `[${username}] ${item.cretGainYear}-${item.cretSmrCd} 학기에 ${semesterCredits.length}개 과목 추가됨`
        );
        creditDTOs.push(...semesterCredits);
      } catch (error) {
        logger.error(`[${username}] ${item.cretGainYear}-${item.cretSmrCd} 학기 처리 중 오류:`, error);
        // 개별 학기 처리 오류는 전체 프로세스를 중단하지 않고 계속 진행
      }
    }
    logger.info(`[${username}] 총 ${creditDTOs.length}개 과목 처리 완료`);
    return { creditDTOs, gradeResponse: gradeData as GradeResponseDTO };
  } catch (error) {
    logger.error(`[${username}] scrapeCredits 함수에서 오류 발생:`, error);
    throw error;
  }
}
