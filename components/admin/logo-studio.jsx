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
  Image as ImageIcon,
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
  Heart,
  PhoneCall,
} from "lucide-react";

export function LogoStudio({
  currentLogoUrl = null,
  onSaveLogo,
  onRemoveLogo,
  isSaving = false,
  savedSuccess = false,
}) {
  // Source Image
  const [imageSrc, setImageSrc] = useState(currentLogoUrl || null);
  const [originalFileName, setOriginalFileName] = useState("logo.png");
  const [isNewUpload, setIsNewUpload] = useState(false);

  // Transform States
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0); // in degrees
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [bgFill, setBgFill] = useState("transparent"); // "transparent" | "white" | "rose"
  const [showGrid, setShowGrid] = useState(true);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // DOM / Canvas Refs
  const viewportRef = useRef(null);
  const fileInputRef = useRef(null);
  const loadedImageRef = useRef(null);

  // Live preview image state for the simulated navbars
  const [previewDataUrl, setPreviewDataUrl] = useState(currentLogoUrl || null);

  // Keep source updated if currentLogoUrl changes and user hasn't uploaded a new local file
  useEffect(() => {
    if (currentLogoUrl && !isNewUpload) {
      setImageSrc(currentLogoUrl);
      setPreviewDataUrl(currentLogoUrl);
    }
  }, [currentLogoUrl, isNewUpload]);

  // Render high-quality canvas preview whenever transforms change
  const renderPreview = useCallback(() => {
    const img = loadedImageRef.current;
    if (!img) return;

    const exportSize = 512; // High-DPI master size
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Optional background fill
    if (bgFill === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else if (bgFill === "rose") {
      ctx.fillStyle = "#fff1f2";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else {
      ctx.clearRect(0, 0, exportSize, exportSize);
    }

    ctx.save();
    // Move to center
    ctx.translate(exportSize / 2, exportSize / 2);

    // Apply rotation (in radians)
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply flips
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Apply zoom
    ctx.scale(zoom, zoom);

    // Apply pan offset (scaled to export resolution relative to 240px viewport)
    const scaleFactor = exportSize / 240;
    ctx.translate(panX * scaleFactor, panY * scaleFactor);

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw image centered
    const imgAspect = img.width / img.height;
    let drawWidth = exportSize;
    let drawHeight = exportSize;

    if (imgAspect > 1) {
      drawHeight = exportSize / imgAspect;
    } else {
      drawWidth = exportSize * imgAspect;
    }

    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    try {
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewDataUrl(dataUrl);
    } catch (e) {
      // If CORS prevents dataURL extraction from external cross-origin images, fallback to current source
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
      console.error("Failed to load image for editing:", imageSrc);
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

    setOriginalFileName(file.name);
    setIsNewUpload(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === "string") {
        setImageSrc(dataUrl);
        // Reset transforms for new image
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

  // Final Export and Save handler
  const handleSaveCroppedLogo = async () => {
    const img = loadedImageRef.current;
    if (!img) return;

    const exportSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    if (bgFill === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else if (bgFill === "rose") {
      ctx.fillStyle = "#fff1f2";
      ctx.fillRect(0, 0, exportSize, exportSize);
    } else {
      ctx.clearRect(0, 0, exportSize, exportSize);
    }

    ctx.save();
    ctx.translate(exportSize / 2, exportSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.scale(zoom, zoom);

    const scaleFactor = exportSize / 240;
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
        const file = new File([blob], "navbar-logo.png", { type: "image/png" });
        const formData = new FormData();
        formData.append("action", "upload");
        formData.append("navbar_logo", file);

        if (onSaveLogo) {
          await onSaveLogo(formData);
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
              <Sparkles className="w-5 h-5 mr-2.5 text-rose-500" />
              Navbar Logo Studio &amp; Framing Editor
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Adjust placement, zoom in past box edges, fix orientation/rotation, and pan to frame your emblem perfectly.
            </CardDescription>
          </div>
          {currentLogoUrl && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRemoveLogo}
                disabled={isSaving}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove Logo
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* ── Top Upload / Select Bar ── */}
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
              {imageSrc ? "Upload / Replace Image" : "Choose Logo Image"}
            </Button>

            {currentLogoUrl && imageSrc !== currentLogoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImageSrc(currentLogoUrl);
                  setIsNewUpload(false);
                  handleReset();
                }}
                className="rounded-xl text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Revert to Live Logo
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Supports transparent PNGs, SVG, WebP, JPG photos</span>
          </div>
        </div>

        {/* ── Main Studio Grid (Editor on Left, Live Previews on Right) ── */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* ════ LEFT: Interactive Framing Viewport & Controls (7 Cols) ════ */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black tracking-wider uppercase text-gray-700 flex items-center gap-2">
                <Move className="w-4 h-4 text-rose-500" />
                Interactive Framing Viewport
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
            <div className="relative w-full max-w-[340px] sm:max-w-[380px] mx-auto aspect-square rounded-3xl bg-slate-900 border-4 border-rose-100 shadow-xl overflow-hidden flex items-center justify-center select-none group">
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
                    className={`w-[240px] h-[240px] relative rounded-3xl overflow-hidden shadow-inner flex items-center justify-center transition-all ${
                      isDragging ? "cursor-grabbing" : "cursor-grab"
                    } ${
                      bgFill === "white"
                        ? "bg-white"
                        : bgFill === "rose"
                        ? "bg-rose-50"
                        : "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:12px_12px] bg-slate-800"
                    }`}
                  >
                    {/* Badge Cutout Mask Guide Overlay */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-rose-400/60 pointer-events-none z-20 shadow-[0_0_0_9999px_rgba(15,23,42,0.7)]" />

                    {/* Alignment Crosshairs Grid */}
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none z-20 opacity-40">
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-rose-400" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-rose-400" />
                        <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-white/20 border-t border-dashed border-white/40" />
                        <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-white/20 border-t border-dashed border-white/40" />
                        <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/20 border-l border-dashed border-white/40" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/20 border-l border-dashed border-white/40" />
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
                        alt="Logo Framing Source"
                        className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* On-Canvas Hint Floating Pill */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md text-white/90 text-[11px] font-semibold px-3 py-1 rounded-full border border-white/10 pointer-events-none shadow-md z-30 flex items-center gap-1.5">
                    <Move className="w-3 h-3 text-rose-400" />
                    <span>Click &amp; Drag to Pan · Scroll to Zoom</span>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-400 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center border border-slate-700">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">No Logo Selected</p>
                  <p className="text-xs text-slate-500">
                    Upload an image or select a file to start editing.
                  </p>
                </div>
              )}
            </div>

            {/* ── Interactive Toolbars (Zoom, Rotate, Pan, Background) ── */}
            {imageSrc && (
              <div className="space-y-4 pt-2">
                
                {/* 1. Zoom Slider */}
                <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-rose-500" />
                      Zoom / Scaling (Crop Out Box Edges)
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

                {/* 2. Orientation & Rotation Controls */}
                <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span className="flex items-center gap-1.5">
                      <RotateCw className="w-3.5 h-3.5 text-rose-500" />
                      Orientation &amp; Rotation Fix
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
                      Rotate 90° Left
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={rotateRight}
                      className="rounded-xl text-xs font-bold text-gray-700 hover:text-rose-600 hover:bg-rose-50 border-gray-200 h-9 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      Rotate 90° Right
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
                      Flip Horiz
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
                      Flip Vert
                    </Button>
                  </div>

                  {/* Fine Angle Slider */}
                  <div className="pt-1 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">Fine Angle:</span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600 h-1 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRotation(0)}
                      className="h-6 px-2 text-[10px] font-bold text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      0°
                    </Button>
                  </div>
                </div>

                {/* 3. Positioning & Background Tone */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Position Center & Offsets */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-rose-500" />
                        Pan Offset
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCenter}
                        className="h-5 px-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        Center
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
                      Badge Background Tone
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBgFill("transparent")}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          bgFill === "transparent"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Transparent
                      </button>
                      <button
                        type="button"
                        onClick={() => setBgFill("white")}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          bgFill === "rose"
                            ? "bg-rose-50 border-rose-400 text-rose-700 shadow-xs"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        Rose Soft
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ════ RIGHT: Real-time Live Navbar Previews (5 Cols) ════ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black tracking-wider uppercase text-gray-700 flex items-center gap-2">
                <Eye className="w-4 h-4 text-rose-500" />
                Live Navbar Simulation
              </Label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Real-Time Render
              </span>
            </div>

            {/* 1. Hero Mode Simulated Header (Transparent/Rose Navbar) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                1. Hero Header State (Top of page)
              </span>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 shadow-lg border border-rose-400/40 text-white select-none">
                <div className="flex items-center justify-between">
                  {/* Logo Brand Group */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-white/40 bg-white/95 shadow-xs">
                      {previewDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewDataUrl}
                          alt="Simulated Logo"
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-rose-600">
                          <Heart className="h-4 w-4 fill-rose-600" />
                          <span className="text-[6px] font-black uppercase">AR·JEN</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center leading-none">
                      <div className="flex items-center gap-1">
                        <span className="font-serif text-base font-black tracking-tight text-white">
                          AR-JEN
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.2 bg-white/20 text-white rounded-full uppercase">
                          Clinic
                        </span>
                      </div>
                      <span className="text-[9px] font-medium tracking-wider uppercase text-white/80 mt-0.5">
                        Maternity &amp; Lying-In
                      </span>
                    </div>
                  </div>

                  {/* Dummy CTA */}
                  <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white">
                    <PhoneCall className="h-3 w-3" />
                    <span>24/7 Care</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Scrolled Mode Simulated Header (Sticky White Navbar) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                2. Scrolled Header State (Sticky on scroll)
              </span>
              <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-md border border-rose-100/90 text-slate-900 select-none">
                <div className="flex items-center justify-between">
                  {/* Logo Brand Group */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-rose-200 bg-white shadow-xs">
                      {previewDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={previewDataUrl}
                          alt="Simulated Logo"
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-rose-600">
                          <Heart className="h-4 w-4 fill-rose-600" />
                          <span className="text-[6px] font-black uppercase">AR·JEN</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center leading-none">
                      <div className="flex items-center gap-1">
                        <span className="font-serif text-base font-black tracking-tight text-slate-900">
                          AR-JEN
                        </span>
                        <span className="text-[8px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded-full uppercase">
                          Clinic
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold tracking-wider uppercase text-gray-400 mt-0.5">
                        Maternity &amp; Lying-In
                      </span>
                    </div>
                  </div>

                  {/* Dummy Nav items */}
                  <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-slate-600">
                    <span className="text-rose-600">Home</span>
                    <span>Services</span>
                    <span>About</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Close-up Badge Comparison */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block">
                Badge Framing Zoom Test
              </span>
              <div className="flex items-center justify-around py-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center justify-center overflow-hidden">
                    {previewDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewDataUrl} alt="56px" className="w-full h-full object-contain p-0.5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">56px (Large)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center justify-center overflow-hidden">
                    {previewDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewDataUrl} alt="44px" className="w-full h-full object-contain p-0.5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">44px (Navbar)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-rose-200 shadow-sm flex items-center justify-center overflow-hidden">
                    {previewDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewDataUrl} alt="32px" className="w-full h-full object-contain p-0.5" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">32px (Compact)</span>
                </div>
              </div>
            </div>

            {/* ── Save / Apply Button ── */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleSaveCroppedLogo}
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
                    Processing &amp; Publishing Logo...
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Logo Saved &amp; Live on Navbar!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Save &amp; Apply Framed Logo to Navbar
                  </>
                )}
              </Button>
              <p className="text-[11px] text-gray-400 text-center mt-2 font-medium">
                Saves high-DPI transparent master and immediately updates the public website navbar.
              </p>
            </div>

          </div>

        </div>
      </CardContent>
    </Card>
  );
}
