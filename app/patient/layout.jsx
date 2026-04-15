import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PatientSidebar } from "@/components/blocks/patient-side-bar";
import { logout } from "../(auth)/actions";

export default async function PatientLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PatientSidebar user={user} logoutAction={logout}>
      <div className="p-6 md:p-10 w-full min-h-screen">
        {children}
      </div>
    </PatientSidebar>
  );
}
