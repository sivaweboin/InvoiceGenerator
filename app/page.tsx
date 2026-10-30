import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "../lib/auth";
import InvoiceWorkspace from "./InvoiceWorkspace";
async function ProtectedWorkspace() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) redirect("/login");
  return <InvoiceWorkspace />;
}
export default function Home() {
  return (
    <Suspense fallback={<p>Loading workspace…</p>}>
      <ProtectedWorkspace />
    </Suspense>
  );
}
