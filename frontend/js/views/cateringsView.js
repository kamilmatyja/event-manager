import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {escapeHtml} from "../helpers.js";

let cateringsCache = [];

export async function renderCateringsList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania cateringiem.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        cateringsCache = await fetchWrapper('/caterings');

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Cateringiem</h1>
                <button id="add-catering-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Catering
                </button>
            </div>
            <div id="caterings-table-container">
                ${renderCateringsTable(cateringsCache)}
            </div>

            <!-- Modal do dodawania/edycji -->
            <div class="modal fade" id="cateringModal" tabindex="-1" aria-labelledby="cateringModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="cateringModalLabel">Dodaj/Edytuj Catering</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="catering-form">
                      <input type="hidden" id="cateringId">
                      <div class="mb-3">
                        <label for="cateringName" class="form-label">Nazwa Firmy</label>
                        <input type="text" class="form-control" id="cateringName" required minlength="5" maxlength="100">
                        <div class="invalid-feedback">Nazwa jest wymagana (min 5, max 100 znaków).</div>
                      </div>
                      <div class="mb-3">
                        <label for="cateringDescription" class="form-label">Opis</label>
                        <textarea class="form-control" id="cateringDescription" rows="3" required></textarea>
                         <div class="invalid-feedback">Opis jest wymagany.</div>
                      </div>
                       <div id="catering-form-error" class="text-danger mb-3" style="display: none;"></div>
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
            <div class="modal fade" id="deleteCateringConfirmModal" tabindex="-1" aria-labelledby="deleteCateringConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteCateringConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć catering "<strong id="catering-to-delete-name"></strong>"?
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="catering-to-delete-id">
                     <div id="delete-catering-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-catering-btn">Usuń</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachCateringEventListeners();

    } catch (error) {
        ui.showError(`Nie udało się załadować cateringu: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderCateringsTable(caterings) {
    if (!caterings || caterings.length === 0) {
        return '<p>Brak zdefiniowanych cateringów.</p>';
    }

    const tableRows = caterings.map(cat => `
        <tr>
            <td>${cat.id}</td>
            <td>${escapeHtml(cat.name)}</td>
            <td>${escapeHtml(cat.description)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-catering-btn" data-id="${cat.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-catering-btn" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" title="Usuń">
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

function attachCateringEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('cateringModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('catering-form');
    const idInput = document.getElementById('cateringId');
    const nameInput = document.getElementById('cateringName');
    const descriptionInput = document.getElementById('cateringDescription');
    const formError = document.getElementById('catering-form-error');

    const deleteModalElement = document.getElementById('deleteCateringConfirmModal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    const deleteIdInput = document.getElementById('catering-to-delete-id');
    const deleteNameSpan = document.getElementById('catering-to-delete-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-catering-btn');
    const deleteErrorDiv = document.getElementById('delete-catering-error');

    document.getElementById('add-catering-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('cateringModalLabel').textContent = 'Dodaj Nowy Catering';
        formError.style.display = 'none';
        form.classList.remove('was-validated');
        modal.show();
    });

    container.querySelectorAll('.edit-catering-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const catering = cateringsCache.find(cat => cat.id === parseInt(id));
            if (catering) {
                form.reset();
                idInput.value = catering.id;
                nameInput.value = catering.name;
                descriptionInput.value = catering.description;
                document.getElementById('cateringModalLabel').textContent = 'Edytuj Catering';
                formError.style.display = 'none';
                form.classList.remove('was-validated');
                modal.show();
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formError.style.display = 'none';
        form.classList.add('was-validated');

        if (!form.checkValidity()) {
            return;
        }

        const cateringData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
        };
        const cateringId = idInput.value;
        const isEditing = !!cateringId;
        const url = isEditing ? `/caterings/${cateringId}` : '/caterings';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(cateringData)});
            modal.hide();
            await renderCateringsList(document.getElementById('app-content'));
            ui.showSuccess(`Catering został ${isEditing ? 'zaktualizowany' : 'dodany'} pomyślnie.`);
        } catch (error) {
            formError.textContent = 'Błędne dane';
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
        }
    });

    container.querySelectorAll('.delete-catering-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            deleteIdInput.value = id;
            deleteNameSpan.textContent = name;
            deleteErrorDiv.style.display = 'none';
            deleteModal.show();
        });
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const idToDelete = deleteIdInput.value;
        if (!idToDelete) return;
        deleteErrorDiv.style.display = 'none';

        try {
            await fetchWrapper(`/caterings/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            await renderCateringsList(document.getElementById('app-content'));
            ui.showSuccess('Catering został pomyślnie usunięty.');
        } catch (error) {
            deleteErrorDiv.textContent = 'Błędne dane';
            deleteErrorDiv.style.display = 'block';
        }
    });
}