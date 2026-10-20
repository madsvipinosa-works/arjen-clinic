"use client";

import React, { useState } from "react";
import {
  Clock,
  Users,
  ShieldCheck,
  HeartPulse,
  Building,
  Baby,
  Star,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  X,
  Eye,
  Sparkle,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Available curated icons suitable for a maternity and lying-in clinic
export const AVAILABLE_ICONS = [
  { id: "Clock", label: "24/7 Hours & Monitoring", Icon: Clock },
  { id: "Users", label: "Expert Midwives & Staff", Icon: Users },
  { id: "ShieldCheck", label: "PhilHealth & Safe Care", Icon: ShieldCheck },
  { id: "HeartPulse", label: "Maternal Care & Vitals", Icon: HeartPulse },
  { id: "Building", label: "Clean Facilities & Rooms", Icon: Building },
  { id: "Baby", label: "Newborn Care & Delivery", Icon: Baby },
  { id: "Star", label: "Accredited Excellence", Icon: Star },
  { id: "Sparkles", label: "Modern & Sanitized", Icon: Sparkles },
];

// Standard Philippine Maternity Clinic Presets
export const CLINIC_PRESETS = [
  {
    title: "PhilHealth Accredited",
    description: "Accessible, affordable maternal and newborn care covered by PhilHealth MCP.",
    icon: "ShieldCheck",
  },
  {
    title: "24/7 Normal Delivery",
    description: "Round-the-clock emergency admission, midwife attendance, and maternal monitoring.",
    icon: "Clock",
  },
  {
    title: "Expert Midwives",
    description: "Licensed, certified midwives with compassionate clinical care and OB-GYN on-call.",
    icon: "Users",
  },
  {
    title: "Comfortable Facilities",
    description: "Clean, air-conditioned private and semi-private maternal recovery suites.",
    icon: "Building",
  },
  {
    title: "Newborn Screening (NBS)",
    description: "Complete DOH newborn blood spot screening, hearing tests, and birth vaccines.",
    icon: "Baby",
  },
  {
    title: "Compassionate Care",
    description: "Gentle birthing support and respectful family-centered care for every mother.",
    icon: "HeartPulse",
  },
];

export const DEFAULT_TRUST_POINTS = [
  {
    id: "tp_1",
    title: "24/7 Monitoring",
    description: "Round-the-clock professional care and maternal surveillance.",
    icon: "Clock",
  },
  {
    id: "tp_2",
    title: "Expert Midwives",
    description: "Certified midwives and obstetric consultants for safe, gentle deliveries.",
    icon: "Users",
  },
  {
    id: "tp_3",
    title: "Modern Facilities",
    description: "Clean lying-in suites equipped with essential maternity and newborn tools.",
    icon: "Building",
  },
  {
    id: "tp_4",
    title: "PhilHealth Accredited",
    description: "Accessible and affordable lying-in care covered under PhilHealth MCP.",
    icon: "ShieldCheck",
  },
];

function getIconComponent(iconName) {
  const match = AVAILABLE_ICONS.find((item) => item.id === iconName);
  return match ? match.Icon : ShieldCheck;
}

export function TrustPointsManager({ initialTrustPoints, onChange }) {
  // Normalize initial points (handling both title/label, description/desc)
  const normalizePoints = (points) => {
    if (!Array.isArray(points) || points.length === 0) {
      return DEFAULT_TRUST_POINTS;
    }
    return points.map((p, idx) => ({
      id: p.id || `tp_${Date.now()}_${idx}`,
      title: p.title || p.label || "",
      description: p.description || p.desc || "",
      icon: p.icon || "ShieldCheck",
    }));
  };

  const [points, setPoints] = useState(() => normalizePoints(initialTrustPoints));
  const [activeIconPicker, setActiveIconPicker] = useState(null); // id of point currently picking icon
  const [deletingId, setDeletingId] = useState(null); // id of point awaiting delete confirmation

  const updatePoints = (newPoints) => {
    setPoints(newPoints);
    if (onChange) onChange(newPoints);
  };

  const handleFieldChange = (id, field, value) => {
    const updated = points.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    updatePoints(updated);
  };

  const handleIconSelect = (id, iconId) => {
    const updated = points.map((p) => (p.id === id ? { ...p, icon: iconId } : p));
    updatePoints(updated);
    setActiveIconPicker(null);
  };

  const handleAddPoint = () => {
    if (points.length >= 8) return;
    const newPoint = {
      id: `tp_${Date.now()}`,
      title: "New Clinic Highlight",
      description: "Short explanation of this clinic benefit or maternal feature...",
      icon: "ShieldCheck",
    };
    updatePoints([...points, newPoint]);
  };

  const handleApplyPreset = (preset) => {
    if (points.length >= 8) return;
    const newPoint = {
      id: `tp_${Date.now()}`,
      title: preset.title,
      description: preset.description,
      icon: preset.icon,
    };
    updatePoints([...points, newPoint]);
  };

  const handleMove = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= points.length) return;
    const reordered = [...points];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    updatePoints(reordered);
  };

  const handleConfirmDelete = (id) => {
    const filtered = points.filter((p) => p.id !== id);
    updatePoints(filtered);
    setDeletingId(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all trust points back to the standard clinic defaults?")) {
      updatePoints(DEFAULT_TRUST_POINTS);
      setDeletingId(null);
      setActiveIconPicker(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden input to pass clean JSON into parent form submission automatically */}
      <input
        type="hidden"
        name="trust_points"
        value={JSON.stringify(
          points.map(({ title, description, icon }) => ({
            title: title.trim(),
            description: description.trim(),
            icon: icon.trim(),
          }))
        )}
      />

      {/* ── Header Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-rose-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-rose-500" />
              Clinic Trust Points &amp; Value Highlights
            </h3>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                points.length === 4
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : points.length < 4
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {points.length} {points.length === 1 ? "Card" : "Cards"} Configured
              {points.length === 4 && " (Optimal 2×2 Layout)"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Visual cards shown in the <strong>&quot;Why Choose AR-JEN&quot;</strong> section on the homepage. Edit titles, descriptions, and icons visually without dealing with raw code.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 border-gray-200 hover:bg-gray-100 h-9 gap-1.5"
            title="Reset to clinic defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </Button>

          <Button
            type="button"
            onClick={handleAddPoint}
            disabled={points.length >= 8}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5 shadow-sm shadow-rose-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Trust Point
          </Button>
        </div>
      </div>

      {/* ── 1-Click Lying-In Clinical Presets ── */}
      <div className="bg-rose-50/40 border border-rose-100/80 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900/80 flex items-center gap-1.5">
            <Sparkle className="w-3.5 h-3.5 text-rose-500" />
            Quick Clinical Presets (Click to add)
          </span>
          <span className="text-[10px] text-gray-400">Standard Philippine lying-in highlights</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CLINIC_PRESETS.map((preset, idx) => {
            const PresetIcon = getIconComponent(preset.icon);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                disabled={points.length >= 8}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100/60 border border-rose-200/70 text-gray-700 hover:text-rose-700 text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <PresetIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>+ {preset.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Editable Trust Point Cards ── */}
      <div className="space-y-4">
        {points.map((point, index) => {
          const PointIcon = getIconComponent(point.icon);
          const isIconPickerOpen = activeIconPicker === point.id;
          const isAwaitingDelete = deletingId === point.id;

          return (
            <div
              key={point.id}
              className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 relative"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Column 1: Card # and Icon Selector (col-span-3) */}
                <div className="lg:col-span-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono">
                      Card #{index + 1}
                    </span>

                    {/* Move controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        title="Move Card Up"
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === points.length - 1}
                        title="Move Card Down"
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Icon Selector Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveIconPicker(isIconPickerOpen ? null : point.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-rose-200/80 bg-rose-50/40 hover:bg-rose-100/60 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <PointIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400">Selected Icon</p>
                          <p className="text-xs font-bold text-gray-900">{point.icon}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 group-hover:underline">
                        {isIconPickerOpen ? "Close" : "Change"}
                      </span>
                    </button>

                    {/* Icon Selection Popover / Grid */}
                    {isIconPickerOpen && (
                      <div className="absolute left-0 top-full mt-2 z-20 w-72 p-3 bg-white rounded-2xl border border-gray-200 shadow-xl space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                          <p className="text-[11px] font-bold text-gray-700">Choose Icon</p>
                          <button
                            type="button"
                            onClick={() => setActiveIconPicker(null)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {AVAILABLE_ICONS.map((item) => {
                            const ItemIcon = item.Icon;
                            const isSelected = point.icon === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleIconSelect(point.id, item.id)}
                                title={item.label}
                                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-rose-500 text-white shadow-xs"
                                    : "hover:bg-rose-50 text-gray-700 hover:text-rose-600 border border-transparent hover:border-rose-100"
                                }`}
                              >
                                <ItemIcon className="w-5 h-5" />
                                <span className="text-[9px] font-bold mt-1 truncate max-w-full">
                                  {item.id}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Title & Description inputs (col-span-8) */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-700">
                        Highlight Title / Headline
                      </Label>
                      <span
                        className={`text-[10px] font-mono ${
                          point.title.length > 28 ? "text-amber-600 font-bold" : "text-gray-400"
                        }`}
                      >
                        {point.title.length}/28 chars
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={point.title}
                      onChange={(e) => handleFieldChange(point.id, "title", e.target.value)}
                      placeholder="e.g. 24/7 Monitoring"
                      className="rounded-xl h-10 border-gray-200 text-sm font-semibold text-gray-900 focus:border-rose-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-700">
                        Description / Clinic Details
                      </Label>
                      <span
                        className={`text-[10px] font-mono ${
                          point.description.length > 90 ? "text-amber-600 font-bold" : "text-gray-400"
                        }`}
                      >
                        {point.description.length}/90 chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={point.description}
                      onChange={(e) => handleFieldChange(point.id, "description", e.target.value)}
                      placeholder="e.g. Round-the-clock professional care and fetal surveillance."
                      className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Column 3: Delete Action (col-span-1) */}
                <div className="lg:col-span-1 flex lg:justify-end items-center pt-2 lg:pt-0">
                  {isAwaitingDelete ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200 animate-in fade-in">
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(point.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded-lg text-[10px]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(point.id)}
                      disabled={points.length <= 1}
                      title="Remove this card"
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Live Homepage Simulation Preview ── */}
      <div className="mt-8 pt-6 border-t border-rose-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Live Public Preview (As Seen by Expecting Mothers)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Desktop &amp; Mobile Responsive Grid
          </span>
        </div>

        <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl p-6 border border-gray-200/90 shadow-inner">
          <div className="max-w-2xl mx-auto space-y-2 mb-6 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600">
              Why Choose AR-JEN
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-slate-800">
              A Clinic That Cares Like <span className="text-rose-600">Family</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {points.map((point, idx) => {
              const PointIcon = getIconComponent(point.icon);
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs hover:shadow-sm transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <PointIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">
                      {point.title || "Feature Title"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {point.description || "Description of this lying-in clinic service..."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
