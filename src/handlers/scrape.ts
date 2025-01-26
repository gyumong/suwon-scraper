import { APIGatewayProxyHandler } from 'aws-lambda';
import { initBrowser, loginToPortal } from '../utils/browser';
import { scrapeStudent } from '../services/student';
import { scrapeCredits } from '../services/credit';
import { scrapeCourses } from '../services/course';
import { mergeCreditCourse } from '../services/merge';

export const handler: APIGatewayProxyHandler = async (event) => {
  const browser = await initBrowser();
  
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
    await loginToPortal(page, username, password);

    const student = await scrapeStudent(page, username);
    const { credits, academicRecords } = await scrapeCredits(page, username);
    const courses = await scrapeCourses(page, username);
    
    const mergedData = mergeCreditCourse(credits, courses);

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
  } catch (error: any) {
    const statusCode = 
      error.message.includes('비밀번호가 일치하지 않습니다') ? 401 :
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
  } finally {
    await browser.close();
  }
};