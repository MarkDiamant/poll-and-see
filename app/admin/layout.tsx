import type { Metadata } from "next";
import SubmitterEmailPanel from "./SubmitterEmailPanel";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SubmitterEmailPanel />
    </>
  );
}
