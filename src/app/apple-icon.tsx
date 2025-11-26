import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
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
          borderRadius: "40px",
          overflow: "hidden",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
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

