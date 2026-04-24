import { useState, useEffect, useRef } from "react";

/**
 * Custom hook that animates a number from 0 to targetValue
 * using requestAnimationFrame with easeOutExpo easing.
 *
 * @param {number} targetValue - The final number to animate to
 * @param {number} duration - Animation duration in ms (default 900)
 * @returns {number} The current animated value
 */
export function useAnimatedCounter(targetValue, duration = 900) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const startValue = prevTarget.current;
    const endValue = typeof targetValue === "number" ? targetValue : 0;
    prevTarget.current = endValue;

    if (startValue === endValue) {
      setValue(endValue);
      return;
    }

    const startTime = performance.now();

    const easeOutExpo = (t) =>
      t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const current = Math.round(
        startValue + (endValue - startValue) * easedProgress,
      );
      setValue(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [targetValue, duration]);

  return value;
}

/**
 * Inline component version for use in JSX expressions.
 * Usage: <AnimatedNumber value={42} />
 */
export function AnimatedNumber({ value, duration = 900, suffix = "" }) {
  const animated = useAnimatedCounter(value, duration);
  return `${animated}${suffix}`;
}
