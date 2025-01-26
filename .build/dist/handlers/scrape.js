"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const browser_1 = require("../utils/browser");
const student_1 = require("../services/student");
const credit_1 = require("../services/credit");
const course_1 = require("../services/course");
const merge_1 = require("../services/merge");
const handler = async (event) => {
    const browser = await (0, browser_1.initBrowser)();
    // 공통 헤더 정의
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
    };
    try {
        const { username, password } = JSON.parse(event.body || '{}');
        if (!username || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '학번/비밀번호가 필요합니다.' })
            };
        }
        // 30초 타임아웃 설정
        const timeout = setTimeout(() => {
            browser.close();
            throw new Error('요청 시간이 초과되었습니다.');
        }, 30000);
        const page = await browser.newPage();
        await (0, browser_1.loginToPortal)(page, username, password);
        const student = await (0, student_1.scrapeStudent)(page, username);
        const { credits, academicRecords } = await (0, credit_1.scrapeCredits)(page, username);
        const courses = await (0, course_1.scrapeCourses)(page, username);
        const mergedData = (0, merge_1.mergeCreditCourse)(credits, courses);
        clearTimeout(timeout);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                student,
                mergedData,
                academicRecords,
            })
        };
    }
    catch (error) {
        const statusCode = error.message.includes('비밀번호가 일치하지 않습니다') ? 401 :
            error.message.includes('시간이 초과') ? 504 :
                error.message.includes('mainFrame을 찾을 수 없습니다') ? 502 :
                    500;
        return {
            statusCode,
            headers,
            body: JSON.stringify({
                error: error.message
            })
        };
    }
    finally {
        await browser.close();
    }
};
exports.handler = handler;
//# sourceMappingURL=scrape.js.map