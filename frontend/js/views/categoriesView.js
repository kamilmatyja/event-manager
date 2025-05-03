import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {escapeHtml} from "../helpers.js";

let categoriesCache = [];

export async function renderCategoriesList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania kategoriami.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        categoriesCache = await fetchWrapper('/categories');

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Kategoriami</h1>
                <button id="add-category-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Kategorię
                </button>
            </div>
            <div id="categories-table-container">
                ${renderCategoriesTable(categoriesCache)}
            </div>

            <!-- Modal do dodawania/edycji kategorii -->
            <div class="modal fade" id="categoryModal" tabindex="-1" aria-labelledby="categoryModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="categoryModalLabel">Dodaj/Edytuj Kategorię</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="category-form">
                      <input type="hidden" id="categoryId">
                      <div class="mb-3">
                        <label for="categoryName" class="form-label">Nazwa Kategorii</label>
                        <input type="text" class="form-control" id="categoryName" required minlength="5" maxlength="100">
                        <div class="invalid-feedback">Nazwa jest wymagana (min 5, max 100 znaków).</div>
                      </div>
                      <div class="mb-3">
                        <label for="categoryDescription" class="form-label">Opis</label>
                        <textarea class="form-control" id="categoryDescription" rows="3" required></textarea>
                         <div class="invalid-feedback">Opis jest wymagany.</div>
                      </div>
                       <!-- Miejsce na komunikaty o błędach API -->
                       <div id="category-form-error" class="text-danger mb-3" style="display: none;"></div>
                       <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                            <button type="submit" class="btn btn-primary">Zapisz</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

             <!-- Modal do potwierdzenia usunięcia -->
            <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć kategorię "<strong id="category-to-delete-name"></strong>"?
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="category-to-delete-id">
                     <!-- Miejsce na komunikaty o błędach API -->
                     <div id="delete-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-btn">Usuń</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachEventListeners();

    } catch (error) {
        ui.showError(`Nie udało się załadować kategorii: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderCategoriesTable(categories) {
    if (!categories || categories.length === 0) {
        return '<p>Brak zdefiniowanych kategorii.</p>';
    }

    const tableRows = categories.map(cat => `
        <tr>
            <td>${cat.id}</td>
            <td>${escapeHtml(cat.name)}</td>
            <td>${escapeHtml(cat.description)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-category-btn" data-id="${cat.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-category-btn" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" title="Usuń">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    return `
        <table class="table table-striped table-hover table-bordered">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>Nazwa</th>
                    <th>Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

function attachEventListeners() {
    const container = document.getElementById('app-content');
    const categoryModalElement = document.getElementById('categoryModal');
    const categoryModal = new bootstrap.Modal(categoryModalElement);
    const categoryForm = document.getElementById('category-form');
    const categoryIdInput = document.getElementById('categoryId');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryDescriptionInput = document.getElementById('categoryDescription');
    const categoryFormError = document.getElementById('category-form-error');

    const deleteConfirmModalElement = document.getElementById('deleteConfirmModal');
    const deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalElement);
    const categoryToDeleteIdInput = document.getElementById('category-to-delete-id');
    const categoryToDeleteNameSpan = document.getElementById('category-to-delete-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteErrorDiv = document.getElementById('delete-error');

    document.getElementById('add-category-btn')?.addEventListener('click', () => {
        categoryForm.reset();
        categoryIdInput.value = '';
        document.getElementById('categoryModalLabel').textContent = 'Dodaj Nową Kategorię';
        categoryFormError.style.display = 'none';
        categoryModal.show();
    });

    container.querySelectorAll('.edit-category-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const category = categoriesCache.find(cat => cat.id === parseInt(id));
            if (category) {
                categoryForm.reset();
                categoryIdInput.value = category.id;
                categoryNameInput.value = category.name;
                categoryDescriptionInput.value = category.description;
                document.getElementById('categoryModalLabel').textContent = 'Edytuj Kategorię';
                categoryFormError.style.display = 'none';
                categoryModal.show();
            }
        });
    });

    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        categoryFormError.style.display = 'none';
        categoryForm.classList.add('was-validated');

        if (!categoryForm.checkValidity()) {
            return;
        }

        const categoryData = {
            name: categoryNameInput.value.trim(),
            description: categoryDescriptionInput.value.trim(),
        };
        const categoryId = categoryIdInput.value;
        const isEditing = !!categoryId;
        const url = isEditing ? `/categories/${categoryId}` : '/categories';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(categoryData)});
            categoryModal.hide();
            await renderCategoriesList(document.getElementById('app-content'));
            ui.showSuccess(`Kategoria została ${isEditing ? 'zaktualizowana' : 'dodana'} pomyślnie.`);
        } catch (error) {
            categoryFormError.textContent = 'Błędne dane';
            categoryFormError.style.display = 'block';
        } finally {
            categoryForm.classList.remove('was-validated');
        }
    });

    container.querySelectorAll('.delete-category-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            categoryToDeleteIdInput.value = id;
            categoryToDeleteNameSpan.textContent = name;
            deleteErrorDiv.style.display = 'none';
            deleteConfirmModal.show();
        });
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const idToDelete = categoryToDeleteIdInput.value;
        if (!idToDelete) return;
        deleteErrorDiv.style.display = 'none';

        try {
            await fetchWrapper(`/categories/${idToDelete}`, {method: 'DELETE'});
            deleteConfirmModal.hide();
            await renderCategoriesList(document.getElementById('app-content'));
            ui.showSuccess('Kategoria została pomyślnie usunięta.');
        } catch (error) {
            deleteErrorDiv.textContent = 'Błędne dane';
            deleteErrorDiv.style.display = 'block';
        }
    });

}