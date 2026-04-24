import { ImageResponse } from "next/og";

import { IconMark } from "@/app/icon-mark";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 38,
        }}
      >
        <IconMark size={104} />
      </div>
    ),
    size
  );
}
