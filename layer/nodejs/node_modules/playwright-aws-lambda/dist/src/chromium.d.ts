import * as playwright from 'playwright-core';
import { LaunchOptions } from 'playwright-core';
/**
 * Returns a list of recommended additional Chromium flags.
 */
export declare function getChromiumArgs(headless: boolean): string[];
export declare function launchChromium(launchOptions?: Partial<LaunchOptions>): Promise<playwright.ChromiumBrowser>;
export declare const loadFont: (input: string) => Promise<void>;
