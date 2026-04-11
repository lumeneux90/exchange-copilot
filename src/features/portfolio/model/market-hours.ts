const MOSCOW_TIME_ZONE = "Europe/Moscow";
const STOCK_SESSION_START_MINUTES = 9 * 60 + 50;
const STOCK_SESSION_END_MINUTES = 19 * 60;

function getMoscowDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return {
    weekday,
    minutesOfDay: hour * 60 + minute,
  };
}

export function getStockMarketStatus(date = new Date()) {
  const { minutesOfDay, weekday } = getMoscowDateParts(date);
  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  const isWithinMainSession =
    minutesOfDay >= STOCK_SESSION_START_MINUTES &&
    minutesOfDay < STOCK_SESSION_END_MINUTES;

  if (!isWeekday) {
    return {
      isOpen: false,
      reason: "Сделки по акциям доступны только по будням с 09:50 до 19:00 по Москве.",
    };
  }

  if (!isWithinMainSession) {
    return {
      isOpen: false,
      reason: "Сделки по акциям доступны с 09:50 до 19:00 по Москве.",
    };
  }

  return {
    isOpen: true,
    reason: null,
  };
}
