import type { HttpClient, RequestOptions } from "../http.js";
import { paths } from "../paths.js";
import { mapTimestampFields } from "../timestamps.js";
import type { CreateFolderOptions, Folder, UpdateFolderOptions } from "../types.js";

interface RawFoldersResponse {
  folders?: Folder[];
  data?: Folder[];
}

function mapFolder(raw: Folder): Folder {
  return mapTimestampFields(raw, ["createdAt"]);
}

export class FoldersResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all folders for the authenticated user.
   */
  async list(options?: RequestOptions): Promise<Folder[]> {
    const raw = await this.http.get<RawFoldersResponse>(
      paths.folders.base,
      undefined,
      options,
    );
    return (raw.folders ?? raw.data ?? []).map(mapFolder);
  }

  /**
   * Create a new folder.
   */
  async create(opts: CreateFolderOptions, options?: RequestOptions): Promise<Folder> {
    const raw = await this.http.post<Folder>(paths.folders.base, opts, options);
    return mapFolder(raw);
  }

  /**
   * Update a folder's name or color.
   *
   * @param folderId - The ID of the folder to update
   * @param opts - Fields to update
   */
  async update(
    folderId: string,
    opts: UpdateFolderOptions,
    options?: RequestOptions,
  ): Promise<Folder> {
    const raw = await this.http.patch<Folder>(
      paths.folders.byIdForUpdate(folderId),
      opts,
      options,
    );
    return mapFolder(raw);
  }

  /**
   * Delete a folder by ID.
   */
  async delete(folderId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete<void>(paths.folders.byId(folderId), options);
  }

  /**
   * Assign a link to a folder.
   */
  async assignLink(
    shortPath: string,
    folderId: string,
    options?: RequestOptions,
  ): Promise<void> {
    return this.http.post<void>(paths.links.folder(shortPath), { folderId }, options);
  }

  /**
   * Remove a link from its current folder.
   */
  async removeLink(shortPath: string, options?: RequestOptions): Promise<void> {
    return this.http.post<void>(paths.links.folder(shortPath), { folderId: null }, options);
  }
}
