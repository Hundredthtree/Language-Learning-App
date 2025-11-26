import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: "6px",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Russian Flag - White, Blue, Red horizontal stripes */}
        <div style={{ flex: 1, background: "#FFFFFF" }} />
        <div style={{ flex: 1, background: "#0039A6" }} />
        <div style={{ flex: 1, background: "#D52B1E" }} />
      </div>
    ),
    {
      ...size,
    }
  );
}

