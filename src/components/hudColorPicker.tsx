'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HudColorPickerProps {
  color: string;
  // Called when user finishes adjusting (mouse up / Done / preset)
  onChange: (color: string) => void;
  // Called while user is dragging to preview locally (no server write)
  onPreview?: (color: string) => void;
  onClose?: () => void;
  onDraggingChange?: (isDragging: boolean) => void;
  presetColors?: { name: string; value: string }[];
  className?: string;
}

// Default preset colors
const DEFAULT_PRESETS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  // Dark variants for cards
  { name: "Dark Gray", value: "#2a2a2a" },
  { name: "Dark Red", value: "#7f1d1d" },
  { name: "Dark Orange", value: "#7c2d12" },
  { name: "Dark Yellow", value: "#713f12" },
  { name: "Dark Green", value: "#14532d" },
  { name: "Dark Teal", value: "#134e4a" },
  { name: "Dark Blue", value: "#1e3a5f" },
  { name: "Dark Purple", value: "#4c1d95" },
  { name: "Dark Pink", value: "#831843" },
];

// Convert hex to HSV
const hexToHsv = (hex: string): { h: number; s: number; v: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
};

// Convert HSV to hex
const hsvToHex = (h: number, s: number, v: number): string => {
  h = h / 360;
  s = s / 100;
  v = v / 100;

  let r = 0, g = 0, b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const HudColorPicker = ({
  color,
  onChange,
  onPreview,
  onClose,
  onDraggingChange,
  presetColors = DEFAULT_PRESETS,
  className
}: HudColorPickerProps) => {
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexInput, setHexInput] = useState(color);
  const [activeTab, setActiveTab] = useState<'picker' | 'presets'>('picker');
  
  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [isDraggingSatVal, setIsDraggingSatVal] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  
  // Use refs to avoid stale closures during drag
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  // Use RAF batching to limit updates to animation frames
  const rafRef = useRef<number | null>(null);
  const pendingHsvRef = useRef<{ h: number; s: number; v: number } | null>(null);

  // Notify parent when dragging state changes
  useEffect(() => {
    onDraggingChange?.(isDraggingSatVal || isDraggingHue);
  }, [isDraggingSatVal, isDraggingHue, onDraggingChange]);

  // Update hex input when color changes externally (only when not dragging)
  useEffect(() => {
    if (!isDraggingSatVal && !isDraggingHue) {
      const newHsv = hexToHsv(color);
      setHsv(newHsv);
      setHexInput(color);
    }
  }, [color, isDraggingSatVal, isDraggingHue]);

  // Handle saturation/value picker - use ref to get latest hsv
  const handleSatValChange = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!satValRef.current) return;
    
    const rect = satValRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const newHsv = { ...hsvRef.current, s: x * 100, v: (1 - y) * 100 };
    // Schedule an RAF update to batch frequent pointer moves
    pendingHsvRef.current = newHsv;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const p = pendingHsvRef.current;
        if (!p) return;
        const pHex = hsvToHex(p.h, p.s, p.v);
        setHsv(p);
        setHexInput(pHex);
        if (typeof onPreview === 'function') onPreview(pHex);
        else onChange(pHex);
        pendingHsvRef.current = null;
      });
    }
  }, [onChange, onPreview]);

  // Handle hue slider - use ref to get latest hsv
  const handleHueChange = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!hueRef.current) return;
    
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    const newHsv = { ...hsvRef.current, h: x * 360 };
    // Schedule RAF update
    pendingHsvRef.current = newHsv;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const p = pendingHsvRef.current;
        if (!p) return;
        const pHex = hsvToHex(p.h, p.s, p.v);
        setHsv(p);
        setHexInput(pHex);
        if (typeof onPreview === 'function') onPreview(pHex);
        else onChange(pHex);
        pendingHsvRef.current = null;
      });
    }
  }, [onChange, onPreview]);

  // Handle hex input
  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const newHsv = hexToHsv(value);
      setHsv(newHsv);
      onChange(value);
    }
  };

  // Mouse event handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSatVal) handleSatValChange(e);
      if (isDraggingHue) handleHueChange(e);
    };

    const handleMouseUp = () => {
      setIsDraggingSatVal(false);
      setIsDraggingHue(false);
      // Flush any pending RAF update synchronously and commit final color
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const p = pendingHsvRef.current ?? hsvRef.current;
      pendingHsvRef.current = null;
      try {
        const final = hsvToHex(p.h, p.s, p.v);
        // Update state synchronously to reflect final value immediately
        setHsv(p);
        setHexInput(final);
        onChange(final);
      } catch {}
    };

    if (isDraggingSatVal || isDraggingHue) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSatVal, isDraggingHue, handleSatValChange, handleHueChange, onChange]);

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div 
      className={cn(
        "bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl shadow-2xl p-3 w-64",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div className="flex mb-3 bg-[#2a2a2a] rounded-lg p-1">
        <button
          onClick={() => setActiveTab('picker')}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
            activeTab === 'picker' 
              ? "bg-[#3a3a3a] text-white" 
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          Picker
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={cn(
            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
            activeTab === 'presets' 
              ? "bg-[#3a3a3a] text-white" 
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          Presets
        </button>
      </div>

      {activeTab === 'picker' ? (
        <>
          {/* Saturation/Value picker */}
          <div
            ref={satValRef}
            className="relative w-full h-36 rounded-lg cursor-crosshair mb-3 overflow-hidden"
            style={{
              background: `linear-gradient(to bottom, transparent, black),
                          linear-gradient(to right, white, hsl(${hsv.h}, 100%, 50%))`
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsDraggingSatVal(true);
              handleSatValChange(e);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Picker indicator */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: currentHex
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            className="relative w-full h-4 rounded-full cursor-pointer mb-3"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsDraggingHue(true);
              handleHueChange(e);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Hue indicator */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-0 pointer-events-none"
              style={{
                left: `${(hsv.h / 360) * 100}%`,
                top: 0,
                backgroundColor: `hsl(${hsv.h}, 100%, 50%)`
              }}
            />
          </div>

          {/* Hex input and preview */}
          <div className="flex items-center gap-2 w-full">
            <div
              className="w-8 h-8 rounded-lg border border-[#3a3a3a] flex-shrink-0"
              style={{ backgroundColor: currentHex }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-white text-sm font-mono focus:outline-none focus:border-[#4a4a4a]"
              placeholder="#000000"
            />
          </div>
        </>
      ) : (
        /* Preset colors grid */
        <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-transparent">
          {presetColors.map((preset) => (
            <button
              key={preset.value}
              onClick={() => {
                // Apply preset but do not close picker - allow continued adjustments
                onChange(preset.value);
              }}
              className={cn(
                "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-lg relative group",
                color === preset.value ? "border-white shadow-md" : "border-transparent hover:border-[#4a4a4a]"
              )}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            >
              {/* Checkmark for selected color */}
              {color === preset.value && (
                <svg className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Close button */}
      {onClose && (
        <button
          onClick={() => {
            try {
              const final = hsvToHex(hsv.h, hsv.s, hsv.v);
              onChange(final);
            } catch {}
            onClose();
          }}
          className="w-full mt-3 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 text-sm rounded-lg transition-colors"
        >
          Done
        </button>
      )}
    </div>
  );
};

export default HudColorPicker;
