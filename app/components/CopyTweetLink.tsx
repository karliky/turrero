"use client";
import { useState } from "react";

/** "#" after a tweet: copies the link to that tweet inside the turra page. */
export function CopyTweetLink({ tweetId }: { tweetId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${tweetId}`;
    window.history.replaceState(null, "", `#${tweetId}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context): the address bar already shows the link
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copiar enlace a este tweet"
      title="Copiar enlace a este tweet"
      className="ml-1.5 align-baseline text-base font-medium text-whiskey-700 opacity-50 transition-opacity hover:opacity-100 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
    >
      {copied ? "Copiado" : "#"}
    </button>
  );
}
