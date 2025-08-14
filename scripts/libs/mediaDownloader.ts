import axios, { AxiosInstance } from "npm:axios";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extname } from "node:path";
import { EnrichedMediaTweet, TwitterCookies } from "./types.ts";

export function getInstance(cookies: TwitterCookies) {
    // Create axios instance with default config
    const axiosInstance = axios.create({
        timeout: 30000, // 30 seconds timeout
        maxContentLength: Infinity,
        responseType: "arraybuffer",
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Cookie": Object.entries(cookies)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => `${key}=${value}`)
                .join("; "),
        },
    });

    return axiosInstance;
}

/**
 * Downloads media from a URL and saves it to the media directory
 * @param url The URL of the media to download
 * @param id The tweet ID
 * @param axiosInstance axios instance. If not provided, will create a new one
 * @param filename Optional filename. If not provided, will be extracted from URL
 * @param outputDir Optional output directory. If not provided, will be "public/metadata/"
 * @returns An EnrichedMediaTweet object with the downloaded media info
 */
export async function downloadMedia(
    url: string,
    id: string,
    axiosInstance: AxiosInstance,
    filename?: string,
    outputDir = "./public/metadata/",
): Promise<EnrichedMediaTweet> {
    if (!url) {
        throw new Error("URL is required");
    }

    try {
        // Get the file extension from URL or use a default
        const ext = extname(url) || ".jpg";

        // Generate filename if not provided
        const mediaDir = join(process.cwd(), "media");

        // Ensure media directory exists
        if (!existsSync(mediaDir)) {
            mkdirSync(mediaDir, { recursive: true });
        }

        const filepath = join(
            outputDir,
            filename || url.split("/").pop()?.split("?")[0] || `${id}${ext}`,
        );

        // Download the file
        const response = await axiosInstance.get(url);

        // Save the file
        writeFileSync(filepath, response.data);

        // Return enriched media tweet object
        return {
            type: "media",
            id,
            img: filepath,
            url,
        };
    } catch (error) {
        console.error(`Error downloading media from ${url}:`, error);
        throw error;
    }
}
