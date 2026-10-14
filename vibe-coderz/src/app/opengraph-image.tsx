import { ImageResponse } from "next/og";
export const alt = "Vibecoderzz — AI receptionists and custom business software";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#f4f3ee",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 70,
        color: "#242720",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", fontSize: 30 }}>
        vibecoderzz✳
        <span style={{ marginLeft: 290, fontSize: 17, color: "#737967" }}>
          AI RECEPTIONISTS / CUSTOM CRM
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 90,
          letterSpacing: -6,
          lineHeight: 1,
        }}
      >
        <span>You’re needed</span>
        <span style={{ color: "#c74929" }}>elsewhere.</span>
      </div>
      <div style={{ display: "flex", fontSize: 23 }}>
        AI receptionists, with a team behind the agent. USA / UK / Australia.
      </div>
    </div>,
    size,
  );
}
