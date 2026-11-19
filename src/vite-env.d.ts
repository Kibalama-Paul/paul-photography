/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_BRAND_NAME?: string;
  readonly VITE_DEFAULT_SESSION_ID?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
