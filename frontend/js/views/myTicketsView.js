import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';

export async function renderMyTickets(containerElement) {

    const userRole = auth.getUserRole();
    if (userRole !== auth.ROLES_MAP.MEMBER) {
        ui.showError('Ta sekcja jest dostępna tylko dla uczestników.', `#${containerElement.id}`);

        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {

        const myTickets = await fetchWrapper('/tickets/my');

        let contentHtml;
        if (!myTickets || myTickets.length === 0) {
            contentHtml = `<p class="text-center">Nie masz aktualnie żadnych zakupionych biletów.</p>`;
        } else {

            myTickets.sort((a, b) => new Date(a.event_started_at) - new Date(b.event_started_at));
            const ticketsHtml = myTickets.map(ticket => renderTicketCard(ticket)).join('');
            contentHtml = `<div class="row row-cols-1 row-cols-md-2 g-4">${ticketsHtml}</div>`;
        }

        containerElement.innerHTML = `
            ${contentHtml}

             <!-- Modal do potwierdzenia usunięcia (wypisania się) -->
            <div class="modal fade" id="deleteTicketConfirmModal" tabindex="-1" aria-labelledby="deleteTicketConfirmModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="deleteTicketConfirmModalLabel">Potwierdź Wypisanie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    Czy na pewno chcesz wypisać się z wydarzenia "<strong id="ticket-event-to-delete-name"></strong>"? Twój bilet zostanie anulowany.
                    <br><small class="text-danger">Tej operacji nie można cofnąć.</small>
                    <input type="hidden" id="ticket-to-delete-id">
                     <div id="delete-ticket-error" class="text-danger mt-2" style="display: none;"></div>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                    <button type="button" class="btn btn-danger" id="confirm-delete-ticket-btn">Wypisz się</button>
                  </div>
                </div>
              </div>
            </div>
        `;

        attachMyTicketsEventListeners(containerElement);

    } catch (error) {
        console.error('Error fetching my tickets:', error);
        ui.showError(`Nie udało się załadować Twoich biletów: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderTicketCard(ticket) {
    const startDate = new Date(eventDetails.started_at).toLocaleString('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
    const endDate = new Date(eventDetails.ended_at).toLocaleString('pl-PL', {dateStyle: 'medium', timeStyle: 'short'});
    const purchaseDate = new Date(ticket.created_at).toLocaleString('pl-PL', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
    const purchasePrice = parseFloat(ticket.price).toFixed(2);

    const now = new Date();
    const start = new Date(eventDetails.started_at);
    const end = new Date(eventDetails.ended_at);
    let statusBadge = '';
    let canUnsubscribe = false;

    if (now < start) {
        statusBadge = '<span class="badge bg-info text-dark">Nadchodzące</span>';
        canUnsubscribe = true;
    } else if (now >= start && now <= end) {
        statusBadge = '<span class="badge bg-success">W trakcie</span>';
    } else {
        statusBadge = '<span class="badge bg-secondary">Zakończone</span>';
    }

    const unsubscribeButtonHtml = canUnsubscribe ? `
        <button class="btn btn-sm btn-outline-danger unsubscribe-btn" data-ticket-id="${ticket.id}" data-event-name="${escapeHtml(eventDetails.name)}" title="Wypisz się z wydarzenia">
            <i class="bi bi-calendar-x"></i> Wypisz się
        </button>
    ` : '';

    return `
    <div class="col">
        <div class="card h-100 shadow-sm">
             <div class="card-header d-flex justify-content-between align-items-center">
                 <h5 class="mb-0">${escapeHtml(eventDetails.name)}</h5>
                 ${statusBadge}
            </div>
            <div class="card-body">
                <p class="card-text mb-1">
                    <i class="bi bi-geo-alt-fill text-secondary"></i> ${escapeHtml(ticket.locale_name)}, ${escapeHtml(ticket.locale_city)}
                </p>
                <p class="card-text small">
                    <i class="bi bi-calendar-range text-secondary"></i> ${startDate} - ${endDate}
                </p>
                 <ul class="list-group list-group-flush mt-3 small">
                     <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-0">
                         ID Biletu:
                         <span class="fw-bold">#${ticket.id}</span>
                     </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-0">
                        Cena zakupu:
                        <span class="badge bg-light text-dark rounded-pill">${purchasePrice} PLN</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center py-1 px-0">
                        Data zakupu:
                        <span>${purchaseDate}</span>
                    </li>
                 </ul>
            </div>
            <div class="card-footer text-end bg-light">
                  ${unsubscribeButtonHtml}
                 <button class="btn btn-sm btn-outline-info ticket-details-btn" data-event-id="${ticket.event_id}">
                     <i class="bi bi-info-circle"></i> Zobacz Szczegóły Wydarzenia
                 </button>
            </div>
        </div>
    </div>
    `;
}

function attachNavigoLinks(container) {
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

function attachMyTicketsEventListeners(container) {
    const deleteModalElement = document.getElementById('deleteTicketConfirmModal');
    const deleteModal = deleteModalElement ? new bootstrap.Modal(deleteModalElement) : null;
    const deleteIdInput = document.getElementById('ticket-to-delete-id');
    const deleteNameSpan = document.getElementById('ticket-event-to-delete-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-ticket-btn');
    const deleteErrorDiv = document.getElementById('delete-ticket-error');

    container.querySelectorAll('.unsubscribe-btn').forEach(button => {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', (e) => {
                if (!deleteModal || !deleteIdInput || !deleteNameSpan) return;
                const ticketId = e.currentTarget.dataset.ticketId;
                const eventName = e.currentTarget.dataset.eventName;
                deleteIdInput.value = ticketId;
                deleteNameSpan.textContent = eventName;
                deleteErrorDiv.style.display = 'none';
                deleteModal.show();
            });
            button.dataset.listenerAttached = 'true';
        }
    });

    if (confirmDeleteBtn) {
        if (!confirmDeleteBtn.dataset.listenerAttached) {
            confirmDeleteBtn.addEventListener('click', async () => {
                if (!deleteIdInput || !deleteErrorDiv) return;
                const idToDelete = deleteIdInput.value;
                if (!idToDelete) return;
                deleteErrorDiv.style.display = 'none';

                try {
                    await fetchWrapper(`/tickets/${idToDelete}`, {method: 'DELETE'});
                    if (deleteModal) deleteModal.hide();
                    ui.showSuccess('Pomyślnie wypisano z wydarzenia.');
                    renderMyTickets(document.getElementById('app-content'));
                } catch (error) {
                    console.error('Error unsubscribing:', error);
                    deleteErrorDiv.textContent = `Błąd wypisywania: ${error.message}`;
                    deleteErrorDiv.style.display = 'block';
                }
            });
            confirmDeleteBtn.dataset.listenerAttached = 'true';
        }
    }

    container.querySelectorAll('.ticket-details-btn').forEach(button => {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.dataset.eventId;
                console.log(`Navigate to details for event ${eventId}`);
                alert(`Przejście do szczegółów wydarzenia ${eventId} - niezaimplementowane.`);

            });
            button.dataset.listenerAttached = 'true';
        }
    });

    attachNavigoLinks(container);
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