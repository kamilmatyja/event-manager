import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {escapeHtml} from "../helpers.js";

let resourcesCache = [];

export async function renderResourcesList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania sprzętem.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        resourcesCache = await fetchWrapper('/resources');

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Sprzętem</h1>
                <button id="add-resource-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Sprzęt
                </button>
            </div>
            <div id="resources-table-container">
                ${renderResourcesTable(resourcesCache)}
            </div>

            <!-- Modal do dodawania/edycji -->
            <div class="modal fade" id="resourceModal" tabindex="-1" aria-labelledby="resourceModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="resourceModalLabel">Dodaj/Edytuj Sprzęt</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="resource-form">
                      <input type="hidden" id="resourceId">
                      <div class="mb-3">
                        <label for="resourceName" class="form-label">Nazwa Sprzętu</label>
                        <input type="text" class="form-control" id="resourceName" required minlength="2" maxlength="100">
                        <div class="invalid-feedback">Nazwa jest wymagana (min 2, max 100 znaków).</div>
                      </div>
                      <div class="mb-3">
                        <label for="resourceDescription" class="form-label">Opis</label>
                        <textarea class="form-control" id="resourceDescription" rows="3" required></textarea>
                         <div class="invalid-feedback">Opis jest wymagany.</div>
                      </div>
                       <div id="resource-form-error" class="text-danger mb-3" style="display: none;"></div>
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
            <div class="modal fade" id="deleteResourceConfirmModal" tabindex="-1" aria-labelledby="deleteResourceConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteResourceConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć sprzęt "<strong id="resource-to-delete-name"></strong>"?
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="resource-to-delete-id">
                     <div id="delete-resource-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-resource-btn">Usuń</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachResourceEventListeners();

    } catch (error) {
        console.error('Error fetching resources:', error);
        ui.showError(`Nie udało się załadować sprzętów: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderResourcesTable(resources) {
    if (!resources || resources.length === 0) {
        return '<p>Brak zdefiniowanych sprzętów.</p>';
    }

    const tableRows = resources.map(res => `
        <tr>
            <td>${res.id}</td>
            <td>${escapeHtml(res.name)}</td>
            <td>${escapeHtml(res.description)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-resource-btn" data-id="${res.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-resource-btn" data-id="${res.id}" data-name="${escapeHtml(res.name)}" title="Usuń">
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

function attachResourceEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('resourceModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('resource-form');
    const idInput = document.getElementById('resourceId');
    const nameInput = document.getElementById('resourceName');
    const descriptionInput = document.getElementById('resourceDescription');
    const formError = document.getElementById('resource-form-error');

    const deleteModalElement = document.getElementById('deleteResourceConfirmModal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    const deleteIdInput = document.getElementById('resource-to-delete-id');
    const deleteNameSpan = document.getElementById('resource-to-delete-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-resource-btn');
    const deleteErrorDiv = document.getElementById('delete-resource-error');

    document.getElementById('add-resource-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('resourceModalLabel').textContent = 'Dodaj Nowy Sprzęt';
        formError.style.display = 'none';
        form.classList.remove('was-validated');
        modal.show();
    });

    container.querySelectorAll('.edit-resource-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const resource = resourcesCache.find(res => res.id === parseInt(id));
            if (resource) {
                form.reset();
                idInput.value = resource.id;
                nameInput.value = resource.name;
                descriptionInput.value = resource.description;
                document.getElementById('resourceModalLabel').textContent = 'Edytuj Sprzęt';
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

        const resourceData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
        };
        const resourceId = idInput.value;
        const isEditing = !!resourceId;
        const url = isEditing ? `/resources/${resourceId}` : '/resources';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(resourceData)});
            modal.hide();
            ui.showSuccess(`Sprzęt został ${isEditing ? 'zaktualizowany' : 'dodany'} pomyślnie.`);
            renderResourcesList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error saving resource:', error);
            formError.textContent = `Błąd zapisu: ${error.message}`;
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
        }
    });

    container.querySelectorAll('.delete-resource-btn').forEach(button => {
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
            await fetchWrapper(`/resources/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            ui.showSuccess('Sprzęt został pomyślnie usunięty.');
            renderResourcesList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error deleting resource:', error);
            deleteErrorDiv.textContent = `Błąd usuwania: ${error.message}`;
            deleteErrorDiv.style.display = 'block';
        }
    });
}