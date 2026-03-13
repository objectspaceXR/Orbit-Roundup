import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  const planetPath = path.join(process.cwd(), "public", "icons", "planets", "saturn.png");
  const planetBuffer = readFileSync(planetPath);
  const planetDataUrl = `data:image/png;base64,${planetBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <img
          src={planetDataUrl}
          width={120}
          height={120}
          alt=""
          style={{
            objectFit: "contain",
            filter: "brightness(0) saturate(100%) invert(70%) sepia(50%) saturate(400%) hue-rotate(190deg)",
            marginBottom: 32,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: "white", letterSpacing: "-2px" }}>
            ORBIT ROUNDUP
          </div>
          <div style={{ fontSize: 24, color: "rgba(148,163,184,1)", fontWeight: 400 }}>
            XR, AI, 3D and creative tech news
          </div>
          <div style={{ fontSize: 18, color: "rgba(100,116,139,1)", marginTop: 8 }}>
            by Tom Martin-Davies
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
