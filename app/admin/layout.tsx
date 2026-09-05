import type { Metadata } from "next";
import AdminEmailEnhancer from "./AdminEmailEnhancer";

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
      <AdminEmailEnhancer />
    </>
  );
}
