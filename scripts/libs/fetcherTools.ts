import type { Page } from "npm:puppeteer-core";
import { MetadataCard } from "./types.ts";
import puppeteer from "npm:puppeteer";

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

export async function cardMediaDownload(
    browser: puppeteer.Browser,
    resourceUrl: string,
    webURL: string,
): Promise<MetadataCard> {
    const page = await browser.newPage();
    await Promise.all([
        page.goto(webURL),
        page.waitForNavigation(),
        page.waitForSelector("article"),
    ]);

    const imgSrc: string | undefined = await page.evaluate(() =>
        (() => {
            return document.querySelector(
                'article[tabindex="-1"][role="article"][data-testid="tweet"]',
            )?.querySelector('div[data-testid="card.wrapper"]')
                ?.querySelector("img")?.getAttribute("src") ||
                "undefined";
        })()
    );

    await page.close();

    return {
        type: "card",
        img: imgSrc || "",
        url: resourceUrl,
    };
}
