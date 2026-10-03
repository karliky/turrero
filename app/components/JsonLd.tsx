import { serializeLd } from "@/lib/structured-data";

/** schema.org structured data for search engines (see lib/structured-data.ts). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />;
}
