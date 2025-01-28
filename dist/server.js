"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const playwright_core_1 = require("playwright-core");
const course_1 = require("./services/course");
const credit_1 = require("./services/credit");
const student_1 = require("./services/student");
const merge_1 = require("./services/merge");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 루트 경로 핸들러 추가
app.get('/', (req, res) => {
    res.status(200).send('OK');
});
// 로그인 확인용 엔드포인트
app.post('/auth', async (req, res) => {
    let browser = null;
    let context = null;
    let page = null;
    let loginError = false;
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '학번/비밀번호가 필요합니다.' });
        }
        browser = await playwright_core_1.chromium.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        context = await browser.newContext();
        page = await context.newPage();
        // 로그인 시도
        await page.goto('https://portal.suwon.ac.kr/enview/index.html');
        const frame = page.frame({ name: 'mainFrame' });
        if (!frame)
            throw new Error('mainFrame을 찾을 수 없습니다.');
        // 로그인 실패 감지
        page.on('dialog', async (dialog) => {
            logger_1.logger.info('Dialog message:', dialog.message());
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
    }
    catch (error) {
        logger_1.logger.error('Login failed:', error);
        res.status(500).json({ error: error.message });
    }
    finally {
        if (page)
            await page.close().catch(e => logger_1.logger.error('Error closing page:', e));
        if (context)
            await context.close().catch(e => logger_1.logger.error('Error closing context:', e));
        if (browser)
            await browser.close().catch(e => logger_1.logger.error('Error closing browser:', e));
    }
});
// 데이터 스크래핑용 엔드포인트
app.post('/scrape', async (req, res) => {
    let browser = null;
    let context = null;
    let page = null;
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '학번/비밀번호가 필요합니다.' });
        }
        browser = await playwright_core_1.chromium.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true
        });
        context = await browser.newContext();
        page = await context.newPage();
        // 로그인
        await page.goto('https://portal.suwon.ac.kr/enview/index.html');
        const frame = page.frame({ name: 'mainFrame' });
        if (!frame)
            throw new Error('mainFrame을 찾을 수 없습니다.');
        await frame.fill('input[name="userId"]', username);
        await frame.fill('input[name="pwd"]', password);
        await frame.click('button.mainbtn_login');
        await page.waitForTimeout(3000);
        // 데이터 스크래핑
        if (!page)
            throw new Error('Page is null');
        const [student, courses, creditResult] = await Promise.all([
            (0, student_1.scrapeStudent)(page, username),
            (0, course_1.scrapeCourses)(page, username),
            (0, credit_1.scrapeCredits)(page, username)
        ]);
        // 데이터 병합
        const mergedSemesters = (0, merge_1.mergeCreditCourse)(creditResult.credits, courses);
        res.json({
            student,
            semesters: mergedSemesters,
            academicRecords: creditResult.academicRecords
        });
    }
    catch (error) {
        logger_1.logger.error('Scraping failed:', error);
        res.status(500).json({ error: error.message });
    }
    finally {
        if (page)
            await page.close().catch(e => logger_1.logger.error('Error closing page:', e));
        if (context)
            await context.close().catch(e => logger_1.logger.error('Error closing context:', e));
        if (browser)
            await browser.close().catch(e => logger_1.logger.error('Error closing browser:', e));
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger_1.logger.info(`Server is running on port ${PORT}`);
});
