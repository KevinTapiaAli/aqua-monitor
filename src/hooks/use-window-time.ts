"use client";
import { useEffect, useState } from "react";

/** Move statistics with the live window without reading the clock during render. */
export function useWindowTime(connected: boolean, lastTime: number | undefined) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [connected]);
  return connected && now > 0 ? now : lastTime ?? 0;
}
