// app/admin/patients/[id]/postpartum/page.jsx
// Backward compatibility redirect: Unifies Postpartum & Newborn care directly into the patient EMR chart.

import { redirect } from 'next/navigation';

export default async function PostpartumRedirectPage({ params }) {
  const { id } = await params;
  redirect(`/admin/patients/${id}?tab=postpartum`);
}
