import { Sidebar } from "@/components/blocks/modern-side-bar";

export default function AdminLayout({ children }) {
  return (
    <Sidebar>
      <div className="p-6 md:p-8 bg-white/50 w-full min-h-full">
        {children}
      </div>
    </Sidebar>
  );
}
