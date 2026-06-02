import type { HttpClient } from "../http.js";
import type { QRCodeOptions, QRSettings } from "../types.js";

export class QRResource {
  private readonly baseUrl: string;
  private readonly http: HttpClient;

  constructor(baseUrl: string, http: HttpClient) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.http = http;
  }

  /**
   * Returns the URL for a QR code image.
   * This method constructs the URL without making a network request.
   * To display the QR code, use the returned URL as an image src.
   *
   * @param shortCode - The short code or path (e.g. "abc123")
   * @param opts - Optional appearance options
   * @returns Full URL to the QR code image
   */
  getUrl(shortCode: string, opts?: QRCodeOptions): string {
    const url = new URL(
      `${this.baseUrl}/api/qr/${encodeURIComponent(shortCode)}`,
    );

    if (opts?.size !== undefined) {
      url.searchParams.set("size", String(opts.size));
    }
    if (opts?.color !== undefined) {
      url.searchParams.set("color", opts.color);
    }
    if (opts?.bgColor !== undefined) {
      url.searchParams.set("bgColor", opts.bgColor);
    }

    return url.toString();
  }

  /**
   * Get the QR code settings for a link.
   *
   * @param shortPath - The short code or namespaced path
   */
  async getSettings(shortPath: string): Promise<QRSettings> {
    return this.http.get<QRSettings>(
      `/api/link/${encodeURIComponent(shortPath)}/qr-settings`,
    );
  }

  /**
   * Update the QR code settings for a link.
   *
   * @param shortPath - The short code or namespaced path
   * @param settings - The QR settings to apply
   */
  async updateSettings(shortPath: string, settings: QRSettings): Promise<QRSettings> {
    return this.http.put<QRSettings>(
      `/api/link/${encodeURIComponent(shortPath)}/qr-settings`,
      settings,
    );
  }
}
