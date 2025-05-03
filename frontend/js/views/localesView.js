import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';

let localesCache = [];

export async function renderLocalesList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania lokalizacjami.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        localesCache = await fetchWrapper('/locales');

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Lokalizacjami</h1>
                <button id="add-locale-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Lokalizację
                </button>
            </div>
            <div id="locales-table-container">
                ${renderLocalesTable(localesCache)}
            </div>

            <!-- Modal do dodawania/edycji -->
            <div class="modal fade" id="localeModal" tabindex="-1" aria-labelledby="localeModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="localeModalLabel">Dodaj/Edytuj Lokalizację</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="locale-form">
                      <input type="hidden" id="localeId">
                      <div class="mb-3">
                        <label for="localeCity" class="form-label">Miasto</label>
                        <input type="text" class="form-control" id="localeCity" required minlength="2" maxlength="100">
                        <div class="invalid-feedback">Nazwa miasta jest wymagana (min 2, max 100 znaków).</div>
                      </div>
                      <div class="mb-3">
                        <label for="localeName" class="form-label">Nazwa Miejsca</label>
                        <input type="text" class="form-control" id="localeName" required minlength="3" maxlength="100">
                         <div class="invalid-feedback">Nazwa miejsca jest wymagana (min 3, max 100 znaków).</div>
                      </div>
                       <div id="locale-form-error" class="text-danger mb-3" style="display: none;"></div>
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
            <div class="modal fade" id="deleteLocaleConfirmModal" tabindex="-1" aria-labelledby="deleteLocaleConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteLocaleConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć lokalizację "<strong id="locale-to-delete-name"></strong>" w mieście <strong id="locale-to-delete-city"></strong>?
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                     <input type="hidden" id="locale-to-delete-id">
                     <div id="delete-locale-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-locale-btn">Usuń</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachLocaleEventListeners();

    } catch (error) {
        console.error('Error fetching locales:', error);
        ui.showError(`Nie udało się załadować lokalizacji: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderLocalesTable(locales) {
    if (!locales || locales.length === 0) {
        return '<p>Brak zdefiniowanych lokalizacji.</p>';
    }

    const tableRows = locales.map(loc => `
        <tr>
            <td>${loc.id}</td>
            <td>${escapeHtml(loc.city)}</td>
            <td>${escapeHtml(loc.name)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-locale-btn" data-id="${loc.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-locale-btn" data-id="${loc.id}" data-name="${escapeHtml(loc.name)}" data-city="${escapeHtml(loc.city)}" title="Usuń">
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
                    <th>Miasto</th>
                    <th>Nazwa Miejsca</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, "\"")
        .replace(/'/g, "'");
}

function attachLocaleEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('localeModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('locale-form');
    const idInput = document.getElementById('localeId');
    const cityInput = document.getElementById('localeCity');
    const nameInput = document.getElementById('localeName');
    const formError = document.getElementById('locale-form-error');

    const deleteModalElement = document.getElementById('deleteLocaleConfirmModal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    const deleteIdInput = document.getElementById('locale-to-delete-id');
    const deleteNameSpan = document.getElementById('locale-to-delete-name');
    const deleteCitySpan = document.getElementById('locale-to-delete-city');
    const confirmDeleteBtn = document.getElementById('confirm-delete-locale-btn');
    const deleteErrorDiv = document.getElementById('delete-locale-error');

    document.getElementById('add-locale-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('localeModalLabel').textContent = 'Dodaj Nową Lokalizację';
        formError.style.display = 'none';
        form.classList.remove('was-validated');
        modal.show();
    });

    container.querySelectorAll('.edit-locale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const locale = localesCache.find(loc => loc.id === parseInt(id));
            if (locale) {
                form.reset();
                idInput.value = locale.id;
                cityInput.value = locale.city;
                nameInput.value = locale.name;
                document.getElementById('localeModalLabel').textContent = 'Edytuj Lokalizację';
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

        const localeData = {
            city: cityInput.value.trim(),
            name: nameInput.value.trim(),
        };
        const localeId = idInput.value;
        const isEditing = !!localeId;
        const url = isEditing ? `/locales/${localeId}` : '/locales';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(localeData)});
            modal.hide();
            ui.showSuccess(`Lokalizacja została ${isEditing ? 'zaktualizowana' : 'dodana'} pomyślnie.`);
            renderLocalesList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error saving locale:', error);
            formError.textContent = `Błąd zapisu: ${error.message}`;
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
        }
    });

    container.querySelectorAll('.delete-locale-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            const city = e.currentTarget.dataset.city;
            deleteIdInput.value = id;
            deleteNameSpan.textContent = name;
            deleteCitySpan.textContent = city;
            deleteErrorDiv.style.display = 'none';
            deleteModal.show();
        });
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const idToDelete = deleteIdInput.value;
        if (!idToDelete) return;
        deleteErrorDiv.style.display = 'none';

        try {
            await fetchWrapper(`/locales/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            ui.showSuccess('Lokalizacja została pomyślnie usunięta.');
            renderLocalesList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error deleting locale:', error);
            deleteErrorDiv.textContent = `Błąd usuwania: ${error.message}`;
            deleteErrorDiv.style.display = 'block';
        }
    });
}