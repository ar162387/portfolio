import { ImageResponse } from "next/og";
export const alt = "Vibecoderzz — Software, AI & Growth Studio";
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
          SOFTWARE / AI / GROWTH
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 105,
          letterSpacing: -6,
          lineHeight: 1,
        }}
      >
        <span>Good ideas.</span>
        <span style={{ color: "#c74929" }}>Serious pull.</span>
      </div>
      <div style={{ display: "flex", fontSize: 23 }}>
        Independent software & AI studio. Lahore → Worldwide.
      </div>
    </div>,
    size,
  );
}
