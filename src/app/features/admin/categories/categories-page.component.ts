import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Category } from '../../../core/models/territorial.models';
import { TerritorialApiService } from '../../../core/services/territorial-api.service';
import { formatApiError } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
})
export class CategoriesPageComponent implements OnInit {
  private readonly api = inject(TerritorialApiService);
  items: Category[] = [];
  editingId: number | null = null;
  message = '';
  error = '';
  selectedFile: File | null = null;
  form: Partial<Category> = this.emptyForm();

  expandedParents = new Set<number>();

  ngOnInit(): void { this.load(); }

  toggleExpand(id: number): void {
    if (this.expandedParents.has(id)) {
      this.expandedParents.delete(id);
    } else {
      this.expandedParents.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedParents.has(id);
  }

  subcategories(parentId: number): Category[] {
    return this.items.filter((c) => c.id_parent_category === parentId);
  }

  load(): void {
    this.api.categories().subscribe({ next: (items) => (this.items = items), error: (e) => this.setError(e) });
  }

  parentCategories(): Category[] {
    return this.items.filter((c) => !c.id_parent_category);
  }

  parentName(id?: number | null): string {
    if (!id) return '—';
    return this.items.find((c) => c.id_category === id)?.name || String(id);
  }

  edit(item: Category): void { this.editingId = item.id_category; this.form = { ...item }; this.selectedFile = null; }
  reset(): void { this.editingId = null; this.form = this.emptyForm(); this.selectedFile = null; }

  onFileChange(event: Event): void {
    this.selectedFile = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  save(): void {
    const formData = new FormData();
    Object.entries(this.form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'id_category') {
        formData.append(key, String(value));
      }
    });
    if (this.selectedFile) formData.append('file', this.selectedFile);

    const req = this.editingId
      ? this.api.updateCategory(this.editingId, formData)
      : this.api.createCategory(formData);

    req.subscribe({ next: () => { this.message = 'Guardado'; this.reset(); this.load(); }, error: (e) => this.setError(e) });
  }

  remove(item: Category): void {
    if (!confirm(`Eliminar categoria "${item.name}"?`)) return;
    this.api.deleteCategory(item.id_category).subscribe({ next: () => { this.message = 'Eliminada'; this.load(); }, error: (e) => this.setError(e) });
  }

  imageUrl(item: Category): string | null { return this.api.imageUrl(item.image_url); }

  private emptyForm(): Partial<Category> {
    return { name: '', description: '', status: 'active', id_parent_category: null };
  }

  private setError(error: unknown): void {
    this.error = formatApiError(error);
  }
}
