import type { HttpClient } from "../http.js";
import type { Web2AppSession } from "../types.js";

export class Web2AppResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Consume a web-to-app deferred-deep-link session by its token.
   *
   * The token is **single-use** — it is consumed on read, so a second call
   * with the same token will fail. Tokens have a **24-hour TTL**.
   *
   * Errors are surfaced via the shared typed error classes:
   * - {@link AwsysNotFoundError} for a missing or expired token
   *   (`NOT_FOUND` / `TOKEN_EXPIRED`, HTTP 404)
   * - {@link AwsysValidationError} for a malformed token
   *   (`INVALID_TOKEN`, HTTP 400)
   *
   * @param token - The single-use session token to consume
   */
  async consumeSession(token: string): Promise<Web2AppSession> {
    return this.http.get<Web2AppSession>(
      `/api/v1/web2app/${encodeURIComponent(token)}`,
    );
  }
}
