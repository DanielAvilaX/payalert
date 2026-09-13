"use client";

import { useEffect, useRef } from "react";

type Ripple = { x: number; y: number; born: number; paid: boolean };

const GAP = 30; // distance between cells, px
const DOT = 3; // resting cell size, px
const RIPPLE_SPEED = 0.15; // px per ms
const RIPPLE_LIFE = 2800; // ms
const BAND = 22; // thickness of a wavefront, px
const POINTER_RADIUS = 150;

const INDIGO = "79,70,229";
const EMERALD = "16,185,129";
const SLATE = "100,116,139";

/**
 * A calendar-like grid of cells behind the form. Every so often a day
 * "pings": an alert ripple (indigo) or a payment settling (emerald, with a
 * check) spreads across the grid and lights the cells it passes. The cursor
 * warms the cells around it, and clicking or tapping empty space sends a
 * ping of your own. Never intercepts a click on the form itself.
 */
export function AlertGrid({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    let raf = 0;
    let nextSpawn = 0;
    let ripples: Ripple[] = [];
    const pointer = { x: -9999, y: -9999 };

    function resize() {
      const rect = parent!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.round(rect.width);
      h = Math.round(rect.height);
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.floor(w / GAP) + 1;
      rows = Math.floor(h / GAP) + 1;
      // Centre the grid so both edges get the same margin.
      offX = (w - (cols - 1) * GAP) / 2;
      offY = (h - (rows - 1) * GAP) / 2;
      if (reduceMotion) draw(performance.now());
    }

    function spawn(now: number, x?: number, y?: number, paid = Math.random() < 0.35) {
      const col = x == null ? Math.floor(Math.random() * cols) : Math.round((x - offX) / GAP);
      const row = y == null ? Math.floor(Math.random() * rows) : Math.round((y - offY) / GAP);
      ripples.push({ x: offX + col * GAP, y: offY + row * GAP, born: now, paid });
      if (ripples.length > 6) ripples.shift();
    }

    function drawCheck(x: number, y: number, alpha: number) {
      ctx!.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx!.lineWidth = 1.6;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(x - 3, y);
      ctx!.lineTo(x - 1, y + 2.2);
      ctx!.lineTo(x + 3.2, y - 2.4);
      ctx!.stroke();
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, w, h);
      ripples = ripples.filter((r) => now - r.born < RIPPLE_LIFE);

      // Resting cells are batched into one path; only lit ones draw alone.
      const lit: Array<{ x: number; y: number; i: number; paid: boolean }> = [];
      ctx!.fillStyle = `rgba(${SLATE},0.16)`;
      ctx!.beginPath();

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = offX + c * GAP;
          const y = offY + r * GAP;
          let alert = 0;
          let paid = 0;

          for (const ripple of ripples) {
            const age = now - ripple.born;
            const radius = age * RIPPLE_SPEED;
            const d = Math.hypot(x - ripple.x, y - ripple.y);
            const k =
              Math.exp(-((d - radius) ** 2) / (2 * BAND * BAND)) * (1 - age / RIPPLE_LIFE);
            if (ripple.paid) paid = Math.max(paid, k);
            else alert = Math.max(alert, k);
          }

          const dm = Math.hypot(x - pointer.x, y - pointer.y);
          if (dm < POINTER_RADIUS) alert = Math.max(alert, (1 - dm / POINTER_RADIUS) * 0.85);

          const i = Math.max(alert, paid);
          if (i < 0.04) ctx!.rect(x - DOT / 2, y - DOT / 2, DOT, DOT);
          else lit.push({ x, y, i, paid: paid > alert });
        }
      }
      ctx!.fill();

      for (const cell of lit) {
        const size = DOT + cell.i * 5;
        ctx!.fillStyle = `rgba(${cell.paid ? EMERALD : INDIGO},${0.16 + 0.64 * cell.i})`;
        ctx!.beginPath();
        ctx!.roundRect(cell.x - size / 2, cell.y - size / 2, size, size, size * 0.3);
        ctx!.fill();
      }

      // The day that pinged: a pulsing ring, and a check when it's a payment.
      for (const ripple of ripples) {
        const age = now - ripple.born;
        const fade = 1 - age / RIPPLE_LIFE;
        const color = ripple.paid ? EMERALD : INDIGO;
        const pulse = Math.min(1, age / 1000);

        if (pulse < 1) {
          ctx!.strokeStyle = `rgba(${color},${0.45 * (1 - pulse)})`;
          ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.arc(ripple.x, ripple.y, 8 + pulse * 26, 0, Math.PI * 2);
          ctx!.stroke();
        }

        ctx!.fillStyle = `rgba(${color},${0.9 * fade})`;
        ctx!.beginPath();
        ctx!.roundRect(ripple.x - 7, ripple.y - 7, 14, 14, 4);
        ctx!.fill();
        if (ripple.paid) drawCheck(ripple.x, ripple.y, fade);
      }
    }

    function loop(now: number) {
      if (!document.hidden) {
        if (now >= nextSpawn) {
          spawn(now);
          nextSpawn = now + (isTouch ? 2400 : 1600) + Math.random() * 1000;
        }
        draw(now);
      }
      raf = requestAnimationFrame(loop);
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    }
    function onLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
    }
    function onDown(e: PointerEvent) {
      // Typing into the form shouldn't set the background off.
      if ((e.target as Element).closest("form, a, button, input, label")) return;
      const rect = canvas!.getBoundingClientRect();
      spawn(performance.now(), e.clientX - rect.left, e.clientY - rect.top, false);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();

    if (reduceMotion) return () => observer.disconnect();

    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    parent.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      parent.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
