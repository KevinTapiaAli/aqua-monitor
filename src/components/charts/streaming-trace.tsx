"use client";
import { useEffect, useRef } from "react";

export type TracePoint = { time: number; value: number | null };
const clock = new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/La_Paz" });

export function StreamingTrace({ points, color, unit, decimals, duration, interval, connected, label }: {
  points: TracePoint[]; color: string; unit: string; decimals: number; duration: number; interval: number; connected: boolean; label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const endRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const number = new Intl.NumberFormat("es-BO", { maximumFractionDigits: decimals });
    const latest = points.at(-1);
    const gapLimit = Math.max(30_000, interval * 3000);
    let frame = 0, previousFrame = 0;
    let width = 0, height = 0;
    const draw = () => {
      if (!width || !height) return;
      const now = Date.now();
      const live = connected && latest !== undefined && now - latest.time <= gapLimit;
      const anchor = latest?.time ?? now;
      const end = live ? Math.max(now, anchor) : Math.max(endRef.current, anchor);
      if (latest) endRef.current = end;
      const start = end - duration;
      const left = 64, right = width - 16, top = 20, bottom = height - 34;
      const plotWidth = Math.max(1, right - left);
      const visible = points.filter(p => p.time >= start && p.time <= end);
      const values = visible.flatMap(p => p.value === null ? [] : [p.value]);
      const minimum = values.length ? Math.min(...values) : 0;
      const maximum = values.length ? Math.max(...values) : 1;
      const pad = Math.max((maximum - minimum) * 0.18, unit === "°C" ? 0.5 : 10);
      const low = minimum - pad, high = maximum + pad;
      const x = (time: number) => left + (time - start) / duration * plotWidth;
      const y = (value: number) => bottom - (value - low) / (high - low) * (bottom - top);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f8fbfd"; ctx.fillRect(left, top, plotWidth, bottom - top);
      ctx.font = "11px system-ui";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const yy = top + (bottom - top) * i / 4;
        ctx.strokeStyle = "#e2eaf0"; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
        ctx.fillStyle = "#64748b"; ctx.textAlign = "right";
        ctx.fillText(number.format(high - (high - low) * i / 4), left - 8, yy + 4);
      }
      const tick = duration / (width < 500 ? 3 : 5);
      ctx.textAlign = "center";
      for (let time = Math.ceil(start / tick) * tick; time <= end; time += tick) {
        const xx = x(time);
        ctx.strokeStyle = "#edf2f6"; ctx.beginPath(); ctx.moveTo(xx, top); ctx.lineTo(xx, bottom); ctx.stroke();
        if (xx > left + 28 && xx < right - 28) { ctx.fillStyle = "#64748b"; ctx.fillText(clock.format(time), xx, height - 10); }
      }
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, plotWidth, bottom - top); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath();
      let previous: TracePoint | undefined;
      for (const point of points) {
        if (point.time > end) break;
        if (point.value === null) { previous = undefined; continue; }
        if (!previous || point.time - previous.time > gapLimit) ctx.moveTo(x(point.time), y(point.value));
        else ctx.lineTo(x(point.time), y(point.value));
        previous = point;
      }
      ctx.stroke();
      if (latest?.value != null && latest.time >= start) {
        const xx = x(latest.time), yy = y(latest.value);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(xx, yy, 4, 0, Math.PI * 2); ctx.fill();
        if (live) {
          // Extensión visual del último valor; no se añade ninguna muestra.
          ctx.setLineDash([4, 5]); ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(right, yy); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(right - 2, yy, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
      if (!values.length) { ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.fillText("Sin lecturas en esta ventana", left + plotWidth / 2, height / 2); }
    };
    const animate = (timestamp: number) => {
      if (timestamp - previousFrame >= (reduced.matches ? 1000 : 1000 / 30)) { draw(); previousFrame = timestamp; }
      if (!document.hidden && connected && latest && Date.now() - latest.time <= gapLimit) frame = requestAnimationFrame(animate);
    };
    const resume = () => { cancelAnimationFrame(frame); draw(); if (!document.hidden && connected) frame = requestAnimationFrame(animate); };
    const resize = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
    });
    resize.observe(canvas); resume();
    document.addEventListener("visibilitychange", resume); reduced.addEventListener("change", resume);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); document.removeEventListener("visibilitychange", resume); reduced.removeEventListener("change", resume); };
  }, [points, color, unit, decimals, duration, interval, connected]);
  return <canvas ref={canvasRef} className="block h-72 w-full sm:h-96" role="img" aria-label={label}>Los valores están disponibles en Últimas lecturas.</canvas>;
}
