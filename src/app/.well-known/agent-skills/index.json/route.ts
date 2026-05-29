import { SITE_URL } from "@/lib/site";
import { listSkills, renderSkill, sha256Hex } from "@/lib/skills";

/**
 * Agent Skills Discovery RFC v0.2.0 index. Lists every skill devtils
 * advertises with its url, type, description, and a sha256 over the
 * SKILL.md body the url returns.
 *
 * The hash is computed at request time from the same render function the
 * SKILL.md route uses, so the index can't lie about content it doesn't
 * actually serve. Cache headers expire the index every hour, so a hash
 * mismatch can persist for at most the cache window.
 *
 * `$schema` points at the published RFC; agents that validate against it
 * find the schema at the canonical URL.
 */
export const dynamic = "force-static";

const SCHEMA_URL =
  "https://raw.githubusercontent.com/cloudflare/agent-skills-discovery-rfc/main/schemas/index.schema.json";

export async function GET(): Promise<Response> {
  const skills = listSkills();

  const entries = await Promise.all(
    skills.map(async (s) => {
      const body = renderSkill(s.name) ?? "";
      return {
        name: s.name,
        type: s.type,
        description: s.description,
        url: s.url,
        sha256: await sha256Hex(body),
      };
    }),
  );

  const doc = {
    $schema: SCHEMA_URL,
    version: "0.2.0",
    publisher: { name: "devtils", url: SITE_URL },
    generatedAt: "static", // placeholder — see header comment in agent-index.json
    skills: entries,
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
