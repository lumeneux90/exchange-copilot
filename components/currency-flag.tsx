"use client";

import Image from "next/image";

import { cn } from "@/src/lib/utils";

const currencyFlagMap: Record<string, { alt: string; src: string }> = {
  USD: {
    alt: "Флаг США",
    src: "/flags/us-round.svg",
  },
  EUR: {
    alt: "Флаг Евросоюза",
    src: "/flags/eu-round.svg",
  },
  CNY: {
    alt: "Флаг Китая",
    src: "/flags/cn-round.svg",
  },
  HKD: {
    alt: "Флаг Гонконга",
    src: "/flags/hk-round.svg",
  },
};

export function CurrencyFlag({
  code,
  className,
  imageClassName,
}: {
  code: string;
  className?: string;
  imageClassName?: string;
}) {
  const flag = currencyFlagMap[code];

  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[0.625rem] font-semibold uppercase",
        className
      )}
      aria-hidden={!flag}
    >
      {flag ? (
        <Image
          src={flag.src}
          alt={flag.alt}
          fill
          sizes="40px"
          className={cn("object-cover", imageClassName)}
          unoptimized
        />
      ) : (
        <span>{code.slice(0, 2)}</span>
      )}
    </div>
  );
}
