/** What /api/seo/assets reports for one image URL. Shared by server and browser. */
export interface AssetInfo {
  url: string;
  /** Set when the asset couldn't be fetched at all. */
  error?: string;
  finalUrl?: string;
  status?: number;
  redirects?: number;
  contentType?: string;
  /** Size in bytes, when the server says. */
  bytes?: number | null;
  /** Crawler name → blocked by robots.txt. Missing when robots.txt couldn't be read. */
  blocked?: Record<string, boolean>;
}
