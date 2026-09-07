import type { HttpClient } from "../http.js";
import { paths } from "../paths.js";
import type { CreateSavedViewOptions, SavedView, UpdateSavedViewOptions } from "../types.js";

export class SavedViewsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all saved views for the authenticated user.
   */
  async list(): Promise<{ views: SavedView[] }> {
    return this.http.get<{ views: SavedView[] }>(paths.savedViews.base);
  }

  /**
   * Create a new saved view.
   *
   * @param opts - View creation options including name and filters
   */
  async create(opts: CreateSavedViewOptions): Promise<SavedView> {
    return this.http.post<SavedView>(paths.savedViews.base, opts);
  }

  /**
   * Update an existing saved view.
   *
   * @param viewId - The ID of the view to update
   * @param opts - Fields to update
   */
  async update(viewId: string, opts: UpdateSavedViewOptions): Promise<SavedView> {
    return this.http.patch<SavedView>(paths.savedViews.byId(viewId), opts);
  }

  /**
   * Delete a saved view.
   *
   * @param viewId - The ID of the view to delete
   */
  async delete(viewId: string): Promise<void> {
    return this.http.delete<void>(paths.savedViews.byId(viewId));
  }
}
