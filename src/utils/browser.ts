import playwright from 'playwright-aws-lambda';
import type { Browser, Page } from 'playwright-core';

export async function initBrowser(): Promise<Browser> {
  return playwright.launchChromium({
    headless: true
  });
}

export async function loginToPortal(page: Page, username: string, password: string): Promise<boolean> {
  let loginError = false;

  page.on('dialog', async dialog => {
    const message = dialog.message();
    if (message.includes('비밀번호를 잘못 입력') || message.includes('사용자 ID가 존재하지 않습니다')) {
      loginError = true;
    }
    await dialog.dismiss();
  });

  try {
    await page.goto('https://portal.suwon.ac.kr/enview/index.html', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const frame = page.frame({ name: 'mainFrame' });
    if (!frame) {
      throw new Error('mainFrame을 찾을 수 없습니다.');
    }

    await frame.fill('input[name="userId"]', username);
    await frame.fill('input[name="pwd"]', password);
    await frame.click('button.mainbtn_login');
    await page.waitForTimeout(3000);

    if (loginError) {
      throw new Error('아이디나 비밀번호가 일치하지 않습니다.');
    }

    await page.goto('https://info.suwon.ac.kr/sso_security_check', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    return true;
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      throw new Error('포털 접속 시간이 초과되었습니다.');
    }
    throw error;
  }
}