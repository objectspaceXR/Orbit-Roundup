import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-static";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
          borderRadius: 6,
        }}
      >
        <img src={planetDataUrl} width={22} height={22} alt="" style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }} />
      </div>
    ),
    { width: 32, height: 32 }
  );
}
