import type { Metadata } from "next";
import { AgentPlayground } from "@/components/studio-admin/AgentPlayground";

export const metadata: Metadata = { title: "Agent playground", robots: { index: false, follow: false } };
export default function PlaygroundPage() { return <AgentPlayground />; }
