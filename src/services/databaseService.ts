import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getPersistentUserId, upsertUserProfile } from "./authService";

export type AnalysisRecord = {
  id: string;
  user_id: string;
  brand: string;
  complaint_count: number;
  risk_score: number;
  root_cause: string;
  action_plan: string;
  llm_response: string;
  created_at: string;
};

export type AnalysisInput = {
  brand: string;
  complaint_count: number;
  risk_score: number;
  root_cause: string;
  action_plan: string;
  llm_response?: string;
};

export type DatasetInput = {
  name: string;
  type: string;
  row_count: number;
  brand?: string;
  data: unknown;
};

export type UploadedDatasetRecord = {
  id: string;
  file_name: string;
  brand: string;
  row_count: number;
  file_type: string;
  uploaded_at: string;
  preview_data: unknown;
  user_email: string;
};

const HISTORY_KEY = "remedy_analysis_history";
const UPLOADED_DATASETS_TABLE = "uploaded_datasets";

function readLocalHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(records: AnalysisRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

async function ensureLocalUserProfile(userId: string) {
  const email = localStorage.getItem("remedy_user_email") || "local@remedy.local";
  if (isSupabaseConfigured) {
    try {
      await upsertUserProfile(userId, email);
    } catch (error) {
      console.error("Supabase user profile upsert failed:", error);
    }
  }
}

export async function saveAnalysis(input: AnalysisInput) {
  const userId = await getPersistentUserId();
  const record: AnalysisRecord = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    user_id: userId,
    brand: input.brand,
    complaint_count: input.complaint_count,
    risk_score: input.risk_score,
    root_cause: input.root_cause,
    action_plan: input.action_plan,
    llm_response: input.llm_response || input.action_plan,
    created_at: new Date().toISOString(),
  };

  writeLocalHistory([record, ...readLocalHistory()]);
  return { record, error: null };
}

export async function listAnalyses() {
  const userId = await getPersistentUserId();
  return readLocalHistory().filter((record) => record.user_id === userId);
}

export async function deleteAnalysis(id: string) {
  writeLocalHistory(readLocalHistory().filter((record) => record.id !== id));

  return { error: null };
}

export async function saveDataset(input: DatasetInput) {
  if (!isSupabaseConfigured || !supabase) {
    console.error("Supabase uploaded_datasets kayıt atlanıyor: VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY eksik.");
    return { error: null };
  }

  try {
    const { error } = await supabase.from(UPLOADED_DATASETS_TABLE).insert({
      file_name: input.name,
      brand: input.brand || "GENEL",
      row_count: input.row_count,
      file_type: input.type,
      preview_data: input.data,
      user_email: localStorage.getItem("remedy_user_email") || "local@remedy.local",
    });

    if (error) throw error;
    console.log("Supabase uploaded_datasets kaydı başarılı");
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Veri seti kaydedilemedi.";
    console.error("Supabase uploaded_datasets insert failed:", error);
    return { error: message };
  }
}

export async function listUploadedDatasets(): Promise<UploadedDatasetRecord[]> {
  const localDatasets = readLocalUploadedDatasets();

  if (!isSupabaseConfigured || !supabase) {
    return localDatasets;
  }

  try {
    const userEmail = localStorage.getItem("remedy_user_email") || "local@remedy.local";
    const { data, error } = await supabase
      .from(UPLOADED_DATASETS_TABLE)
      .select("*")
      .eq("user_email", userEmail)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return (data || []) as UploadedDatasetRecord[];
  } catch (error) {
    console.error("Supabase uploaded_datasets read failed:", error);
    return localDatasets;
  }
}

function readLocalUploadedDatasets(): UploadedDatasetRecord[] {
  try {
    const raw = localStorage.getItem("remedy_datasets");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((dataset: any) => ({
      id: dataset.id,
      file_name: dataset.fileName || dataset.source || "Bilinmeyen dosya",
      brand: dataset.brand || "GENEL",
      row_count: Number(dataset.count || 0),
      file_type: dataset.type || "csv",
      uploaded_at: new Date().toISOString(),
      preview_data: dataset,
      user_email: localStorage.getItem("remedy_user_email") || "local@remedy.local",
    }));
  } catch {
    return [];
  }
}

export async function saveHealingHistory(action: string, status: string) {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  try {
    const userId = await getPersistentUserId();
    await ensureLocalUserProfile(userId);

    const { error } = await supabase.from("healing_history").insert({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `healing-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      user_id: userId,
      action,
      status,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "İyileştirme geçmişi kaydedilemedi.";
    console.warn("Supabase healing history save failed:", message);
    return { error: message };
  }
}
