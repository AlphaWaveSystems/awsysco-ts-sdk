import type { HttpClient } from "../http.js";
import type { CreateWebhookOptions, UpdateWebhookOptions, Webhook } from "../types.js";

export class WebhooksResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get all available webhook event types and their descriptions.
   */
  async listEventTypes(): Promise<{ eventTypes: string[]; descriptions: Record<string, string> }> {
    return this.http.get<{ eventTypes: string[]; descriptions: Record<string, string> }>(
      "/api/webhooks/event-types",
    );
  }

  /**
   * List all webhooks for the authenticated user.
   */
  async list(): Promise<{ webhooks: Webhook[]; limit: number; used: number }> {
    return this.http.get<{ webhooks: Webhook[]; limit: number; used: number }>(
      "/api/webhooks",
    );
  }

  /**
   * Create a new webhook.
   *
   * @param opts - Webhook creation options
   */
  async create(opts: CreateWebhookOptions): Promise<Webhook> {
    return this.http.post<Webhook>("/api/webhooks", opts);
  }

  /**
   * Update an existing webhook.
   *
   * @param webhookId - The ID of the webhook to update
   * @param opts - Fields to update
   */
  async update(webhookId: string, opts: UpdateWebhookOptions): Promise<Webhook> {
    return this.http.patch<Webhook>(
      `/api/webhooks/${encodeURIComponent(webhookId)}`,
      opts,
    );
  }

  /**
   * Delete a webhook.
   *
   * @param webhookId - The ID of the webhook to delete
   */
  async delete(webhookId: string): Promise<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `/api/webhooks/${encodeURIComponent(webhookId)}`,
    );
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
  ): Promise<{ success: boolean; statusCode?: number; responseTime?: number }> {
    return this.http.post<{ success: boolean; statusCode?: number; responseTime?: number }>(
      `/api/webhooks/${encodeURIComponent(webhookId)}/test`,
      { eventType },
    );
  }
}
