import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { ImportJob, ImportRedirectMap } from "../types.js";

/** Terminal statuses at which an import job stops progressing. */
const TERMINAL_STATUSES = ["completed", "partial", "failed", "cancelled"];

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 120000;

export interface StartImportOptions {
  /** Source provider to import from (e.g. "bitly"). */
  provider: string;
  /** Provider access token used to fetch the user's links. */
  accessToken: string;
  /** Optional branded namespace to write the imported links into. */
  targetNamespace?: string;
  /** When true, fetch and transform without writing any links (dry run). */
  scanOnly?: boolean;
}

export interface WaitForCompletionOptions {
  /** How often to poll for status. Defaults to 2000ms. */
  pollIntervalMs?: number;
  /** Maximum time to wait before throwing. Defaults to 120000ms. */
  timeoutMs?: number;
}

/**
 * Import links from external providers (e.g. Bitly) into AWSYS.CO.
 *
 * Errors are surfaced via the shared typed error classes:
 * - {@link AwsysValidationError} (HTTP 400) — `UNSUPPORTED_PROVIDER` or
 *   `INVALID_ACCESS_TOKEN`
 * - {@link AwsysConflictError} (HTTP 409) — `IMPORT_JOB_BUSY` (an import is
 *   already running for this user)
 * - {@link AwsysForbiddenError} (HTTP 403) — `PAID_TIER_REQUIRED`
 */
export class ImportsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Start a new import job.
   *
   * @param opts.provider - Source provider (e.g. "bitly")
   * @param opts.accessToken - Provider access token
   * @param opts.targetNamespace - Optional namespace to write links into
   * @param opts.scanOnly - When true, perform a dry run without writing links
   */
  async start(opts: StartImportOptions): Promise<ImportJob> {
    const body: Record<string, unknown> = {
      provider: opts.provider,
      accessToken: opts.accessToken,
    };
    if (opts.targetNamespace !== undefined) {
      body.targetNamespace = opts.targetNamespace;
    }
    if (opts.scanOnly !== undefined) {
      body.scanOnly = opts.scanOnly;
    }
    return this.http.post<ImportJob>(paths.imports.base, body);
  }

  /**
   * Get the current status of an import job.
   *
   * @param jobId - The import job ID
   */
  async getStatus(jobId: string): Promise<ImportJob> {
    return this.http.get<ImportJob>(paths.imports.byId(jobId));
  }

  /**
   * Cancel a running import job.
   *
   * @param jobId - The import job ID
   */
  async cancel(jobId: string): Promise<ImportJob> {
    return this.http.delete<ImportJob>(paths.imports.byId(jobId));
  }

  /**
   * List the authenticated user's import jobs (most recent first).
   *
   * @param opts.limit - Maximum number of jobs to return
   */
  async list(opts?: { limit?: number }): Promise<ImportJob[]> {
    const params: Record<string, string | number> = {};
    if (opts?.limit !== undefined) params.limit = opts.limit;
    const response = await this.http.get<{ jobs: ImportJob[] }>(
      paths.imports.base,
      params,
    );
    return response.jobs;
  }

  /**
   * Download the redirect map for a completed import as raw CSV text
   * (`old_url,new_url` rows).
   *
   * @param jobId - The import job ID
   */
  async getRedirectMapCsv(jobId: string): Promise<string> {
    return this.http.getText(paths.imports.redirectMapCsv(jobId));
  }

  /**
   * Download the redirect map for a completed import as structured JSON.
   *
   * @param jobId - The import job ID
   */
  async getRedirectMapJson(jobId: string): Promise<ImportRedirectMap> {
    return this.http.get<ImportRedirectMap>(paths.imports.redirectMapJson(jobId));
  }

  /**
   * Poll an import job until it reaches a terminal status
   * (`completed`, `partial`, `failed`, or `cancelled`) or the timeout elapses.
   *
   * @param jobId - The import job ID
   * @param opts.pollIntervalMs - How often to poll (default 2000ms)
   * @param opts.timeoutMs - Maximum time to wait (default 120000ms)
   * @throws Error if the job has not reached a terminal status before the timeout
   */
  async waitForCompletion(
    jobId: string,
    opts?: WaitForCompletionOptions,
  ): Promise<ImportJob> {
    const pollIntervalMs = opts?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const job = await this.getStatus(jobId);
      if (TERMINAL_STATUSES.includes(job.status)) {
        return job;
      }
      if (Date.now() + pollIntervalMs >= deadline) {
        throw new Error(
          `Import job ${jobId} did not reach a terminal status within ${timeoutMs}ms ` +
            `(last status: "${job.status}")`,
        );
      }
      await sleep(pollIntervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
