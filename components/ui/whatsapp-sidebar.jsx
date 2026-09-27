"use client"

import React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  ChevronUp,
  Settings,
  User2,
  Home,
  Users,
  LogOut,
  CalendarDays,
  ClipboardList,
  LayoutTemplate,
  BarChart3,
  ShieldAlert,
  MessageSquare,
  HeartPulse,
  Camera,
  RotateCcw,
  Upload,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { createClient } from "@/utils/supabase/client"
import { updateNavbarLogo } from "@/app/actions"

const navigationSections = [
  {
    title: "Clinical Core",
    items: [
      { title: "Dashboard & Triage", url: "/admin", icon: Home, exact: true },
      { title: "Clinical Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "Appointments & Queue", url: "/admin/appointments", icon: ClipboardList },
      { title: "Patient Directory", url: "/admin/patients", icon: Users },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Online Consultations", url: "/admin/consultations", icon: MessageSquare },
      { title: "Clinic Schedule", url: "/admin/schedule", icon: CalendarDays },
      { title: "Website Content", url: "/admin/cms", icon: LayoutTemplate },
    ],
  },
  {
    title: "System",
    items: [
      { title: "DPA Audit Logs", url: "/admin/audit-logs", icon: ShieldAlert },
      { title: "System Settings", url: "/admin/settings", icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const [logoUrl, setLogoUrl] = React.useState(null)
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false)
  const fileInputRef = React.useRef(null)
  const pathname = usePathname()

  // Load clinic logo from settings on mount
  React.useEffect(() => {
    const supabase = createClient()
    supabase
      .from("clinic_settings")
      .select("navbar_logo")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.navbar_logo) {
          setLogoUrl(data.navbar_logo)
        }
      })
  }, [])

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Optimistic instant preview
    const previewUrl = URL.createObjectURL(file)
    setLogoUrl(previewUrl)
    setIsUploadingLogo(true)

    try {
      const formData = new FormData()
      formData.append("action", "upload")
      formData.append("navbar_logo", file)
      const res = await updateNavbarLogo(formData)
      if (res?.publicUrl) {
        setLogoUrl(res.publicUrl)
      }
    } catch (err) {
      console.error("Failed to upload logo:", err)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoRemove = async (e) => {
    e.stopPropagation()
    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("action", "remove")
      await updateNavbarLogo(formData)
      setLogoUrl(null)
    } catch (err) {
      console.error("Failed to remove logo:", err)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const isItemActive = (item) => {
    if (item.exact || item.url === "/admin") {
      return pathname === "/admin"
    }
    return pathname.startsWith(item.url)
  }

  const handleSignOut = () => {
    localStorage.removeItem("adminSession")
    window.location.href = "/admin/login"
  }

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="bg-white/85 backdrop-blur-md border-r border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] font-sans"
    >
      <SidebarContent>
        {/* Brand Crest & Editable Logo Placeholder */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-100/80">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Hidden native file input for logo update */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
              id="sidebar-logo-file-input"
            />

            {/* Editable Logo Avatar Placeholder */}
            <div className="relative group/logo shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Click to change or upload clinic logo"
                className="relative w-9 h-9 rounded-xl overflow-hidden border border-slate-200/80 shadow-xs bg-gradient-to-br from-rose-50 to-slate-50 flex items-center justify-center transition-all duration-200 hover:ring-2 hover:ring-rose-400/50 hover:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
              >
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl}
                    alt="Clinic Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-inner">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                )}

                {/* Upload / Edit Overlay on Hover */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                  {isUploadingLogo ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
              </button>

              {/* Real-time Status Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
              </span>
            </div>

            {/* Clinic Wordmark */}
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-[13px] tracking-tight text-slate-800 truncate">
                AR-JEN CLINIC
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide truncate uppercase">
                Maternity &amp; Lying-In
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        {navigationSections.map((section, idx) => (
          <SidebarGroup key={section.title} className={idx !== 0 ? "pt-1" : "pt-2"}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-3 mb-1">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = isItemActive(item)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        isActive={isActive} 
                        tooltip={item.title}
                        render={<Link href={item.url} />}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 group text-xs
                          ${isActive 
                            ? "bg-rose-50/90 text-rose-600 font-semibold shadow-xs border border-rose-100/60" 
                            : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-medium"}
                        `}
                      >
                        <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-rose-600" : "text-slate-400 group-hover:text-rose-500"}`} />
                        <span className="truncate">{item.title}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100/80 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              {/* Single button render to prevent HTML button-inside-button hydration error */}
              <SidebarMenuButton
                render={<DropdownMenuTrigger />}
                className="p-2 h-auto rounded-xl hover:bg-slate-100/70 transition-colors w-full cursor-pointer"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs relative">
                    RM
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full"></span>
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden text-left">
                    <span className="text-xs font-bold text-slate-700 truncate">Clinical Staff</span>
                    <span className="text-[10px] text-slate-400 font-medium truncate">Registered Midwife</span>
                  </div>
                  <ChevronUp className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
                </div>
              </SidebarMenuButton>

              <DropdownMenuContent side="top" align="start" className="w-56 mb-2 rounded-xl shadow-lg border-slate-100 p-1.5 bg-white/95 backdrop-blur-md">
                <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-800">Ma. Theresa Arjen, RM</p>
                  <p className="text-[10px] text-slate-400 font-medium">Duty Shift: 07:00 - 19:00</p>
                </div>
                <DropdownMenuItem 
                  className="cursor-pointer font-medium text-slate-600 p-2 rounded-lg text-xs hover:bg-slate-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2 text-slate-400" />
                  Change Clinic Logo
                </DropdownMenuItem>
                {logoUrl && (
                  <DropdownMenuItem 
                    className="cursor-pointer font-medium text-amber-600 p-2 rounded-lg text-xs hover:bg-amber-50 transition-colors"
                    onClick={handleLogoRemove}
                  >
                    <RotateCcw className="w-4 h-4 mr-2 text-amber-500" />
                    Reset to Default Logo
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer font-medium text-slate-600 p-2 rounded-lg text-xs hover:bg-slate-50 transition-colors">
                  <User2 className="w-4 h-4 mr-2 text-slate-400" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer font-medium text-rose-600 focus:text-rose-700 focus:bg-rose-50 p-2 rounded-lg text-xs transition-colors" 
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
