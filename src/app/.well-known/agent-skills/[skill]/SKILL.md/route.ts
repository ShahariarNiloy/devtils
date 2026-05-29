import { listSkills, renderSkill } from "@/lib/skills";

/**
 * Serves the per-skill SKILL.md body. URL: `/.well-known/agent-skills/
 * <skill>/SKILL.md`. `SKILL.md` is a literal directory in the route tree
 * — Next.js permits dots in folder names, which gives us the exact URL
 * shape the Agent Skills RFC asks for without any rewrite trickery.
 *
 * The body is rendered from the same registries the index.json route
 * hashes, so a client that fetches the SKILL.md and re-hashes it will
 * match the index's sha256. Bytes-identical, no normalisation.
 */
export const dynamic = "force-static";

export async function generateStaticParams(): Promise<{ skill: string }[]> {
  return listSkills().map((s) => ({ skill: s.name }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ skill: string }> },
): Promise<Response> {
  const { skill } = await params;
  const body = renderSkill(skill);
  if (body === null) {
    return new Response(`# Skill not found\n\nUnknown skill: \`${skill}\`.\n`, {
      status: 404,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
