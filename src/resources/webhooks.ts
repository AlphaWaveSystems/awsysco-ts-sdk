import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { CreateWebhookOptions, UpdateWebhookOptions, Webhook } from "../types.js";

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get all available webhook event types and their descriptions.
   */
  async listEventTypes(): Promise<{ eventTypes: string[]; descriptions?: Record<string, string> }> {
    return this.http.get<{ eventTypes: string[]; descriptions?: Record<string, string> }>(
      paths.webhooks.eventTypes,
    );
  }

  /**
   * List all webhooks for the authenticated user.
   */
  async list(): Promise<{ webhooks: Webhook[]; limit: number; used?: number }> {
    return this.http.get<{ webhooks: Webhook[]; limit: number; used?: number }>(
      paths.webhooks.base,
    );
  }

  /**
   * Create a new webhook.
   *
   * @param opts - Webhook creation options
   */
  async create(opts: CreateWebhookOptions): Promise<Webhook> {
    return this.http.post<Webhook>(paths.webhooks.base, opts);
  }

  /**
   * Update an existing webhook.
   *
   * Note: unlike list/create/delete/test, this action has no `/api/v1/`
   * twin on the platform — it stays on the unversioned route.
   *
   * @param webhookId - The ID of the webhook to update
   * @param opts - Fields to update
   */
  async update(webhookId: string, opts: UpdateWebhookOptions): Promise<Webhook> {
    return this.http.patch<Webhook>(paths.webhooks.byIdForUpdate(webhookId), opts);
  }

  /**
   * Delete a webhook.
   *
   * @param webhookId - The ID of the webhook to delete
   */
  async delete(webhookId: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(paths.webhooks.byId(webhookId));
  }

  /**
   * Send a test event to a webhook.
   *
   * @param webhookId - The ID of the webhook to test
   * @param eventType - The event type to simulate (e.g. "link.created")
   */
  async test(
    webhookId: string,
    eventType: string,
  ): Promise<{ success: boolean; statusCode?: number; durationMs?: number }> {
    return this.http.post<{ success: boolean; statusCode?: number; durationMs?: number }>(
      paths.webhooks.test(webhookId),
      { eventType },
    );
  }
}
