import type { HttpClient } from "../http.js";
import type { CreateFolderOptions, Folder, UpdateFolderOptions } from "../types.js";

interface RawFoldersResponse {
  folders?: Folder[];
  data?: Folder[];
}

export class FoldersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all folders for the authenticated user.
   */
  async list(): Promise<Folder[]> {
    const raw = await this.http.get<RawFoldersResponse>("/api/v1/folders");
    return raw.folders ?? raw.data ?? (raw as unknown as Folder[]);
  }

  /**
   * Create a new folder.
   */
  async create(opts: CreateFolderOptions): Promise<Folder> {
    return this.http.post<Folder>("/api/v1/folders", opts);
  }

  /**
   * Update a folder's name or color.
   *
   * @param folderId - The ID of the folder to update
   * @param opts - Fields to update
   */
  async update(folderId: string, opts: UpdateFolderOptions): Promise<Folder> {
    return this.http.patch<Folder>(
      `/api/v1/folders/${encodeURIComponent(folderId)}`,
      opts,
    );
  }

  /**
   * Delete a folder by ID.
   */
  async delete(folderId: string): Promise<void> {
    return this.http.delete<void>(
      `/api/v1/folders/${encodeURIComponent(folderId)}`,
    );
  }

  /**
   * Assign a link to a folder.
   */
  async assignLink(shortPath: string, folderId: string): Promise<void> {
    return this.http.post<void>(
      `/api/v1/links/${encodeURIComponent(shortPath)}/folder`,
      { folderId },
    );
  }

  /**
   * Remove a link from its current folder.
   */
  async removeLink(shortPath: string): Promise<void> {
    return this.http.post<void>(
      `/api/v1/links/${encodeURIComponent(shortPath)}/folder`,
      { folderId: null },
    );
  }
}
