import type { Metadata } from "next";
import { Dashboard } from "@/components/studio-admin/Dashboard";

export const metadata: Metadata = { title: "Lead dashboard", robots: { index: false, follow: false } };

export default function StudioAdminPage() {
  return <Dashboard />;
}
