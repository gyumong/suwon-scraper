"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const chromium_min_1 = __importDefault(require("@sparticuz/chromium-min"));
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const logger_1 = require("../utils/logger");
const handler = async (event) => {
    let browser = null;
    let page = null;
    let loginError = false;
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    try {
        let rawBody = event.body || '{}';
        if (event.isBase64Encoded) {
            const buffer = Buffer.from(rawBody, 'base64');
            rawBody = buffer.toString('utf-8');
        }
        logger_1.logger.info('Raw body:', rawBody);
        const { username, password } = JSON.parse(rawBody);
        if (!username || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '학번/비밀번호가 필요합니다.' })
            };
        }
        chromium_min_1.default.setHeadlessMode = true;
        chromium_min_1.default.setGraphicsMode = false;
        browser = await puppeteer_core_1.default.launch({
            args: chromium_min_1.default.args,
            defaultViewport: chromium_min_1.default.defaultViewport,
            executablePath: await chromium_min_1.default.executablePath(),
            headless: chromium_min_1.default.headless,
        });
        page = await browser.newPage();
        page.on('dialog', async (dialog) => {
            logger_1.logger.info('Dialog message:', dialog.message());
            if (dialog.message().includes('비밀번호를 잘못 입력')) {
                loginError = true;
            }
            await dialog.dismiss();
        });
        await page.goto('https://portal.suwon.ac.kr/enview/index.html', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        // frames() 메서드를 사용하여 mainFrame 찾기
        const frame = page.frames().find(f => f.name() === 'mainFrame');
        if (!frame) {
            throw new Error('mainFrame을 찾을 수 없습니다.');
        }
        await frame.type('input[name="userId"]', username);
        await frame.type('input[name="pwd"]', password);
        await frame.click('button.mainbtn_login');
        // waitForTimeout 대신 setTimeout 사용
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (loginError) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    error: '아이디나 비밀번호가 일치하지 않습니다.\n학교 홈페이지에서 확인해주세요.'
                })
            };
        }
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: '로그인 성공' })
        };
    }
    catch (error) {
        logger_1.logger.error('Login failed', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
    finally {
        if (page) {
            try {
                await page.close();
            }
            catch (e) {
                logger_1.logger.error('Error closing page:', e);
            }
        }
        if (browser) {
            try {
                await browser.close();
            }
            catch (e) {
                logger_1.logger.error('Error closing browser:', e);
            }
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=auth.js.map