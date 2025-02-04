import express from "express";
import cors from "cors";
import { chromium, Browser, BrowserContext, Page } from "playwright-core";
import { mergeCreditCourse } from "./services/merge";
import { logger } from "./utils/logger";
import { scrapeStudent } from "./crawlers/studentCrawler";
import { scrapeCourses } from "./crawlers/courseCrawler";
import { scrapeCredits } from "./crawlers/creditCrawler";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * withBrowser: 크롤링 작업 시 브라우저, 컨텍스트, 페이지를 생성하고 종료하는 헬퍼 함수
 */
async function withBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
    context = await browser.newContext();
    page = await context.newPage();
    return await fn(page);
  } finally {
    if (page) await page.close().catch(e => logger.error("Error closing page:", e));
    if (context) await context.close().catch(e => logger.error("Error closing context:", e));
    if (browser) await browser.close().catch(e => logger.error("Error closing browser:", e));
  }
}

/**
 * /auth 엔드포인트: 로그인 확인용 API
 */
app.post("/auth", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "학번/비밀번호가 필요합니다." });
    }

    await withBrowser(async (page: Page) => {
      await page.goto("https://portal.suwon.ac.kr/enview/index.html");
      const frame = page.frame({ name: "mainFrame" });
      if (!frame) throw new Error("mainFrame을 찾을 수 없습니다.");

      let loginError = false;
      page.on("dialog", async dialog => {
        logger.info("Dialog message:", dialog.message());
        if (dialog.message().includes("비밀번호를 잘못 입력")) {
          loginError = true;
        }
        await dialog.dismiss();
      });

      await frame.fill('input[name="userId"]', username);
      await frame.fill('input[name="pwd"]', password);
      await frame.click("button.mainbtn_login");
      await page.waitForTimeout(3000);

      if (loginError) {
        throw new Error("아이디나 비밀번호가 일치하지 않습니다.\n학교 홈페이지에서 확인해주세요.");
      }
    });

    res.json({ success: true, message: "로그인 성공" });
  } catch (error: any) {
    logger.error("Login failed:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * /scrape 엔드포인트: 데이터 크롤링 및 병합 API
 */
app.post("/scrape", async (req, res) => {
  const browser = await chromium.launch({ headless: true });
  let loginError = false;
  try {
    const page = await browser.newPage();
    // alert 또는 confirm, prompt가 발생했을 때 이벤트로 감지
    page.on("dialog", async dialog => {
      if (dialog.type() === "alert") {
        const msg = dialog.message();
        // 로그인 실패 시 뜨는 "아이디 또는 비밀번호를 잘못 입력하셨습니다." 등 문구 확인
        if (msg.includes("아이디 또는 비밀번호를 잘못 입력하셨습니다")) {
          //  dialog 이벤트 핸들러는 비동기로 동작합니다. 이 핸들러 내부에서 throw된 에러는 Playwright의 이벤트 처리 체계에 따라 처리되므로, 호출 스택에 다시 반영되지 않습니다. 그래서 아래와 같이 처리했습니다.
          loginError = true;
          await dialog.dismiss();
          return;
        } else {
          await dialog.dismiss();
        }
      }
    });

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "학번/비밀번호가 필요합니다." });
    }

    // 로그인 공통 로직
    await page.goto("https://portal.suwon.ac.kr/enview/index.html", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    const frame = page.frame({ name: "mainFrame" });
    if (!frame) throw new Error("mainFrame을 찾을 수 없습니다.");

    await frame.fill('input[name="userId"]', username);
    await frame.fill('input[name="pwd"]', password);
    await frame.click("button.mainbtn_login");
    await page.waitForTimeout(3000);

    if (loginError) {
      throw new Error("아이디나 비밀번호가 일치하지 않습니다.\n학교 홈페이지에서 확인해주세요.");
    }

    // 로그인 성공한 경우 → 학사시스템 페이지 이동
    await page.goto("https://info.suwon.ac.kr/sso_security_check", { waitUntil: "domcontentloaded" });

    // 병렬 크롤링: 학생 정보, 수강 내역, 성적 정보
    const [student, courses, creditResult] = await Promise.all([
      scrapeStudent(page, username),
      scrapeCourses(page, username),
      scrapeCredits(page, username),
    ]);

    // DTO 데이터 병합: 학기별로 성적과 수강 내역을 병합하여 MergedSemester 배열 생성
    const mergedSemesters = mergeCreditCourse(creditResult.creditDTOs, courses);

    res.json({
      student,
      semesters: mergedSemesters,
      academicRecords: creditResult.gradeResponse,
    });
  } catch (error: any) {
    logger.error("Scraping failed:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
