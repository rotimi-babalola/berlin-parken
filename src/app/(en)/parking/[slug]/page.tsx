import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignalAreaPage } from "@/components/signal/SignalAreaPage";
import { AREAS, getArea } from "@/lib/areas";
import { areaMetadata } from "@/lib/page-metadata";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) return {};
  return areaMetadata(area, "en");
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) notFound();
  return <SignalAreaPage area={area} />;
}
