import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://www.pollandsee.com/poll/${params.slug}`,
    },
  };
}