import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AREAS, getArea, getAreaCopy } from "@/lib/areas";
import { SignalAreaPage } from "@/components/signal/SignalAreaPage";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) return {};
  const content = getAreaCopy(area, "en");
  return {
    title: content.metaTitle,
    description: content.metaDescription,
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) notFound();
  return <SignalAreaPage area={area} />;
}
