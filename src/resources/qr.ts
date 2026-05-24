import type { QRCodeOptions } from "../types.js";

export class QRResource {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
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
}
