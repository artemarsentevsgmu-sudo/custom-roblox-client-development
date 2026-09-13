"use client";

export type IconName =
  | "home"
  | "compass"
  | "server"
  | "users"
  | "flag"
  | "shirt"
  | "box"
  | "coin"
  | "mail"
  | "gear"
  | "search"
  | "bolt"
  | "star"
  | "play"
  | "pin"
  | "refresh"
  | "signal"
  | "globe"
  | "shield"
  | "logout"
  | "chart"
  | "heart";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-5.5h5V20",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z",
  server:
    "M4 5.5h16v5H4v-5Zm0 8h16v5H4v-5ZM7.5 8h.01M7.5 16h.01M11 8h5M11 16h5",
  users:
    "M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19M9.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm11.5 9.5v-1.5a4 4 0 0 0-3-3.87M16.5 3.6a3 3 0 0 1 0 5.8",
  flag: "M5 21V4m0 0 6.5 1.8a4 4 0 0 0 2.6-.2L19 3.5v9l-4.9 2.1a4 4 0 0 1-2.6.2L5 13",
  shirt:
    "M8 3 5 5 3 9l3 1.5V21h12V10.5L21 9l-2-4-3-2a4 4 0 0 1-8 0Z",
  box: "M21 8.5 12 4 3 8.5m18 0L12 13m9-4.5V16l-9 4.5M3 8.5 12 13m-9-4.5V16l9 4.5M12 13v7.5",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.2-6.2h4.4M9.8 9.2h4.4M10.8 21V3m2.4 18V3",
  mail: "M3.5 6.5h17v11h-17v-11Zm0 .5 8.5 6 8.5-6",
  gear: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm8-3.2a8 8 0 0 0-.13-1.4l2.05-1.6-2-3.46-2.42.98a8 8 0 0 0-2.42-1.4L14.7 2h-4l-.38 2.6a8 8 0 0 0-2.42 1.4L5.5 5.02l-2 3.46 2.05 1.6a8.1 8.1 0 0 0 0 2.8L3.5 14.5l2 3.46 2.4-.98a8 8 0 0 0 2.42 1.4l.38 2.62h4l.38-2.62a8 8 0 0 0 2.42-1.4l2.42.98 2-3.46-2.05-1.6c.08-.46.13-.93.13-1.4Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.2-1.8L21 21",
  bolt: "M13 2 4.5 13.5H11L10.5 22 19.5 10H13V2Z",
  star: "m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z",
  play: "M7 4.5 19.5 12 7 19.5v-15Z",
  pin: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4.5V10h-5.5",
  signal: "M4 20v-4m5 4V11m5 9V7m5 13V3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z",
  shield: "M12 21s7-3.2 7-9V5.8L12 3 5 5.8V12c0 5.8 7 9 7 9Zm-2.6-9.3 2 2 3.8-4",
  logout: "M15 17v2.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 19.5v-15A1.5 1.5 0 0 1 5.5 3h8A1.5 1.5 0 0 1 15 4.5V7m3 9 4-4-4-4m4 4H9",
  chart: "M4 20V4m0 16h16M8 17V9m4.5 8V6.5M17 17v-5",
  heart:
    "M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z",
};

export function Icon({
  name,
  className = "h-5 w-5",
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
