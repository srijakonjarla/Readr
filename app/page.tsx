import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";
import LibraryClient from "@/components/LibraryClient";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <LoginForm />;
  return <LibraryClient />;
}
