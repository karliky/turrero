import { TwitterCookies } from "./types.ts";



export function env2cookies(env: typeof Deno.env): TwitterCookies {
    return {
        twid: env.get("twid"),
        auth_token: env.get("auth_token"),
        lang: env.get("lang"),
        d_prefs: env.get("d_prefs"),
        kdt: env.get("kdt"),
        ct0: env.get("ct0"),
        guest_id: env.get("guest_id"),
    };
}

export function encodeCookies(cookies: TwitterCookies): string {
    // Convert cookies object to string
    const cookieString = Object.entries(cookies)
        .filter(([key]) =>
            ["twid", "auth_token", "lang", "d_prefs", "kdt", "ct0", "guest_id"]
                .includes(key)
        )
        .map(([key, value]) => `${key}=${value}`)
        .join(";") + ";";

    // Encode to base64
    return btoa(cookieString);
}
