import { ToolContent } from "@/components/json-converter";

export function JsonToYamlContent() {
  return (
    <ToolContent
      intro="Convert JSON to YAML using the battle-tested js-yaml dumper. Configurable indent (2 / 4 / 8) to match your team's convention, line-width wrapping so long strings break cleanly, and alphabetical key sorting for diff-friendly output. Useful for converting between JSON and YAML config formats without manual hand-translation."
      useCases={[
        {
          title: "Migrating CI config from JSON to YAML",
          description:
            "GitHub Actions, CircleCI, GitLab — all use YAML. If you have an existing JSON config (or are generating one from a script), convert to YAML for human-readable check-in.",
        },
        {
          title: "Kubernetes manifests from JSON",
          description:
            "kubectl accepts both, but the community standard is YAML. Convert ConfigMaps, Secrets, and Deployments from JSON snippets to YAML for cleaner review in PRs.",
        },
        {
          title: "Docker Compose translation",
          description:
            "When you have a programmatically-generated JSON description of services, convert to YAML for use with `docker compose`.",
        },
        {
          title: "Translating API responses to readable config",
          description:
            "JSON's noise (quotes, commas, braces) makes it hard to read at a glance. YAML's whitespace-led syntax is much easier for human review.",
        },
      ]}
      faqs={[
        {
          question: "Why does my YAML have `'` around some values?",
          answer:
            "js-yaml quotes strings when they could otherwise be interpreted as another type — `'yes'`, `'no'`, `'true'`, `'12'`, `'on'`. These are YAML 1.1 ambiguities; the quotes preserve string semantics.",
        },
        {
          question: "Should I sort keys?",
          answer:
            "Helpful for config files that go through code review — sorted keys make diffs predictable and small. Avoid sorting for ordered configs (Kubernetes containers, Docker compose services) where source order is meaningful.",
        },
        {
          question: "What's `flowLevel`?",
          answer:
            "Controls when YAML switches from block style (newlines, indentation) to flow style (`{a: 1, b: 2}`). `-1` keeps everything in block style — most readable. Positive numbers force compact inline syntax past that depth.",
        },
        {
          question: "Does it preserve comments from JSON?",
          answer:
            "JSON doesn't have comments. If your source is JSON5 or JSONC with `//` comments, strip them first — the YAML output will be comment-free regardless.",
        },
        {
          question: "Can I convert YAML to JSON?",
          answer:
            "Use the JSON formatter (paste YAML into JSON formatter and use its parsing). A dedicated bidirectional swap on this page is on the roadmap.",
        },
        {
          question: "Why is my indent option specifically 2 / 4 / 8?",
          answer:
            "The YAML spec requires indentation to be consistent and explicit. js-yaml accepts arbitrary numbers but most communities standardise on 2 (Kubernetes, Ansible) or 4. 8 is occasionally used for highly nested configs to keep scope visible.",
        },
      ]}
      relatedSlugs={["json-to-csv", "json-to-xml", "json-formatter", "json-to-typescript"]}
    />
  );
}
