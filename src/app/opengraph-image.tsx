import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Ksenia's Russian School - Learn Russian with spaced repetition";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(244, 63, 94, 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-300px",
            left: "-200px",
            width: "800px",
            height: "800px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          }}
        />

        {/* Dotted pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
            zIndex: 10,
          }}
        >
          {/* Russian Flag Icon */}
          <div
            style={{
              display: "flex",
              width: "120px",
              height: "80px",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, background: "#FFFFFF" }} />
            <div style={{ flex: 1, background: "#0039A6" }} />
            <div style={{ flex: 1, background: "#D52B1E" }} />
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <h1
              style={{
                fontSize: "72px",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.02em",
                textAlign: "center",
              }}
            >
              Ksenia&apos;s Russian School
            </h1>
            
            {/* Decorative line with gradient */}
            <div
              style={{
                display: "flex",
                width: "200px",
                height: "4px",
                borderRadius: "2px",
                background: "linear-gradient(90deg, #f43f5e 0%, #ec4899 50%, #f43f5e 100%)",
              }}
            />
          </div>

          {/* Subtitle with Russian text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <p
              style={{
                fontSize: "32px",
                color: "#475569",
                margin: 0,
                textAlign: "center",
              }}
            >
              Learn Russian the smart way
            </p>
            <p
              style={{
                fontSize: "24px",
                color: "#64748b",
                margin: 0,
                textAlign: "center",
              }}
            >
              Учись с Ксенией • Spaced Repetition
            </p>
          </div>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "999px",
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.25)",
              }}
            >
              <span style={{ fontSize: "20px" }}>📚</span>
              <span style={{ color: "#e11d48", fontSize: "18px", fontWeight: 500 }}>
                Track Mistakes
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "999px",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <span style={{ fontSize: "20px" }}>🧠</span>
              <span style={{ color: "#059669", fontSize: "18px", fontWeight: 500 }}>
                Master with Practice
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

