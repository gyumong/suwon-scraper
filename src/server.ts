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
      let accountLocked = false;
      page.on("dialog", async dialog => {
        if (dialog.type() !== "alert") {
          await dialog.dismiss();
          return;
        }
        const msg = dialog.message();
        logger.info("Dialog message:", msg);
        if (msg.includes("연속 5회 잘못 입력하셨습니다")) {
          accountLocked = true;
          await dialog.dismiss();
        } else if (msg.includes("아이디 또는 비밀번호를 잘못 입력하셨습니다")) {
          loginError = true;
          await dialog.dismiss();
        } else {
          await dialog.dismiss();
        }
      });

      await frame.fill('input[name="userId"]', username);
      await frame.fill('input[name="pwd"]', password);
      await frame.click("button.mainbtn_login");
      await page.waitForTimeout(3000);

      if (loginError) {
        throw new Error("아이디나 비밀번호가 일치하지 않습니다.\n학교 홈페이지에서 확인해주세요.");
      }
      if (accountLocked) {
        throw new Error("계정이 잠겼습니다. 포털사이트로 돌아가서 학번/사번 찾기 및 비밀번호 재발급을 진행해주세요.");
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

// 람다로 옮기고 컨테이너에 올려서 중간에 메세지큐하고 컨슘해서 확인
app.post("/scrape", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "학번/비밀번호가 필요합니다." });
    }

    const result = await withBrowser(async (page: Page) => {
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

      logger.info("학사시스템 페이지 이동 시작");
      await page.goto("https://info.suwon.ac.kr/sso_security_check", { waitUntil: "domcontentloaded" });
      logger.info("학사시스템 페이지 이동 완료");

      const [student, courses, creditResult] = await Promise.all([
        scrapeStudent(page, username),
        scrapeCourses(page, username),
        scrapeCredits(page, username),
      ]);

      const mergedSemesters = mergeCreditCourse(creditResult.creditDTOs, courses);

      return {
        student,
        semesters: mergedSemesters,
        academicRecords: creditResult.gradeResponse,
      };
    });

    res.json(result);
  } catch (error: any) {
    logger.error("Scraping failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
