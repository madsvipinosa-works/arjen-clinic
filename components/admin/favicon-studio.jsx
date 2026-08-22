"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Upload,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Move,
  Sparkles,
  Check,
  Loader2,
  Trash2,
  Eye,
  Grid,
  RefreshCw,
  Copy,
  Bookmark,
  Share2,
  X,
  Plus,
} from "lucide-react";

export function FaviconStudio({
  currentFaviconUrl = null,
  navbarLogoUrl = null,
  onSaveFavicon,
  onRemoveFavicon,
  onSyncWithLogo,
  isSaving = false,
  savedSuccess = false,
}) {
  // Source Image
  const [imageSrc, setImageSrc] = useState(currentFaviconUrl || navbarLogoUrl || null);
  const [isNewUpload, setIsNewUpload] = useState(false);

  // Transform States
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [bgFill, setBgFill] = useState("transparent"); // "transparent" | "white" | "rose" | "dark"
  const [showGrid, setShowGrid] = useState(true);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // DOM / Canvas Refs
  const viewportRef = useRef(null);
  const fileInputRef = useRef(null);
  const loadedImageRef = useRef(null);

  // Live preview image state
  const [previewDataUrl, setPreviewDataUrl] = useState(currentFaviconUrl || navbarLogoUrl || null);

  // Keep source updated if currentFaviconUrl changes and user hasn't uploaded a new local file
  useEffect(() => {
    if (currentFaviconUrl && !isNewUpload) {
      setImageSrc(currentFaviconUrl);
      setPreviewDataUrl(currentFaviconUrl);
    }
  }, [currentFaviconUrl, isNewUpload]);

  // Render high-quality canvas preview whenever transforms change
  const renderPreview = useCallback(() => {
    const img = loadedImageRef.current;
    if (!img) return;

    const exportSize = 256; // High-DPI master size for favicon
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Background fill
    if (bgFill === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else if (bgFill === "rose") {
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else if (bgFill === "dark") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else {
      ctx.clearRect(0, 0, exportSize, exportSize);
    }

    ctx.save();
    ctx.translate(exportSize / 2, exportSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.scale(zoom, zoom);

    const scaleFactor = exportSize / 200;
    ctx.translate(panX * scaleFactor, panY * scaleFactor);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const imgAspect = img.width / img.height;
    let drawWidth = exportSize;
    let drawHeight = exportSize;

    if (imgAspect > 1) {
      drawHeight = exportSize / imgAspect;
    } else {
      drawWidth = exportSize * imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    try {
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewDataUrl(dataUrl);
    } catch (e) {
      console.warn("Could not export live preview data URL:", e);
    }
  }, [zoom, panX, panY, rotation, flipH, flipV, bgFill]);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      loadedImageRef.current = null;
      setPreviewDataUrl(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImageRef.current = img;
      renderPreview();
    };
    img.onerror = () => {
      console.error("Failed to load favicon source image:", imageSrc);
    };
    img.src = imageSrc;
  }, [imageSrc, renderPreview]);

  // Re-render preview whenever transforms change
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Handle file selection from local device
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsNewUpload(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === "string") {
        setImageSrc(dataUrl);
        setZoom(1.0);
        setPanX(0);
        setPanY(0);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag to pan interaction
  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { x: panX, y: panY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanX(Math.round(panStartRef.current.x + dx));
    setPanY(Math.round(panStartRef.current.y + dy));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel to zoom in viewport
  const handleWheel = (e) => {
    if (!imageSrc) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(0.4, Number((prev + delta).toFixed(2))), 4.0));
  };

  // Rotation helpers
  const rotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const rotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const toggleFlipH = () => setFlipH((prev) => !prev);
  const toggleFlipV = () => setFlipV((prev) => !prev);

  // Reset all transforms
  const handleReset = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBgFill("transparent");
  };

  // Center placement
  const handleCenter = () => {
    setPanX(0);
    setPanY(0);
  };

  // Quick Sync with Navbar Logo
  const handleUseNavbarLogo = () => {
    if (!navbarLogoUrl) return;
    setImageSrc(navbarLogoUrl);
    setIsNewUpload(false);
    handleReset();
  };

  // Save handler
  const handleSaveFavicon = async () => {
    const img = loadedImageRef.current;
    if (!img) return;

    const exportSize = 256;
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (bgFill === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else if (bgFill === "rose") {
      ctx.fillStyle = "#e11d48";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else if (bgFill === "dark") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else {
      ctx.clearRect(0, 0, exportSize, exportSize);
    }

    ctx.save();
    ctx.translate(exportSize / 2, exportSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.scale(zoom, zoom);

    const scaleFactor = exportSize / 200;
    ctx.translate(panX * scaleFactor, panY * scaleFactor);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const imgAspect = img.width / img.height;
    let drawWidth = exportSize;
    let drawHeight = exportSize;

    if (imgAspect > 1) {
      drawHeight = exportSize / imgAspect;
    } else {
      drawWidth = exportSize * imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], "favicon.png", { type: "image/png" });
        const formData = new FormData();
        formData.append("action", "upload");
        formData.append("favicon_file", file);

        if (onSaveFavicon) {
          await onSaveFavicon(formData);
        }
      },
      "image/png"
    );
  };

  return (
    <Card className="border-rose-100 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-rose-50/70 via-white to-rose-50/40 border-b border-rose-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-rose-900 flex items-center text-xl font-black tracking-tight">
              <Globe className="w-5 h-5 mr-2.5 text-rose-500" />
              Website Browser Favicon Studio
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Customize the icon that appears on browser tabs, bookmarks, search engine results, and mobile home shortcuts.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {currentFaviconUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemoveFavicon}
                disabled={isSaving}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove Favicon
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* ── Top Action / Source Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/40 border border-rose-100/80">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm px-4 h-10 gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Favicon Image
            </Button>

            {navbarLogoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseNavbarLogo}
                className="rounded-xl text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Use Navbar Logo as Source
              </Button>
            )}

            {currentFaviconUrl && imageSrc !== currentFaviconUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImageSrc(currentFaviconUrl);
                  setIsNewUpload(false);
                  handleReset();
                }}
                className="rounded-xl text-xs font-bold border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Revert to Active Favicon
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Recommended: square emblem / monogram with high contrast</span>
          </div>
        </div>

        {/* ── Main Studio Grid ── */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* ════ LEFT: Interactive Framing Viewport & Controls (7 Cols) ════ */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black tracking-wider uppercase text-gray-700 flex items-center gap-2">
                <Move className="w-4 h-4 text-rose-500" />
                Favicon Framing Viewport
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    showGrid ? "bg-rose-100 text-rose-800" : "text-gray-400 hover:text-gray-700"
                  }`}
                  title="Toggle Alignment Grid"
                >
                  <Grid className="w-3.5 h-3.5 mr-1" />
                  Grid
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 px-2.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer"
                  title="Reset all adjustments"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Viewport Box */}
            <div className="relative w-full max-w-[300px] sm:max-w-[320px] mx-auto aspect-square rounded-3xl bg-slate-900 border-4 border-rose-100 shadow-xl overflow-hidden flex items-center justify-center select-none group">
              {imageSrc ? (
                <>
                  {/* Interactive Draggable Surface */}
                  <div
                    ref={viewportRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    className={`w-[200px] h-[200px] relative rounded-2xl overflow-hidden shadow-inner flex items-center justify-center transition-all ${
                      isDragging ? "cursor-grabbing" : "cursor-grab"
                    } ${
                      bgFill === "white"
                        ? "bg-white"
                        : bgFill === "rose"
                        ? "bg-rose-600"
                        : bgFill === "dark"
                        ? "bg-slate-950"
                        : "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:10px_10px] bg-slate-800"
                    }`}
                  >
                    {/* Cutout Mask Guide Overlay */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-rose-400/70 pointer-events-none z-20 shadow-[0_0_0_9999px_rgba(15,23,42,0.75)]" />

                    {/* Alignment Crosshairs Grid */}
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none z-20 opacity-40">
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-rose-400" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-rose-400" />
                      </div>
                    )}

                    {/* Transformed Image Preview */}
                    <div
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${
                          flipH ? -zoom : zoom
                        }, ${flipV ? -zoom : zoom}) rotate(${rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      className="w-full h-full flex items-center justify-center pointer-events-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc}
                        alt="Favicon Framing Source"
                        className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* On-Canvas Hint Pill */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md text-white/90 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/10 pointer-events-none shadow-md z-30 flex items-center gap-1.5">
                    <Move className="w-3 h-3 text-rose-400" />
                    <span>Drag to Pan · Scroll to Zoom</span>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <Globe className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold text-slate-300">No Favicon Selected</p>
                  <p className="text-[11px] text-slate-500">
                    Upload an image or copy from your navbar logo.
                  </p>
                </div>
              )}
            </div>

            {/* ── Interactive Toolbars (Zoom, Rotate, Pan, Background) ── */}
            {imageSrc && (
              <div className="space-y-4 pt-1">
                
                {/* 1. Zoom Slider */}
                <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-rose-500" />
                      Scale &amp; Tight Crop (Remove Edges)
                    </span>
                    <span className="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                      className="h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <input
                      type="range"
                      min="0.4"
                      max="3.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-rose-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setZoom((prev) => Math.min(3.5, Number((prev + 0.1).toFixed(2))))}
                      className="h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoom(1.0)}
                      className="h-8 text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      100%
                    </Button>
                  </div>
                </div>

                {/* 2. Orientation & Rotation */}
                <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-rose-500" />
                      Orientation &amp; Rotation
                    </span>
                    <span className="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                      {rotation}°
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={rotateLeft}
                      className="rounded-xl text-xs font-bold text-gray-700 hover:text-rose-600 hover:bg-rose-50 border-gray-200 h-9 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      90° Left
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={rotateRight}
                      className="rounded-xl text-xs font-bold text-gray-700 hover:text-rose-600 hover:bg-rose-50 border-gray-200 h-9 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      90° Right
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleFlipH}
                      className={`rounded-xl text-xs font-bold h-9 transition-colors cursor-pointer ${
                        flipH ? "bg-rose-50 border-rose-300 text-rose-700" : "border-gray-200 text-gray-700"
                      }`}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      Flip H
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleFlipV}
                      className={`rounded-xl text-xs font-bold h-9 transition-colors cursor-pointer ${
                        flipV ? "bg-rose-50 border-rose-300 text-rose-700" : "border-gray-200 text-gray-700"
                      }`}
                    >
                      <FlipVertical className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      Flip V
                    </Button>
                  </div>
                </div>

                {/* 3. Positioning & Background Fill */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Position Center */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-rose-500" />
                        Center Placement
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCenter}
                        className="h-5 px-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        Reset Center
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 font-mono">
                      <div className="bg-gray-50 p-1.5 rounded-lg border text-center">
                        X: <span className="font-bold text-gray-800">{panX}px</span>
                      </div>
                      <div className="bg-gray-50 p-1.5 rounded-lg border text-center">
                        Y: <span className="font-bold text-gray-800">{panY}px</span>
                      </div>
                    </div>
                  </div>

                  {/* Background Fill Tone */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                    <span className="text-xs font-bold text-gray-700 block">
                      Icon Background Fill
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => setBgFill("transparent")}
                        className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          bgFill === "transparent"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setBgFill("white")}
                        className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          bgFill === "white"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        White
                      </button>
                      <button
                        type="button"
                        onClick={() => setBgFill("rose")}
                        className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          bgFill === "rose"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Rose
                      </button>
                      <button
                        type="button"
                        onClick={() => setBgFill("dark")}
                        className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          bgFill === "dark"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ════ RIGHT: Real-time Simulated Browser Tabs & Previews (5 Cols) ════ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black tracking-wider uppercase text-gray-700 flex items-center gap-2">
                <Eye className="w-4 h-4 text-rose-500" />
                Browser Tab Simulations
              </Label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Preview
              </span>
            </div>

            {/* 1. Chrome / Edge Browser Tab Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                1. Desktop Browser Tab (16x16 / 32x32)
              </span>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden select-none">
                {/* Browser Top Window Bar */}
                <div className="bg-slate-950 px-3 py-2 flex items-center gap-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  {/* Browser Tab */}
                  <div className="flex items-center gap-2 bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded-t-xl max-w-[200px] border-t border-x border-slate-700 shadow-sm ml-2">
                    <div className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0 overflow-hidden bg-white/10">
                      {previewDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewDataUrl} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <Globe className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    <span className="truncate text-[11px] font-semibold">AR-JEN Maternity Clinic</span>
                    <X className="w-3 h-3 text-slate-400 shrink-0 hover:text-white ml-auto" />
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                </div>
                {/* Simulated URL Bar */}
                <div className="bg-slate-900 p-2.5 flex items-center gap-2">
                  <div className="bg-slate-800/90 rounded-lg px-3 py-1 text-[11px] text-slate-300 flex-1 flex items-center gap-2 border border-slate-700/60 font-mono">
                    <span className="text-emerald-400 text-xs">🔒</span>
                    <span>https://arjenclinic.com</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Light Theme Browser Tab Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                2. Light Mode Browser Window
              </span>
              <div className="rounded-2xl bg-gray-100 border border-gray-300/80 shadow-md overflow-hidden select-none">
                <div className="bg-gray-200 px-3 py-2 flex items-center gap-2 border-b border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>
                  </div>
                  <div className="flex items-center gap-2 bg-white text-gray-800 text-xs px-3 py-1.5 rounded-t-xl max-w-[200px] border-t border-x border-gray-300 shadow-xs ml-2">
                    <div className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0 overflow-hidden bg-gray-50">
                      {previewDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewDataUrl} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <Globe className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <span className="truncate text-[11px] font-semibold">AR-JEN Maternity Clinic</span>
                    <X className="w-3 h-3 text-gray-400 shrink-0 hover:text-gray-700 ml-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Google Search Snippet Preview */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                3. Search Engine / Bookmark Result
              </span>
              <div className="flex items-start gap-3 pt-1">
                <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {previewDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewDataUrl} alt="Search Favicon" className="w-4 h-4 object-contain" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium leading-none">
                    <span>AR-JEN Maternity Clinic</span>
                    <span className="text-[10px] text-gray-400">· arjenclinic.com</span>
                  </div>
                  <h4 className="text-sm font-bold text-blue-700 hover:underline mt-1 leading-snug">
                    Exceptional Maternity Care in Dasmariñas City
                  </h4>
                </div>
              </div>
            </div>

            {/* ── Save Button ── */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleSaveFavicon}
                disabled={!imageSrc || isSaving}
                className={`w-full font-black text-sm h-12 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer ${
                  savedSuccess
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Publishing Favicon...
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Favicon Saved &amp; Live!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Save &amp; Apply Website Favicon
                  </>
                )}
              </Button>
              <p className="text-[11px] text-gray-400 text-center mt-2 font-medium">
                Generates high-crisp web icon and updates root metadata for all browser tabs.
              </p>
            </div>

          </div>

        </div>
      </CardContent>
    </Card>
  );
}
