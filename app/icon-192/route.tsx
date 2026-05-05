import { ImageResponse } from "next/og";

import { IconMark } from "@/app/icon-mark";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #07131f 0%, #1f5f7a 56%, #4f5965 132%)",
        borderRadius: 40,
      }}
    >
      <IconMark size={112} />
    </div>,
    {
      width: 192,
      height: 192,
    }
  );
}
