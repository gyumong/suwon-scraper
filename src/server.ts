import express from 'express';
import cors from 'cors';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import { scrapeCourses } from './services/course';
import { scrapeCredits } from './services/credit';
import { scrapeStudent } from './services/student';
import { mergeCreditCourse } from './services/merge';
import { logger } from './utils/logger';

const app = express();
app.use(cors());
app.use(express.json());

// 로그인 확인용 엔드포인트
app.post('/auth', async (req, res) => {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let loginError = false;

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '학번/비밀번호가 필요합니다.' });
    }

    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    
    context = await browser.newContext();
    page = await context.newPage();

    // 로그인 시도
    await page.goto('https://portal.suwon.ac.kr/enview/index.html');
    const frame = page.frame({ name: 'mainFrame' });
    if (!frame) throw new Error('mainFrame을 찾을 수 없습니다.');

    // 로그인 실패 감지
    page.on('dialog', async dialog => {
      logger.info('Dialog message:', dialog.message());
      if (dialog.message().includes('비밀번호를 잘못 입력')) {
        loginError = true;
      }
      await dialog.dismiss();
    });

    await frame.fill('input[name="userId"]', username);
    await frame.fill('input[name="pwd"]', password);
    await frame.click('button.mainbtn_login');
    await page.waitForTimeout(3000);

    if (loginError) {
      return res.status(401).json({ 
        error: '아이디나 비밀번호가 일치하지 않습니다.\n학교 홈페이지에서 확인해주세요.' 
      });
    }

    res.json({ success: true, message: '로그인 성공' });

  } catch (error: any) {
    logger.error('Login failed:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (page) await page.close().catch(e => logger.error('Error closing page:', e));
    if (context) await context.close().catch(e => logger.error('Error closing context:', e));
    if (browser) await browser.close().catch(e => logger.error('Error closing browser:', e));
  }
});

// 데이터 스크래핑용 엔드포인트
app.post('/scrape', async (req, res) => {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '학번/비밀번호가 필요합니다.' });
    }

    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    
    context = await browser.newContext();
    page = await context.newPage();

    // 로그인
    await page.goto('https://portal.suwon.ac.kr/enview/index.html');
    const frame = page.frame({ name: 'mainFrame' });
    if (!frame) throw new Error('mainFrame을 찾을 수 없습니다.');

    await frame.fill('input[name="userId"]', username);
    await frame.fill('input[name="pwd"]', password);
    await frame.click('button.mainbtn_login');
    await page.waitForTimeout(3000);

    // 데이터 스크래핑
    if (!page) throw new Error('Page is null');
    const [student, courses, creditResult] = await Promise.all([
      scrapeStudent(page, username),
      scrapeCourses(page, username),
      scrapeCredits(page, username)
    ]);

    // 데이터 병합
    const mergedSemesters = mergeCreditCourse(creditResult.credits, courses);

    res.json({
      student,
      semesters: mergedSemesters,
      academicRecords: creditResult.academicRecords
    });

  } catch (error: any) {
    logger.error('Scraping failed:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (page) await page.close().catch(e => logger.error('Error closing page:', e));
    if (context) await context.close().catch(e => logger.error('Error closing context:', e));
    if (browser) await browser.close().catch(e => logger.error('Error closing browser:', e));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});