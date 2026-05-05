/* eslint-disable react-hooks/static-components */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { getToolComponent } from "@/lib/implemented-tools";
import { getToolBySlug, TOOLS } from "@/lib/tools-registry";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Not found · DevToolbox" };
  const Comp = getToolComponent(slug);
  const suffix = Comp ? "" : " (coming soon)";
  return {
    title: `${tool.name}${suffix} · DevToolbox`,
    description: tool.description,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const Comp = getToolComponent(slug);
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main id="main" className="flex-1 bg-bg">
        {Comp ? <Comp tool={tool} /> : <ComingSoon tool={tool} />}
      </main>
    </div>
  );
}
