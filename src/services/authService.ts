import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export async function getCurrentSupabaseUser(): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: "Supabase yapılandırılmadı." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };

  if (data.user) {
    await upsertUserProfile(data.user.id, data.user.email || email);
  }

  return { user: data.user, error: null };
}

export async function signUpWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: "Supabase yapılandırılmadı." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message };

  if (data.user) {
    await upsertUserProfile(data.user.id, data.user.email || email);
  }

  return { user: data.user, error: null };
}

export async function signOutSupabase() {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.auth.signOut();
}

export async function upsertUserProfile(id: string, email: string) {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from("users").upsert(
    {
      id,
      email,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.warn("Supabase user profile could not be saved:", error.message);
  }
}

export async function getPersistentUserId() {
  const supabaseUser = await getCurrentSupabaseUser();
  if (supabaseUser) return supabaseUser.id;

  const email = localStorage.getItem("remedy_user_email") || "local@remedy.local";
  const key = `remedy_local_user_id_${email}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(key, generated);
  return generated;
}
