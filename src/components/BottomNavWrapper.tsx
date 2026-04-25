import { auth } from "@/auth";
import BottomNav from "./BottomNav";

export default async function BottomNavWrapper() {
  const session = await auth();
  
  if (!session) return null;

  return <BottomNav isAdmin={session.user?.role === "admin"} />;
}
