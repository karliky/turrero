import type { Page } from "puppeteer-core";

export async function rejectCookies(page: Page): Promise<void> {
    try {
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
        const rejectButton = await page.$(
            'div[role="dialog"] button[tabindex="0"]',
        );
        if (rejectButton) {
            await rejectButton.click();
            await page.waitForSelector('div[role="dialog"]', { hidden: true });
        }
    } catch (error) {
        // Cookie dialog might not appear, which is fine
        console.log("No cookie dialog found or already handled");
    }
}
