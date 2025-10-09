'use client';

import React, { MouseEvent } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;        // 0..max (e.g. 0..10)
  max?: number;         // default 10
  size?: number;        // px size per star (default 20)
  className?: string;
  readOnly?: boolean;
  onChange?: (next: number) => void; // if provided, clicking sets fractional rating (0.00 - max)
};

export const RatingStars: React.FC<Props> = ({
  value,
  max = 10,
  size = 20,
  className,
  readOnly = false,
  onChange,
}) => {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  const handleClick = (e: MouseEvent<HTMLDivElement>, index: number) => {
    if (readOnly || !onChange) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1 within star
    const fraction = Math.min(Math.max(x, 0), 1);
    const next = (index - 1) + fraction;
    // round to 2 decimals
    const rounded = Math.round(next * 100) / 100;
    const clamped = Math.min(Math.max(rounded, 0), max);
    onChange(clamped);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {stars.map((n) => {
        const unit = Math.min(Math.max(value - (n - 1), 0), 1); // 0..1 fill for this star
        const fillPercent = `${unit * 100}%`;
        return (
          <div
            key={n}
            className={cn("relative", !readOnly && onChange ? "cursor-pointer" : "cursor-default")}
            style={{ width: size, height: size }}
            onClick={(e) => handleClick(e, n)}
            aria-label={`Rating star ${n}`}
          >
            {/* Base outline star */}
            <Star
              className="absolute top-0 left-0"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
              color="#525252"
              fill="none"
            />
            {/* Filled portion */}
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: fillPercent, height: size }}
            >
              <Star
                className="absolute top-0 left-0 text-yellow-400"
                style={{ width: size, height: size }}
                strokeWidth={0}
                fill="currentColor"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RatingStars;
