const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "mindvault.access_token";

export type BackendMood =
  | "happy"
  | "calm"
  | "neutral"
  | "anxious"
  | "sad"
  | "stressed"
  | "angry";

export type BackendEntrySource =
  | "typed"
  | "audio"
  | "imported";

export type BackendJournal = {
  id: number;
  user_id: number;
  title: string | null;
  original_text: string;
  transcript: string | null;
  reflection_questions: string[];
  mood_summary: string | null;
  mood_label: BackendMood | null;
  mood_score: number | null;
  entry_source: BackendEntrySource;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type JournalListResponse = {
  page: number;
  page_size: number;
  total: number;
  items: BackendJournal[];
};

export type JournalCreatePayload = {
  title?: string | null;
  original_text: string;
  transcript?: string | null;
  reflection_questions?: string[];
  mood_summary?: string | null;
  mood_label?: BackendMood | null;
  mood_score?: number | null;
  entry_source?: BackendEntrySource;
  is_favorite?: boolean;
};

export type JournalUpdatePayload =
  Partial<JournalCreatePayload>;

export type UserResponse = {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function logout(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function readResponse(
  response: Response,
): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  needsAuthentication = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (needsAuthentication) {
    const token = getToken();

    if (!token) {
      throw new Error("Please log in first.");
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  const data = await readResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }

    const detail =
      typeof data === "object" &&
      data !== null &&
      "detail" in data
        ? (data as { detail: unknown }).detail
        : data;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail),
    );
  }

  return data as T;
}

export async function registerUser(
  email: string,
  username: string,
  password: string,
): Promise<UserResponse> {
  return request<UserResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        username,
        password,
      }),
    },
    false,
  );
}

export async function loginUser(
  username: string,
  password: string,
): Promise<void> {
  const formData = new URLSearchParams();

  formData.set("username", username.trim());
  formData.set("password", password);
  formData.set("grant_type", "password");

  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ??
        "Login failed. Check username and password.",
    );
  }

  localStorage.setItem(
    "mindvault.access_token",
    data.access_token,
  );
}

export async function getCurrentUser():
Promise<UserResponse> {
  return request<UserResponse>("/auth/me");
}

export async function listJournals():
Promise<BackendJournal[]> {
  const response =
    await request<JournalListResponse>(
      "/journals?page=1&page_size=100&sort=newest",
    );

  return response.items;
}

export async function createJournal(
  payload: JournalCreatePayload,
): Promise<BackendJournal> {
  return request<BackendJournal>(
    "/journals",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateJournal(
  entryId: string | number,
  payload: JournalUpdatePayload,
): Promise<BackendJournal> {
  return request<BackendJournal>(
    `/journals/${entryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteJournal(
  entryId: string | number,
): Promise<void> {
  await request<null>(
    `/journals/${entryId}`,
    {
      method: "DELETE",
    },
  );
}
export type TranscriptionResponse = {
  text: string;
  language: string;
  confidence: number;
};


export async function transcribeAudio(
  audioBlob: Blob,
): Promise<TranscriptionResponse> {
  const formData = new FormData();

  const extension =
    audioBlob.type.includes("ogg")
      ? "ogg"
      : audioBlob.type.includes("wav")
        ? "wav"
        : "webm";

  formData.append(
    "audio",
    audioBlob,
    `voice-recording.${extension}`,
  );

  return request<TranscriptionResponse>(
    "/speech/transcribe",
    {
      method: "POST",
      body: formData,
    },
  );
}
export type AIReflectionResponse = {
  reflection: string;
  urgent_support: boolean;
  model: string;
};


export async function generateAIReflection(
  journalText: string,
  mood?: string,
): Promise<AIReflectionResponse> {
  return request<AIReflectionResponse>(
    "/ai/reflection",
    {
      method: "POST",
      body: JSON.stringify({
        journal_text: journalText,
        mood: mood || null,
      }),
    },
  );
}