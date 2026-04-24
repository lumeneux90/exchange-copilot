import { ImageResponse } from "next/og";

import { IconMark } from "@/app/icon-mark";

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
          borderRadius: 112,
        }}
      >
        <IconMark size={300} />
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
