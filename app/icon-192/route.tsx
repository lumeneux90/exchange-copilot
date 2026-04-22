import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgb(13, 122, 67) 0%, rgb(12, 92, 93) 55%, rgb(7, 62, 77) 100%)",
          color: "white",
          fontSize: 82,
          fontWeight: 800,
          letterSpacing: -4,
          borderRadius: 40,
        }}
      >
        XC
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
