import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';

let sponsorsCache = [];

export async function renderSponsorsList(containerElement) {
    if (auth.getUserRole() !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do zarządzania sponsorami.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        sponsorsCache = await fetchWrapper('/sponsors');

        containerElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Sponsorami</h1>
                <button id="add-sponsor-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Sponsora
                </button>
            </div>
            <div id="sponsors-table-container">
                ${renderSponsorsTable(sponsorsCache)}
            </div>

            <!-- Modal do dodawania/edycji -->
            <div class="modal fade" id="sponsorModal" tabindex="-1" aria-labelledby="sponsorModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="sponsorModalLabel">Dodaj/Edytuj Sponsora</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <form id="sponsor-form">
                      <input type="hidden" id="sponsorId">
                      <div class="mb-3">
                        <label for="sponsorName" class="form-label">Nazwa Sponsora</label>
                        <input type="text" class="form-control" id="sponsorName" required minlength="2" maxlength="100">
                        <div class="invalid-feedback">Nazwa jest wymagana (min 2, max 100 znaków).</div>
                      </div>
                      <div class="mb-3">
                        <label for="sponsorDescription" class="form-label">Opis</label>
                        <textarea class="form-control" id="sponsorDescription" rows="3" required></textarea>
                         <div class="invalid-feedback">Opis jest wymagany.</div>
                      </div>
                       <div id="sponsor-form-error" class="text-danger mb-3" style="display: none;"></div>
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
            <div class="modal fade" id="deleteSponsorConfirmModal" tabindex="-1" aria-labelledby="deleteSponsorConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteSponsorConfirmModalLabel">Potwierdź Usunięcie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz usunąć sponsora "<strong id="sponsor-to-delete-name"></strong>"?
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="sponsor-to-delete-id">
                     <div id="delete-sponsor-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-sponsor-btn">Usuń</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachSponsorEventListeners();

    } catch (error) {
        console.error('Error fetching sponsors:', error);
        ui.showError(`Nie udało się załadować sponsorów: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderSponsorsTable(sponsors) {
    if (!sponsors || sponsors.length === 0) {
        return '<p>Brak zdefiniowanych sponsorów.</p>';
    }

    const tableRows = sponsors.map(sp => `
        <tr>
            <td>${sp.id}</td>
            <td>${escapeHtml(sp.name)}</td>
            <td>${escapeHtml(sp.description)}</td>
            <td>
                <button class="btn btn-sm btn-primary edit-sponsor-btn" data-id="${sp.id}" title="Edytuj">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-sponsor-btn" data-id="${sp.id}" data-name="${escapeHtml(sp.name)}" title="Usuń">
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

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, "\"")
        .replace(/'/g, "'");
}

function attachSponsorEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('sponsorModal');
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById('sponsor-form');
    const idInput = document.getElementById('sponsorId');
    const nameInput = document.getElementById('sponsorName');
    const descriptionInput = document.getElementById('sponsorDescription');
    const formError = document.getElementById('sponsor-form-error');

    const deleteModalElement = document.getElementById('deleteSponsorConfirmModal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);
    const deleteIdInput = document.getElementById('sponsor-to-delete-id');
    const deleteNameSpan = document.getElementById('sponsor-to-delete-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-sponsor-btn');
    const deleteErrorDiv = document.getElementById('delete-sponsor-error');

    document.getElementById('add-sponsor-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('sponsorModalLabel').textContent = 'Dodaj Nowego Sponsora';
        formError.style.display = 'none';
        form.classList.remove('was-validated');
        modal.show();
    });

    container.querySelectorAll('.edit-sponsor-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const sponsor = sponsorsCache.find(sp => sp.id === parseInt(id));
            if (sponsor) {
                form.reset();
                idInput.value = sponsor.id;
                nameInput.value = sponsor.name;
                descriptionInput.value = sponsor.description;
                document.getElementById('sponsorModalLabel').textContent = 'Edytuj Sponsora';
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

        const sponsorData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
        };
        const sponsorId = idInput.value;
        const isEditing = !!sponsorId;
        const url = isEditing ? `/sponsors/${sponsorId}` : '/sponsors';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(sponsorData)});
            modal.hide();
            ui.showSuccess(`Sponsor został ${isEditing ? 'zaktualizowany' : 'dodany'} pomyślnie.`);
            renderSponsorsList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error saving sponsor:', error);
            formError.textContent = `Błąd zapisu: ${error.message}`;
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
        }
    });

    container.querySelectorAll('.delete-sponsor-btn').forEach(button => {
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
            await fetchWrapper(`/sponsors/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            ui.showSuccess('Sponsor został pomyślnie usunięty.');
            renderSponsorsList(document.getElementById('app-content'));
        } catch (error) {
            console.error('Error deleting sponsor:', error);
            deleteErrorDiv.textContent = `Błąd usuwania: ${error.message}`;
            deleteErrorDiv.style.display = 'block';
        }
    });
}