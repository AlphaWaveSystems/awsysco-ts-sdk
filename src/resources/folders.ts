import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
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
    const raw = await this.http.get<RawFoldersResponse>(paths.folders.base);
    return raw.folders ?? raw.data ?? [];
  }

  /**
   * Create a new folder.
   */
  async create(opts: CreateFolderOptions): Promise<Folder> {
    return this.http.post<Folder>(paths.folders.base, opts);
  }

  /**
   * Update a folder's name or color.
   *
   * @param folderId - The ID of the folder to update
   * @param opts - Fields to update
   */
  async update(folderId: string, opts: UpdateFolderOptions): Promise<Folder> {
    return this.http.patch<Folder>(paths.folders.byIdForUpdate(folderId), opts);
  }

  /**
   * Delete a folder by ID.
   */
  async delete(folderId: string): Promise<void> {
    return this.http.delete<void>(paths.folders.byId(folderId));
  }

  /**
   * Assign a link to a folder.
   */
  async assignLink(shortPath: string, folderId: string): Promise<void> {
    return this.http.post<void>(paths.links.folder(shortPath), { folderId });
  }

  /**
   * Remove a link from its current folder.
   */
  async removeLink(shortPath: string): Promise<void> {
    return this.http.post<void>(paths.links.folder(shortPath), { folderId: null });
  }
}
