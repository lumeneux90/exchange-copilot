"use client";

import Image from "next/image";
import * as React from "react";

import { cn } from "@/src/lib/utils";

// алиас для иконок компаний от Яндекса, которые содержат не содержат в пути тикер
const companyLogoAliasMap: Record<string, string> = {
  SIBN: "GAZP",
  YDEX: "YNDX",
  SBERP: "SBER",
  DOMRF: "bank-domrf",
  X5: "X5_new",
  SNGSP: "SNGS",
  SVCB: "sovcombank",
  TATNP: "TATN",
};

function getInitials(ticker: string, name?: string) {
  const normalizedTicker = ticker.trim().toUpperCase();

  if (normalizedTicker) {
    return normalizedTicker.slice(0, 2);
  }

  return name?.trim().slice(0, 2).toUpperCase() ?? "??";
}

export function CompanyLogo({
  ticker,
  name,
  className,
  imageClassName,
}: {
  ticker: string;
  name?: string;
  className?: string;
  imageClassName?: string;
}) {
  const normalizedTicker = ticker.trim().toUpperCase();
  const logoTicker = companyLogoAliasMap[normalizedTicker] ?? normalizedTicker;
  const [sourceIndex, setSourceIndex] = React.useState(0);
  const initials = getInitials(ticker, name);
  const sources = React.useMemo(
    () => [
      `https://yastatic.net/s3/fintech-icons/1/i/${logoTicker}_v2.svg`,
      `https://yastatic.net/s3/fintech-icons/1/i/${logoTicker}.svg`,
    ],
    [logoTicker]
  );
  const src = sources[sourceIndex] ?? null;

  React.useEffect(() => {
    setSourceIndex(0);
  }, [logoTicker]);

  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border text-[0.625rem] font-semibold uppercase",
        className
      )}
      aria-hidden="true"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="32px"
          className={cn("object-cover", imageClassName)}
          unoptimized
          onError={() => setSourceIndex((currentIndex) => currentIndex + 1)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
