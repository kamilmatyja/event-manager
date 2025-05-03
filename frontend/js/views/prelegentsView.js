import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {escapeHtml} from "../helpers.js";

let prelegentsCache = [];
let usersCache = [];

export async function renderPrelegentsList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania prelegentami.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {

        [prelegentsCache, usersCache] = await Promise.all([
            fetchWrapper('/prelegents'),
            fetchWrapper('/users')
        ]);

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Prelegentami</h1>
                <button id="add-prelegent-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Prelegenta
                </button>
            </div>
            <div id="prelegents-table-container">
                ${renderPrelegentsTable(prelegentsCache)}
            </div>

            <!-- Modal do dodawania/edycji -->
            <div class="modal fade" id="prelegentModal" tabindex="-1" aria-labelledby="prelegentModalLabel" aria-hidden="true">
              <div class="modal-dialog modal-lg">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="prelegentModalLabel">Dodaj/Edytuj Prelegenta</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="prelegent-form">
                      <input type="hidden" id="prelegentId">
                       <div class="row">
                           <div class="col-md-6 mb-3">
                                <label for="prelegentUserId" class="form-label">Powiązany Użytkownik</label>
                                <select class="form-select" id="prelegentUserId" required>
                                    <option value="" selected disabled>Wybierz użytkownika...</option>
                                    ${usersCache.map(user => `<option value="${user.id}">${user.nick} (${user.first_name} ${user.last_name} - ${user.email})</option>`).join('')}
                                </select>
                                <div class="invalid-feedback">Wybór użytkownika jest wymagany.</div>
                           </div>
                           <div class="col-md-6 mb-3">
                                <label for="prelegentName" class="form-label">Tytuł</label>
                                <input type="text" class="form-control" id="prelegentName" required minlength="2" maxlength="100">
                                <div class="invalid-feedback">Nazwa jest wymagana (min 2, max 100 znaków).</div>
                          </div>
                       </div>
                      <div class="mb-3">
                        <label for="prelegentDescription" class="form-label">Opis</label>
                        <textarea class="form-control" id="prelegentDescription" rows="4" required></textarea>
                         <div class="invalid-feedback">Opis jest wymagany.</div>
                      </div>
                       <div id="prelegent-form-error" class="text-danger mb-3" style="display: none;"></div>
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
            <div class="modal fade" id="deletePrelegentConfirmModal" tabindex="-1" aria-labelledby="deletePrelegentConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deletePrelegentConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć prelegenta "<strong id="prelegent-to-delete-name"></strong>"? Spowoduje to usunięcie tylko rekordu prelegenta, powiązany użytkownik (<strong id="prelegent-user-to-delete-nick"></strong>) pozostanie w systemie.
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="prelegent-to-delete-id">
                     <div id="delete-prelegent-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-prelegent-btn">Usuń Prelegenta</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachPrelegentEventListeners();

    } catch (error) {
        console.error('Error fetching prelegents or users:', error);
        ui.showError(`Nie udało się załadować danych: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderPrelegentsTable(prelegents) {
    if (!prelegents || prelegents.length === 0) {
        return '<p>Brak zdefiniowanych prelegentów.</p>';
    }

    const tableRows = prelegents.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.user_nick + '(' + p.user_first_name + ' ' + p.user_last_name + ' - ' + p.user_email + ')')}</td>
            <td>${escapeHtml(p.description)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-prelegent-btn" data-id="${p.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-prelegent-btn" data-id="${p.id}" data-name="${escapeHtml(p.name)}" data-user-nick="${escapeHtml(p.user_nick || '')}" title="Usuń">
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
                    <th>Nazwa Prelegenta</th>
                    <th>Powiązany Użytkownik</th>
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

function attachPrelegentEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('prelegentModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('prelegent-form');
    const idInput = document.getElementById('prelegentId');
    const userIdSelect = document.getElementById('prelegentUserId');
    const nameInput = document.getElementById('prelegentName');
    const descriptionInput = document.getElementById('prelegentDescription');
    const formError = document.getElementById('prelegent-form-error');

    const deleteModalElement = document.getElementById('deletePrelegentConfirmModal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    const deleteIdInput = document.getElementById('prelegent-to-delete-id');
    const deleteNameSpan = document.getElementById('prelegent-to-delete-name');
    const deleteUserNickSpan = document.getElementById('prelegent-user-to-delete-nick');
    const confirmDeleteBtn = document.getElementById('confirm-delete-prelegent-btn');
    const deleteErrorDiv = document.getElementById('delete-prelegent-error');

    document.getElementById('add-prelegent-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('prelegentModalLabel').textContent = 'Dodaj Nowego Prelegenta';
        formError.style.display = 'none';
        form.classList.remove('was-validated');
        modal.show();
    });

    container.querySelectorAll('.edit-prelegent-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;

            const prelegent = prelegentsCache.find(p => p.id === parseInt(id));
            if (prelegent) {
                form.reset();
                idInput.value = prelegent.id;
                userIdSelect.value = prelegent.user_id;
                nameInput.value = prelegent.name;
                descriptionInput.value = prelegent.description;
                document.getElementById('prelegentModalLabel').textContent = 'Edytuj Prelegenta';
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

        const prelegentData = {
            user_id: parseInt(userIdSelect.value, 10),
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
        };
        const prelegentId = idInput.value;
        const isEditing = !!prelegentId;
        const url = isEditing ? `/prelegents/${prelegentId}` : '/prelegents';
        const method = isEditing ? 'PUT' : 'POST';

        if (isNaN(prelegentData.user_id)) {
            formError.textContent = 'Błąd: Musisz wybrać powiązanego użytkownika.';
            formError.style.display = 'block';
            userIdSelect.classList.add('is-invalid');
            return;
        }

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(prelegentData)});
            modal.hide();
            ui.showSuccess(`Prelegent został ${isEditing ? 'zaktualizowany' : 'dodany'} pomyślnie.`);
            renderPrelegentsList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error saving prelegent:', error);
            formError.textContent = `Błąd zapisu: ${error.message}`;
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
            userIdSelect.classList.remove('is-invalid');
        }
    });

    container.querySelectorAll('.delete-prelegent-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            const userNick = e.currentTarget.dataset.userNick;
            deleteIdInput.value = id;
            deleteNameSpan.textContent = name;
            deleteUserNickSpan.textContent = userNick || 'Nieznany';
            deleteErrorDiv.style.display = 'none';
            deleteModal.show();
        });
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const idToDelete = deleteIdInput.value;
        if (!idToDelete) return;
        deleteErrorDiv.style.display = 'none';

        try {
            await fetchWrapper(`/prelegents/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            ui.showSuccess('Rekord prelegenta został pomyślnie usunięty.');
            renderPrelegentsList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error deleting prelegent:', error);
            deleteErrorDiv.textContent = `Błąd usuwania: ${error.message}`;
            deleteErrorDiv.style.display = 'block';
        }
    });

    container.querySelectorAll('a[data-navigo]').forEach(link => {
        if (!link.dataset.listenerAttached) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.getAttribute('href'));
            });
            link.dataset.listenerAttached = 'true';
        }
    });

}