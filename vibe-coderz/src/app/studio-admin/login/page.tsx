import type { Metadata } from "next";
import { Login } from "@/components/studio-admin/Login";

export const metadata: Metadata = { title: "Studio sign in", robots: { index: false, follow: false } };

export default function StudioLoginPage() {
  return <Login />;
}
