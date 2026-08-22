"use client";

import React, { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  AlignLeft,
  ImagePlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { ServiceManager } from "@/components/forms/service-manager";
import { LogoStudio } from "@/components/admin/logo-studio";
import { FaviconStudio } from "@/components/admin/favicon-studio";
import {
  updateHeroContent,
  updateNavbarLogo,
  updateFavicon,
  updateAboutContent,
  updateFooterContent,
  updateSEOMetadata,
  updateHeroImage,
  updateServices,
} from "@/app/actions";

export function CMSManager({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings || {});
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', title: string, message: string }
  const [savingKey, setSavingKey] = useState(null); // identifier of active form saving
  const [savedKey, setSavedKey] = useState(null); // identifier of recently saved form
  const [isPending, startTransition] = useTransition();

  const showToast = (type, title, message) => {
    setNotification({ type, title, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.title === title ? null : prev));
    }, 4500);
  };

  const handleAction = async (e, actionFn, formKey, successMsg) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSavingKey(formKey);
    setSavedKey(null);

    startTransition(async () => {
      try {
        const result = await actionFn(formData);
        if (result?.success === false) {
          showToast("error", "Failed to Save", result?.error || "An error occurred while saving.");
        } else {
          setSavedKey(formKey);
          showToast("success", "Saved Successfully!", successMsg || "Your changes have been updated and are live.");
          setTimeout(() => setSavedKey(null), 3000);
        }
      } catch (err) {
        showToast("error", "Error", err.message || "Failed to update content.");
      } finally {
        setSavingKey(null);
      }
    });
  };

  const handleLogoStudioSave = async (formData) => {
    setSavingKey("navbar_logo_studio");
    setSavedKey(null);
    try {
      const result = await updateNavbarLogo(formData);
      if (result?.success === false) {
        showToast("error", "Failed to Save Logo", result?.error || "An error occurred while saving the logo.");
      } else {
        if (result?.publicUrl) {
          setSettings((prev) => ({ ...prev, navbar_logo: result.publicUrl }));
        }
        setSavedKey("navbar_logo_studio");
        showToast("success", "Logo Updated & Published!", "Navbar brand logo framed and published successfully.");
        setTimeout(() => setSavedKey(null), 3500);
      }
    } catch (err) {
      showToast("error", "Error", err.message || "Failed to save logo.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleLogoStudioRemove = async () => {
    const formData = new FormData();
    formData.append("action", "remove");
    setSavingKey("navbar_logo_remove");
    setSavedKey(null);
    try {
      const result = await updateNavbarLogo(formData);
      if (result?.success === false) {
        showToast("error", "Failed to Remove Logo", result?.error || "An error occurred.");
      } else {
        setSettings((prev) => ({ ...prev, navbar_logo: null }));
        showToast("success", "Logo Removed", "Custom logo removed. Default clinic icon restored.");
      }
    } catch (err) {
      showToast("error", "Error", err.message || "Failed to remove logo.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleFaviconSave = async (formData) => {
    setSavingKey("favicon_studio");
    setSavedKey(null);
    try {
      const result = await updateFavicon(formData);
      if (result?.success === false) {
        showToast("error", "Failed to Save Favicon", result?.error || "An error occurred while saving the favicon.");
      } else {
        if (result?.publicUrl) {
          setSettings((prev) => ({ ...prev, favicon_url: result.publicUrl }));
        }
        setSavedKey("favicon_studio");
        showToast("success", "Favicon Published!", "Website browser icon updated successfully across all tabs.");
        setTimeout(() => setSavedKey(null), 3500);
      }
    } catch (err) {
      showToast("error", "Error", err.message || "Failed to save favicon.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleFaviconRemove = async () => {
    const formData = new FormData();
    formData.append("action", "remove");
    setSavingKey("favicon_remove");
    setSavedKey(null);
    try {
      const result = await updateFavicon(formData);
      if (result?.success === false) {
        showToast("error", "Failed to Remove Favicon", result?.error || "An error occurred.");
      } else {
        setSettings((prev) => ({ ...prev, favicon_url: null }));
        showToast("success", "Favicon Removed", "Website favicon reverted to default.");
      }
    } catch (err) {
      showToast("error", "Error", err.message || "Failed to remove favicon.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleFaviconSyncWithLogo = async () => {
    const formData = new FormData();
    formData.append("action", "sync_logo");
    setSavingKey("favicon_studio");
    setSavedKey(null);
    try {
      const result = await updateFavicon(formData);
      if (result?.success === false) {
        showToast("error", "Failed to Sync", result?.error || "An error occurred.");
      } else {
        if (result?.publicUrl) {
          setSettings((prev) => ({ ...prev, favicon_url: result.publicUrl }));
        }
        setSavedKey("favicon_studio");
        showToast("success", "Favicon Synced!", "Navbar brand logo is now set as the website favicon.");
        setTimeout(() => setSavedKey(null), 3500);
      }
    } catch (err) {
      showToast("error", "Error", err.message || "Failed to sync favicon.");
    } finally {
      setSavingKey(null);
    }
  };

  const defaultTrustPoints = [
    { title: "24/7 Monitoring", description: "Round-the-clock professional care.", icon: "Clock" },
    { title: "Expert Midwives", description: "Certified midwives for safe deliveries.", icon: "HeartPulse" },
    { title: "Modern Facilities", description: "Equipped with essential maternity tools.", icon: "Building" },
    { title: "PhilHealth Accredited", description: "Accessible and affordable care.", icon: "ShieldCheck" }
  ];

  const trustPoints = settings?.trust_points || defaultTrustPoints;

  return (
    <div className="space-y-6 relative">
      {/* ── Fixed Floating High-Visibility Toast ── */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-xl ${
              notification.type === "success"
                ? "bg-emerald-900/95 text-white border-emerald-500 shadow-emerald-950/30"
                : "bg-rose-950/95 text-white border-rose-500 shadow-rose-950/30"
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 ${
                notification.type === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-sm font-black tracking-tight">{notification.title}</h4>
              <p className="text-xs text-white/85 mt-0.5 leading-relaxed">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Top Status Banner when an item was just saved ── */}
      {savedKey && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 px-6 py-4 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-md">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-wider text-emerald-800">
                Update Confirmed &amp; Published
              </p>
              <p className="text-xs text-emerald-700 font-medium">
                Changes have been saved to the database and revalidated across the entire website.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl font-bold text-xs gap-1.5 hidden sm:flex">
            <a href="/" target="_blank" rel="noreferrer">
              View Live Site <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1.5 bg-rose-50/50 rounded-2xl gap-1">
          <TabsTrigger
            value="hero"
            className="py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm font-bold text-xs sm:text-sm"
          >
            <ImageIcon className="w-4 h-4 mr-2" /> Hero &amp; Visuals
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm font-bold text-xs sm:text-sm"
          >
            <AlignLeft className="w-4 h-4 mr-2" /> Services Catalog
          </TabsTrigger>
          <TabsTrigger
            value="general"
            className="py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm font-bold text-xs sm:text-sm"
          >
            <Globe className="w-4 h-4 mr-2" /> Logo &amp; SEO
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm font-bold text-xs sm:text-sm"
          >
            <MessageSquare className="w-4 h-4 mr-2" /> About &amp; Trust
          </TabsTrigger>
          <TabsTrigger
            value="footer"
            className="py-2.5 rounded-xl data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm font-bold text-xs sm:text-sm"
          >
            <Phone className="w-4 h-4 mr-2" /> Footer &amp; Hours
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════
            HERO TAB
           ══════════════════════════════════════════════════ */}
        <TabsContent value="hero" className="mt-6 space-y-6">
          {/* Dual Hero Images Management Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Hero Photo */}
            <Card className="border-rose-100 shadow-sm">
              <CardHeader className="bg-rose-50/30 border-b border-rose-50 pb-4">
                <CardTitle className="text-rose-900 flex items-center text-lg">
                  <ImagePlus className="w-5 h-5 mr-2 text-rose-500" />
                  Left Hero Photo (Oval Shape)
                </CardTitle>
                <CardDescription>Primary left portrait photo (e.g. mother lifting newborn baby).</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="overflow-hidden rounded-[100px] bg-rose-50/50 border border-rose-100 aspect-[3/4] max-w-[220px] mx-auto flex items-center justify-center relative shadow-md">
                  {settings?.hero_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.hero_image_url}
                      alt="Left hero image"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-rose-300 p-4 text-center">
                      <ImagePlus className="w-8 h-8" />
                      <p className="text-xs font-semibold text-rose-400">Default Left Photo Active</p>
                    </div>
                  )}
                </div>

                {/* Upload Left File */}
                <form
                  onSubmit={(e) =>
                    handleAction(e, updateHeroImage, "hero_left_upload", "Left hero photo uploaded and saved!")
                  }
                  className="space-y-3"
                >
                  <input type="hidden" name="action" value="upload" />
                  <input type="hidden" name="position" value="left" />
                  <div className="space-y-1.5">
                    <Label htmlFor="hero_image_left" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Upload File
                    </Label>
                    <Input
                      id="hero_image_left"
                      name="hero_image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      required
                      className="h-10 rounded-xl border-gray-200 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-600 hover:file:bg-rose-100"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={savingKey === "hero_left_upload"}
                    className={`w-full rounded-xl h-10 font-bold gap-2 text-xs transition-all ${
                      savedKey === "hero_left_upload"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-rose-500 hover:bg-rose-600 text-white"
                    }`}
                  >
                    {savingKey === "hero_left_upload" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading Left Photo...
                      </>
                    ) : savedKey === "hero_left_upload" ? (
                      <>
                        <Check className="w-4 h-4" /> Left Photo Saved!
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4" /> Save Left Photo
                      </>
                    )}
                  </Button>
                </form>

                {/* Direct Left URL */}
                <div className="pt-4 border-t border-gray-100">
                  <form
                    onSubmit={(e) =>
                      handleAction(e, updateHeroImage, "hero_left_url", "Left photo URL saved successfully!")
                    }
                    className="space-y-3"
                  >
                    <input type="hidden" name="action" value="url" />
                    <input type="hidden" name="position" value="left" />
                    <div className="space-y-1.5">
                      <Label htmlFor="hero_image_url_direct_left" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Or Paste Image Link
                      </Label>
                      <Input
                        id="hero_image_url_direct_left"
                        name="hero_image_url_direct"
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        defaultValue={settings?.hero_image_url || ""}
                        className="h-10 rounded-xl border-gray-200 text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={savingKey === "hero_left_url"}
                      className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-10 font-bold text-xs"
                    >
                      {savingKey === "hero_left_url" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving URL...
                        </>
                      ) : (
                        "Set Left Image URL"
                      )}
                    </Button>
                  </form>
                </div>

                {settings?.hero_image_url && (
                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <form
                      onSubmit={(e) =>
                        handleAction(e, updateHeroImage, "hero_left_remove", "Left hero photo removed.")
                      }
                    >
                      <input type="hidden" name="action" value="remove" />
                      <input type="hidden" name="position" value="left" />
                      <Button
                        type="submit"
                        variant="ghost"
                        disabled={savingKey === "hero_left_remove"}
                        className="h-8 font-bold text-red-500 hover:bg-red-50 gap-1.5 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Left Photo
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Hero Photo */}
            <Card className="border-rose-100 shadow-sm">
              <CardHeader className="bg-rose-50/30 border-b border-rose-50 pb-4">
                <CardTitle className="text-rose-900 flex items-center text-lg">
                  <ImagePlus className="w-5 h-5 mr-2 text-rose-500" />
                  Right Hero Photo (Circular Shape)
                </CardTitle>
                <CardDescription>Secondary right portrait image (e.g. mother &amp; baby portrait).</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="overflow-hidden rounded-full bg-rose-50/50 border border-rose-100 aspect-square max-w-[220px] mx-auto flex items-center justify-center relative shadow-md">
                  {settings?.hero_image_right_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.hero_image_right_url}
                      alt="Right hero image"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-rose-300 p-4 text-center">
                      <ImagePlus className="w-8 h-8" />
                      <p className="text-xs font-semibold text-rose-400">Default Right Photo Active</p>
                    </div>
                  )}
                </div>

                {/* Upload Right File */}
                <form
                  onSubmit={(e) =>
                    handleAction(e, updateHeroImage, "hero_right_upload", "Right hero photo uploaded and saved!")
                  }
                  className="space-y-3"
                >
                  <input type="hidden" name="action" value="upload" />
                  <input type="hidden" name="position" value="right" />
                  <div className="space-y-1.5">
                    <Label htmlFor="hero_image_right" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Upload File
                    </Label>
                    <Input
                      id="hero_image_right"
                      name="hero_image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      required
                      className="h-10 rounded-xl border-gray-200 file:mr-3 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-600 hover:file:bg-rose-100"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={savingKey === "hero_right_upload"}
                    className={`w-full rounded-xl h-10 font-bold gap-2 text-xs transition-all ${
                      savedKey === "hero_right_upload"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-rose-500 hover:bg-rose-600 text-white"
                    }`}
                  >
                    {savingKey === "hero_right_upload" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading Right Photo...
                      </>
                    ) : savedKey === "hero_right_upload" ? (
                      <>
                        <Check className="w-4 h-4" /> Right Photo Saved!
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-4 h-4" /> Save Right Photo
                      </>
                    )}
                  </Button>
                </form>

                {/* Direct Right URL */}
                <div className="pt-4 border-t border-gray-100">
                  <form
                    onSubmit={(e) =>
                      handleAction(e, updateHeroImage, "hero_right_url", "Right photo URL saved successfully!")
                    }
                    className="space-y-3"
                  >
                    <input type="hidden" name="action" value="url" />
                    <input type="hidden" name="position" value="right" />
                    <div className="space-y-1.5">
                      <Label htmlFor="hero_image_url_direct_right" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Or Paste Image Link
                      </Label>
                      <Input
                        id="hero_image_url_direct_right"
                        name="hero_image_url_direct"
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        defaultValue={settings?.hero_image_right_url || ""}
                        className="h-10 rounded-xl border-gray-200 text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={savingKey === "hero_right_url"}
                      className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl h-10 font-bold text-xs"
                    >
                      {savingKey === "hero_right_url" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving URL...
                        </>
                      ) : (
                        "Set Right Image URL"
                      )}
                    </Button>
                  </form>
                </div>

                {settings?.hero_image_right_url && (
                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <form
                      onSubmit={(e) =>
                        handleAction(e, updateHeroImage, "hero_right_remove", "Right hero photo removed.")
                      }
                    >
                      <input type="hidden" name="action" value="remove" />
                      <input type="hidden" name="position" value="right" />
                      <Button
                        type="submit"
                        variant="ghost"
                        disabled={savingKey === "hero_right_remove"}
                        className="h-8 font-bold text-red-500 hover:bg-red-50 gap-1.5 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Right Photo
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hero Headlines & Copy */}
          <Card className="border-rose-100 shadow-sm">
            <CardHeader className="bg-rose-50/30 border-b border-rose-50 pb-4">
              <CardTitle className="text-rose-900">Hero Headlines &amp; Copy</CardTitle>
              <CardDescription>Edit the badge text, main H1 headline, and descriptive subtitle on the homepage.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form
                onSubmit={(e) =>
                  handleAction(e, updateHeroContent, "hero_content", "Hero text and headlines updated!")
                }
                className="space-y-4 max-w-2xl"
              >
                <div className="space-y-2">
                  <Label htmlFor="hero_eyebrow" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Badge Text (Eyebrow)
                  </Label>
                  <Input
                    id="hero_eyebrow"
                    name="hero_eyebrow"
                    defaultValue={settings?.hero_eyebrow || ""}
                    placeholder="e.g. PhilHealth Accredited · Dasmariñas City"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero_title" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Main Headline (H1)
                  </Label>
                  <Input
                    id="hero_title"
                    name="hero_title"
                    defaultValue={settings?.hero_title || ""}
                    className="font-bold rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero_subtitle" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Subtitle / Description
                  </Label>
                  <textarea
                    id="hero_subtitle"
                    name="hero_subtitle"
                    defaultValue={settings?.hero_subtitle || ""}
                    rows={4}
                    className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingKey === "hero_content"}
                  className={`font-bold rounded-xl h-11 px-6 transition-all ${
                    savedKey === "hero_content"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  {savingKey === "hero_content" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Hero Copy...
                    </>
                  ) : savedKey === "hero_content" ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Hero Copy Saved!
                    </>
                  ) : (
                    "Save Hero Copy"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════
            SERVICES TAB
           ══════════════════════════════════════════════════ */}
        <TabsContent value="services" className="mt-6">
          <ServiceManager
            initialServices={settings?.services}
            updateServices={async (svcList) => {
              const res = await updateServices(svcList);
              showToast("success", "Services Updated!", "Clinic services catalog updated successfully.");
              return res;
            }}
          />
        </TabsContent>

        {/* ══════════════════════════════════════════════════
            LOGO & SEO TAB
           ══════════════════════════════════════════════════ */}
        <TabsContent value="general" className="mt-6 space-y-6">
          {/* Interactive Logo Studio & Framing Card */}
          <LogoStudio
            currentLogoUrl={settings?.navbar_logo}
            onSaveLogo={handleLogoStudioSave}
            onRemoveLogo={handleLogoStudioRemove}
            isSaving={savingKey === "navbar_logo_studio" || savingKey === "navbar_logo_remove"}
            savedSuccess={savedKey === "navbar_logo_studio"}
          />

          {/* Interactive Favicon Studio & Framing Card */}
          <FaviconStudio
            currentFaviconUrl={settings?.favicon_url}
            navbarLogoUrl={settings?.navbar_logo}
            onSaveFavicon={handleFaviconSave}
            onRemoveFavicon={handleFaviconRemove}
            onSyncWithLogo={handleFaviconSyncWithLogo}
            isSaving={savingKey === "favicon_studio" || savingKey === "favicon_remove"}
            savedSuccess={savedKey === "favicon_studio"}
          />

          {/* SEO Metadata Card */}
          <Card className="border-rose-100 shadow-sm">
            <CardHeader className="bg-rose-50/30 border-b border-rose-50 pb-4">
              <CardTitle className="text-rose-900 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-rose-500" />
                SEO Metadata
              </CardTitle>
              <CardDescription>Control how your clinic appears on Google search results and shared social cards.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form
                onSubmit={(e) =>
                  handleAction(e, updateSEOMetadata, "seo_metadata", "SEO meta title & description updated!")
                }
                className="space-y-4 max-w-2xl"
              >
                <div className="space-y-2">
                  <Label htmlFor="seo_meta_title" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Meta Title
                  </Label>
                  <Input
                    id="seo_meta_title"
                    name="seo_meta_title"
                    defaultValue={settings?.seo_meta_title || ""}
                    placeholder="e.g. AR-JEN Maternity and Lying-In Clinic"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_meta_description" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Meta Description
                  </Label>
                  <textarea
                    id="seo_meta_description"
                    name="seo_meta_description"
                    defaultValue={settings?.seo_meta_description || ""}
                    rows={3}
                    placeholder="Brief description of your clinic for search engines..."
                    className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingKey === "seo_metadata"}
                  className={`font-bold rounded-xl h-11 px-6 transition-all ${
                    savedKey === "seo_metadata"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  {savingKey === "seo_metadata" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving SEO Settings...
                    </>
                  ) : savedKey === "seo_metadata" ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> SEO Settings Saved!
                    </>
                  ) : (
                    "Save SEO Settings"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════
            ABOUT & TRUST TAB
           ══════════════════════════════════════════════════ */}
        <TabsContent value="about" className="mt-6">
          <Card className="border-rose-100 shadow-sm">
            <CardHeader className="bg-rose-50/30 border-b border-rose-50 pb-4">
              <CardTitle className="text-rose-900">About Us &amp; Trust Points</CardTitle>
              <CardDescription>Manage the "Why Choose Us" storytelling narrative and key benefit points.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form
                onSubmit={(e) =>
                  handleAction(e, updateAboutContent, "about_content", "About story and trust points saved!")
                }
                className="space-y-6"
              >
                <div className="space-y-4 max-w-2xl">
                  <div className="space-y-2">
                    <Label htmlFor="about_title" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Section Headline
                    </Label>
                    <Input
                      id="about_title"
                      name="about_title"
                      defaultValue={settings?.about_title || ""}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about_description" className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Storytelling Paragraph
                    </Label>
                    <textarea
                      id="about_description"
                      name="about_description"
                      defaultValue={settings?.about_description || ""}
                      rows={5}
                      className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 max-w-3xl">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Trust Points (JSON Format)
                  </h3>
                  <textarea
                    name="trust_points"
                    defaultValue={JSON.stringify(trustPoints, null, 2)}
                    rows={10}
                    className="flex w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  />
                  <p className="text-xs text-gray-400 mt-2">Controls the 4 feature cards in the About section.</p>
                </div>

                <Button
                  type="submit"
                  disabled={savingKey === "about_content"}
                  className={`font-bold rounded-xl h-11 px-6 transition-all ${
                    savedKey === "about_content"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  {savingKey === "about_content" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving About Section...
                    </>
                  ) : savedKey === "about_content" ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> About Section Saved!
                    </>
                  ) : (
                    "Save About Section"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════
            FOOTER & HOURS TAB
           ══════════════════════════════════════════════════ */}
        <TabsContent value="footer" className="mt-6">
          <Card className="border-rose-100 shadow-sm">
            <CardHeader className="bg-rose-50/30 border-b border-rose-50 pb-4">
              <CardTitle className="text-rose-900">Footer, Contact &amp; Hours</CardTitle>
              <CardDescription>Manage your public contact information, operating hours, and social media handles.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form
                onSubmit={(e) =>
                  handleAction(e, updateFooterContent, "footer_content", "Footer contact info and hours updated!")
                }
                className="space-y-6 max-w-3xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-2">
                      Contact Information
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="clinic_contact">Phone Number</Label>
                      <Input
                        id="clinic_contact"
                        name="clinic_contact"
                        defaultValue={settings?.clinic_contact || ""}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footer_email">Email Address</Label>
                      <Input
                        id="footer_email"
                        name="footer_email"
                        type="email"
                        defaultValue={settings?.footer_email || ""}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clinic_address">Physical Address</Label>
                      <Input
                        id="clinic_address"
                        name="clinic_address"
                        defaultValue={settings?.clinic_address || ""}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-2">
                      Operating Hours
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="operating_hours_weekdays">Weekdays</Label>
                      <Input
                        id="operating_hours_weekdays"
                        name="operating_hours_weekdays"
                        defaultValue={settings?.operating_hours_weekdays || ""}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operating_hours_saturday">Saturday</Label>
                      <Input
                        id="operating_hours_saturday"
                        name="operating_hours_saturday"
                        defaultValue={settings?.operating_hours_saturday || ""}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="operating_hours_sunday">Sunday</Label>
                      <Input
                        id="operating_hours_sunday"
                        name="operating_hours_sunday"
                        defaultValue={settings?.operating_hours_sunday || ""}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-2">
                    Emergency &amp; Social
                  </h3>
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="emergency_notice">Emergency CTA Notice</Label>
                    <Input
                      id="emergency_notice"
                      name="emergency_notice"
                      defaultValue={settings?.emergency_notice || ""}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="social_facebook">Facebook URL</Label>
                      <Input
                        id="social_facebook"
                        name="social_facebook"
                        defaultValue={settings?.social_facebook || ""}
                        placeholder="https://facebook.com/..."
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social_instagram">Instagram URL</Label>
                      <Input
                        id="social_instagram"
                        name="social_instagram"
                        defaultValue={settings?.social_instagram || ""}
                        placeholder="https://instagram.com/..."
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingKey === "footer_content"}
                  className={`font-bold rounded-xl h-11 px-6 transition-all ${
                    savedKey === "footer_content"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  {savingKey === "footer_content" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving Footer Settings...
                    </>
                  ) : savedKey === "footer_content" ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Footer Settings Saved!
                    </>
                  ) : (
                    "Save Footer Settings"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
