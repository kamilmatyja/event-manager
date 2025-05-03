import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';

let usersCache = [];
const roles = auth.ROLES_MAP;

function getRoleName(roleValue) {
    for (const name in roles) {
        if (roles[name] === roleValue) {

            return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
    }
    return 'Nieznana';
}

export async function renderUsersList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania użytkownikami.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        usersCache = await fetchWrapper('/users');

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Użytkownikami</h1>
                <button id="add-user-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Użytkownika
                </button>
            </div>
            <div id="users-table-container">
                ${renderUsersTable(usersCache)}
            </div>

            <!-- Modal do dodawania/edycji -->
            <div class="modal fade" id="userModal" tabindex="-1" aria-labelledby="userModalLabel" aria-hidden="true">
              <div class="modal-dialog modal-lg">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="userModalLabel">Dodaj/Edytuj Użytkownika</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="user-form" novalidate>
                      <input type="hidden" id="userId">
                       <div class="row mb-3">
                            <div class="col-md-6">
                                <label for="userFirstName" class="form-label">Imię</label>
                                <input type="text" class="form-control" id="userFirstName" required minlength="2" maxlength="100">
                                <div class="invalid-feedback">Imię jest wymagane (min 2 znaki).</div>
                            </div>
                            <div class="col-md-6">
                                <label for="userLastName" class="form-label">Nazwisko</label>
                                <input type="text" class="form-control" id="userLastName" required minlength="2" maxlength="100">
                                <div class="invalid-feedback">Nazwisko jest wymagane (min 2 znaki).</div>
                            </div>
                       </div>
                       <div class="row mb-3">
                           <div class="col-md-6">
                                <label for="userNick" class="form-label">Nick</label>
                                <input type="text" class="form-control" id="userNick" required minlength="3" maxlength="100" pattern="^[a-zA-Z0-9_]+$">
                                <div class="invalid-feedback">Nick jest wymagany (min 3 znaki, tylko litery, cyfry, _).</div>
                           </div>
                            <div class="col-md-6">
                                <label for="userEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="userEmail" required>
                                <div class="invalid-feedback">Poprawny email jest wymagany.</div>
                           </div>
                       </div>
                      <div class="row mb-3">
                           <div class="col-md-6">
                                <label for="userPassword" class="form-label">Hasło</label>
                                <input type="password" class="form-control" id="userPassword" placeholder="Hasło" required pattern="(?=.*\\d)(?=.*[a-zA-Z]).{8,}">
                                <div class="invalid-feedback">Hasło musi mieć min. 8 znaków, literę i cyfrę (jeśli podane).</div>
                           </div>
                            <div class="col-md-6">
                                <label for="userRole" class="form-label">Rola</label>
                                <select class="form-select" id="userRole" required>
                                     <option value="" selected disabled>Wybierz rolę...</option>
                                     ${Object.entries(roles).map(([name, value]) => `<option value="${value}">${getRoleName(value)}</option>`).join('')}
                                </select>
                                <div class="invalid-feedback">Wybór roli jest wymagany.</div>
                            </div>
                      </div>
                       <div id="user-form-error" class="text-danger mb-3" style="display: none;"></div>
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
            <div class="modal fade" id="deleteUserConfirmModal" tabindex="-1" aria-labelledby="deleteUserConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteUserConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć użytkownika "<strong id="user-to-delete-nick"></strong>" (<span id="user-to-delete-email"></span>)?
                    <br><small>Spowoduje to usunięcie powiązanych biletów. Nie będzie można usunąć użytkownika, jeśli jest prelegentem przypisanym do wydarzenia.</small>
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="user-to-delete-id">
                     <div id="delete-user-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-user-btn">Usuń Użytkownika</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachUserEventListeners();

    } catch (error) {
        console.error('Error fetching users:', error);
        ui.showError(`Nie udało się załadować użytkowników: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderUsersTable(users) {
    if (!users || users.length === 0) {
        return '<p>Brak zarejestrowanych użytkowników.</p>';
    }

    const loggedInUserId = auth.getUserInfo()?.id;

    const tableRows = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.nick)}</td>
            <td>${escapeHtml(user.first_name)}</td>
            <td>${escapeHtml(user.last_name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${getRoleName(user.role)}</span></td>
            <td>
                <button class="btn btn-sm btn-primary edit-user-btn" data-id="${user.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-user-btn"
                        data-id="${user.id}"
                        data-nick="${escapeHtml(user.nick)}"
                        data-email="${escapeHtml(user.email)}"
                        title="Usuń"
                        ${user.id === loggedInUserId ? 'disabled' : ''}>
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    return `
        <table class="table table-striped table-hover table-bordered align-middle">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>Nick</th>
                    <th>Imię</th>
                    <th>Nazwisko</th>
                    <th>Email</th>
                    <th>Rola</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

function getRoleBadgeColor(roleValue) {
    switch (roleValue) {
        case roles.ADMINISTRATOR:
            return 'danger';
        case roles.PRELEGENT:
            return 'warning text-dark';
        case roles.MEMBER:
            return 'info text-dark';
        default:
            return 'secondary';
    }
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

function attachUserEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('userModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('user-form');
    const idInput = document.getElementById('userId');
    const firstNameInput = document.getElementById('userFirstName');
    const lastNameInput = document.getElementById('userLastName');
    const nickInput = document.getElementById('userNick');
    const emailInput = document.getElementById('userEmail');
    const passwordInput = document.getElementById('userPassword');
    const roleSelect = document.getElementById('userRole');
    const formError = document.getElementById('user-form-error');

    const deleteModalElement = document.getElementById('deleteUserConfirmModal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    const deleteIdInput = document.getElementById('user-to-delete-id');
    const deleteNickSpan = document.getElementById('user-to-delete-nick');
    const deleteEmailSpan = document.getElementById('user-to-delete-email');
    const confirmDeleteBtn = document.getElementById('confirm-delete-user-btn');
    const deleteErrorDiv = document.getElementById('delete-user-error');

    document.getElementById('add-user-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('userModalLabel').textContent = 'Dodaj Nowego Użytkownika';
        formError.style.display = 'none';
        form.classList.remove('was-validated');
        modal.show();
    });

    container.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const user = usersCache.find(u => u.id === parseInt(id));
            if (user) {
                form.reset();
                idInput.value = user.id;
                firstNameInput.value = user.first_name;
                lastNameInput.value = user.last_name;
                nickInput.value = user.nick;
                emailInput.value = user.email;
                roleSelect.value = user.role;
                document.getElementById('userModalLabel').textContent = 'Edytuj Użytkownika';
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

        const userData = {
            first_name: firstNameInput.value.trim(),
            last_name: lastNameInput.value.trim(),
            nick: nickInput.value.trim(),
            email: emailInput.value.trim(),
            role: parseInt(roleSelect.value, 10),
            password: passwordInput.value
        };

        const userId = idInput.value;
        const isEditing = !!userId;
        const url = isEditing ? `/users/${userId}` : '/users';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(userData)});
            modal.hide();
            ui.showSuccess(`Użytkownik został ${isEditing ? 'zaktualizowany' : 'dodany'} pomyślnie.`);
            renderUsersList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error saving user:', error);
            formError.textContent = `Błąd zapisu: ${error.message}`;
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
        }
    });

    container.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            if (button.disabled) return;
            const id = e.currentTarget.dataset.id;
            const nick = e.currentTarget.dataset.nick;
            const email = e.currentTarget.dataset.email;
            deleteIdInput.value = id;
            deleteNickSpan.textContent = nick;
            deleteEmailSpan.textContent = email;
            deleteErrorDiv.style.display = 'none';
            deleteModal.show();
        });
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        const idToDelete = deleteIdInput.value;
        if (!idToDelete) return;
        deleteErrorDiv.style.display = 'none';

        try {
            await fetchWrapper(`/users/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            ui.showSuccess('Użytkownik został pomyślnie usunięty.');
            renderUsersList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error deleting user:', error);
            deleteErrorDiv.textContent = `Błąd usuwania: ${error.message}`;
            deleteErrorDiv.style.display = 'block';
        }
    });
}