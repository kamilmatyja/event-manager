import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';
import {escapeHtml} from "../helpers.js";

let eventsCache = [];
let localesCache = [];
let categoriesCache = [];
let prelegentsCache = [];
let resourcesCache = [];
let sponsorsCache = [];
let cateringsCache = [];
let ticketsCache = [];

export async function renderEventsList(containerElement) {
    ui.showLoadingSpinner(`#${containerElement.id}`);
    const isAdmin = auth.getUserRole() === auth.ROLES_MAP.ADMINISTRATOR;
    const isMember = auth.getUserRole() === auth.ROLES_MAP.MEMBER;

    try {
        const promises = [
            fetchWrapper('/events'),
            fetchWrapper('/locales'),
            fetchWrapper('/categories'),
            fetchWrapper('/prelegents'),
            fetchWrapper('/resources'),
            fetchWrapper('/sponsors'),
            fetchWrapper('/caterings')
        ];

        if (isMember) {
            promises.push(fetchWrapper('/tickets/my'));
        }

        const [events, locales, categories, prelegents, resources, sponsors, caterings, tickets] = await Promise.all(promises);

        eventsCache = events;
        localesCache = locales || [];
        categoriesCache = categories || [];
        prelegentsCache = prelegents || [];
        resourcesCache = resources || [];
        sponsorsCache = sponsors || [];
        cateringsCache = caterings || [];

        if (isMember) {
            ticketsCache = tickets || [];
        }

        containerElement.innerHTML = `
        ${isAdmin ? `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h1>Zarządzanie Wydarzeniami</h1>
                <button id="add-event-btn" class="btn btn-success">
                    <i class="bi bi-plus-lg"></i> Dodaj Wydarzenie
                </button>
            </div>` : ''}
            <div id="events-list-container" class="row row-cols-1 row-cols-md-2 g-4">
                ${renderEventCards(eventsCache)}
            </div>

             ${isAdmin ? renderEventModal() : ''}
             ${isAdmin ? renderDeleteConfirmModal() : ''}
             
            <div class="modal fade" id="eventDetailsModal" tabindex="-1" aria-labelledby="eventDetailsModalLabel" aria-hidden="true">
               <div class="modal-dialog modal-lg modal-dialog-scrollable">
                 <div class="modal-content">
                   <div class="modal-header">
                     <h5 class="modal-title" id="eventDetailsModalLabel">Szczegóły Wydarzenia</h5>
                     <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                   </div>
                   <div class="modal-body" id="eventDetailsModalBody">
                     <div class="text-center">
                       <div class="spinner-border" role="status">
                         <span class="visually-hidden">Ładowanie szczegółów...</span>
                       </div>
                     </div>
                   </div>
                   <div class="modal-footer">
                     <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Zamknij</button>
                   </div>
                 </div>
               </div>
            </div>
        `;

        if (isAdmin) {
            attachAdminEventListeners();
        }
        attachCommonEventListeners();

    } catch (error) {
        ui.showError(`Nie udało się załadować danych wydarzeń: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderEventCards(events) {
    if (!events || events.length === 0) {
        return '<p class="col-12">Brak nadchodzących wydarzeń.</p>';
    }
    return events.map(event => renderEventCard(event)).join('');
}

function renderEventCard(event) {
    const userRole = auth.getUserRole();
    const isAdmin = userRole === auth.ROLES_MAP.ADMINISTRATOR;
    const isMember = userRole === auth.ROLES_MAP.MEMBER;

    const startDate = new Date(event.started_at).toLocaleString('pl-PL', {dateStyle: 'short', timeStyle: 'short'});
    const endDate = new Date(event.ended_at).toLocaleString('pl-PL', {dateStyle: 'short', timeStyle: 'short'});
    const price = parseFloat(event.price).toFixed(2);
    let hasTicket = false;

    if (ticketsCache) {
        hasTicket = ticketsCache.some(ticket => ticket.event_id === event.id);
    }

    let actionButtons = '';
    if (isAdmin) {
        actionButtons = `
            <button class="btn btn-sm btn-outline-primary me-1 edit-event-btn" data-id="${event.id}" title="Edytuj"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-event-btn" data-id="${event.id}" data-name="${escapeHtml(event.name)}" title="Usuń"><i class="bi bi-trash"></i></button>
        `;
    } else if (isMember && new Date(event.started_at) > new Date() && !hasTicket) {
        actionButtons = `<button class="btn btn-sm btn-success register-event-btn" data-id="${event.id}"><i class="bi bi-check-lg"></i> Zapisz się</button>`;
    }

    return `
        <div class="col">
            <div class="card h-100 shadow-sm">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${escapeHtml(event.name)}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${escapeHtml(event.category_name)} - ${escapeHtml(event.locale_name)} (${escapeHtml(event.locale_city)})</h6>
                    <p class="card-text small flex-grow-1">${escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? '...' : ''}</p>
                     <ul class="list-unstyled mb-2 small">
                        <li><i class="bi bi-calendar-event"></i> ${startDate} - ${endDate}</li>
                        <li><i class="bi bi-tag"></i> Cena: ${price} PLN</li>
                        <li><i class="bi bi-people"></i> Zapisanych: ${event.ticket_count}</li>
                     </ul>
                     <div class="mt-auto d-flex justify-content-end">
                         ${actionButtons}
                          <button class="btn btn-sm btn-outline-info ms-1 details-event-btn" data-id="${event.id}" title="Szczegóły"><i class="bi bi-info-circle"></i></button>
                     </div>
                </div>
            </div>
        </div>
        `;
}

function renderEventModal() {

    const localeOptions = localesCache.map(loc => `<option value="${loc.id}">${escapeHtml(loc.name)} (${escapeHtml(loc.city)})</option>`).join('');
    const categoryOptions = categoriesCache.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('');

    const prelegentOptions = prelegentsCache.map(p => `
        <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="prelegentIds" value="${p.id}" id="prel-${p.id}">
            <label class="form-check-label small" for="prel-${p.id}">${escapeHtml(p.name)}</label>
        </div>`).join('');
    const resourceOptions = resourcesCache.map(r => `
         <div class="form-check form-check-inline">
             <input class="form-check-input" type="checkbox" name="resourceIds" value="${r.id}" id="res-${r.id}">
             <label class="form-check-label small" for="res-${r.id}">${escapeHtml(r.name)}</label>
         </div>`).join('');
    const sponsorOptions = sponsorsCache.map(s => `
          <div class="form-check form-check-inline">
              <input class="form-check-input" type="checkbox" name="sponsorIds" value="${s.id}" id="spon-${s.id}">
              <label class="form-check-label small" for="spon-${s.id}">${escapeHtml(s.name)}</label>
          </div>`).join('');
    const cateringOptions = cateringsCache.map(c => `
           <div class="form-check form-check-inline">
               <input class="form-check-input" type="checkbox" name="cateringIds" value="${c.id}" id="catr-${c.id}">
               <label class="form-check-label small" for="catr-${c.id}">${escapeHtml(c.name)}</label>
           </div>`).join('');

    return `
        <div class="modal fade" id="eventModal" tabindex="-1" aria-labelledby="eventModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-xl">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="eventModalLabel">Dodaj/Edytuj Wydarzenie</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <form id="event-form" novalidate>
                  <input type="hidden" id="eventId">
                  <div class="row mb-3">
                    <div class="col-md-8">
                      <label for="eventName" class="form-label">Nazwa Wydarzenia</label>
                      <input type="text" class="form-control" id="eventName" required minlength="5" maxlength="100">
                      <div class="invalid-feedback">Nazwa jest wymagana (min 5 znaków).</div>
                    </div>
                    <div class="col-md-4">
                       <label for="eventPrice" class="form-label">Cena (PLN)</label>
                       <input type="number" step="0.01" min="0" class="form-control" id="eventPrice" required>
                       <div class="invalid-feedback">Podaj poprawną cenę (np. 99.99).</div>
                    </div>
                  </div>
                   <div class="mb-3">
                        <label for="eventDescription" class="form-label">Opis</label>
                        <textarea class="form-control" id="eventDescription" rows="3" required></textarea>
                        <div class="invalid-feedback">Opis jest wymagany.</div>
                  </div>
                  <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="eventLocaleId" class="form-label">Lokalizacja</label>
                        <select class="form-select" id="eventLocaleId" required>
                            <option value="" selected disabled>Wybierz...</option>
                            ${localeOptions}
                        </select>
                         <div class="invalid-feedback">Wybór lokalizacji jest wymagany.</div>
                    </div>
                     <div class="col-md-6">
                        <label for="eventCategoryId" class="form-label">Kategoria</label>
                        <select class="form-select" id="eventCategoryId" required>
                            <option value="" selected disabled>Wybierz...</option>
                             ${categoryOptions}
                        </select>
                         <div class="invalid-feedback">Wybór kategorii jest wymagany.</div>
                    </div>
                  </div>
                  <div class="row mb-3">
                     <div class="col-md-6">
                        <label for="eventStartedAt" class="form-label">Data rozpoczęcia</label>
                        <input type="datetime-local" class="form-control" id="eventStartedAt" required>
                         <div class="invalid-feedback">Data rozpoczęcia jest wymagana.</div>
                    </div>
                     <div class="col-md-6">
                        <label for="eventEndedAt" class="form-label">Data zakończenia</label>
                        <input type="datetime-local" class="form-control" id="eventEndedAt" required>
                         <div class="invalid-feedback">Data zakończenia jest wymagana i musi być późniejsza niż rozpoczęcia.</div>
                    </div>
                  </div>
                  <hr>
                  <div class="mb-3">
                     <label class="form-label">Prelegenci (opcjonalnie)</label>
                     <div class="border p-2 rounded bg-light relation-checkboxes"> ${prelegentOptions || '<span class="text-muted small">Brak dostępnych prelegentów</span>'}</div>
                  </div>
                   <div class="mb-3">
                     <label class="form-label">Sprzęt (opcjonalnie)</label>
                      <div class="border p-2 rounded bg-light relation-checkboxes">${resourceOptions || '<span class="text-muted small">Brak dostępnego sprzętu</span>'}</div>
                  </div>
                   <div class="mb-3">
                     <label class="form-label">Sponsorzy (opcjonalnie)</label>
                      <div class="border p-2 rounded bg-light relation-checkboxes">${sponsorOptions || '<span class="text-muted small">Brak dostępnych sponsorów</span>'}</div>
                  </div>
                   <div class="mb-3">
                     <label class="form-label">Catering (opcjonalnie)</label>
                      <div class="border p-2 rounded bg-light relation-checkboxes">${cateringOptions || '<span class="text-muted small">Brak dostępnego cateringu</span>'}</div>
                  </div>

                  <div id="event-form-error" class="text-danger mb-3" style="display: none;"></div>
                  <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                        <button type="submit" class="btn btn-primary">Zapisz</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
    `;
}

function renderDeleteConfirmModal() {
    return `
         <div class="modal fade" id="deleteEventConfirmModal" tabindex="-1" aria-labelledby="deleteEventConfirmModalLabel" aria-hidden="true">
           <div class="modal-dialog">
             <div class="modal-content">
               <div class="modal-header">
                 <h5 class="modal-title" id="deleteEventConfirmModalLabel">Potwierdź Usunięcie</h5>
                 <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
               </div>
               <div class="modal-body">
                 Czy na pewno chcesz usunąć wydarzenie "<strong id="event-to-delete-name"></strong>"?
                 <br><small class="text-danger">Spowoduje to usunięcie wszystkich powiązanych biletów. Tej operacji nie można cofnąć.</small>
                 <input type="hidden" id="event-to-delete-id">
                  <div id="delete-event-error" class="text-danger mt-2" style="display: none;"></div>
               </div>
               <div class="modal-footer">
                 <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Anuluj</button>
                 <button type="button" class="btn btn-danger" id="confirm-delete-event-btn">Usuń</button>
               </div>
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

function attachAdminEventListeners() {
    const container = document.getElementById('app-content');
    const modalElement = document.getElementById('eventModal');
    const modal = modalElement ? new bootstrap.Modal(modalElement) : null;
    const form = document.getElementById('event-form');
    const idInput = document.getElementById('eventId');
    const nameInput = document.getElementById('eventName');
    const descriptionInput = document.getElementById('eventDescription');
    const priceInput = document.getElementById('eventPrice');
    const localeSelect = document.getElementById('eventLocaleId');
    const categorySelect = document.getElementById('eventCategoryId');
    const startedAtInput = document.getElementById('eventStartedAt');
    const endedAtInput = document.getElementById('eventEndedAt');
    const formError = document.getElementById('event-form-error');

    const deleteModalElement = document.getElementById('deleteEventConfirmModal');
    const deleteModal = deleteModalElement ? new bootstrap.Modal(deleteModalElement) : null;
    const deleteIdInput = document.getElementById('event-to-delete-id');
    const deleteNameSpan = document.getElementById('event-to-delete-name');
    const confirmDeleteBtn = document.getElementById('confirm-delete-event-btn');
    const deleteErrorDiv = document.getElementById('delete-event-error');

    if (!modalElement || !form || !deleteModalElement) {
        return;
    }

    document.getElementById('add-event-btn')?.addEventListener('click', () => {
        form.reset();
        idInput.value = '';
        document.getElementById('eventModalLabel').textContent = 'Dodaj Nowe Wydarzenie';
        formError.style.display = 'none';
        form.classList.remove('was-validated');

        form.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        modal.show();
    });

    container.querySelectorAll('.edit-event-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;

            try {
                const event = await fetchWrapper(`/events/${id}`);
                if (event) {
                    form.reset();
                    idInput.value = event.id;
                    document.getElementById('eventModalLabel').textContent = 'Edytuj Wydarzenie';
                    formError.style.display = 'none';
                    form.classList.remove('was-validated');

                    nameInput.value = event.name;
                    descriptionInput.value = event.description;
                    priceInput.value = parseFloat(event.price).toFixed(2);
                    localeSelect.value = event.locale_id;
                    categorySelect.value = event.category_id;

                    startedAtInput.value = event.started_at ? new Date(new Date(event.started_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '';
                    endedAtInput.value = event.ended_at ? new Date(new Date(event.ended_at).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '';

                    form.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    event.prelegent_ids?.forEach(pId => {
                        const cb = form.querySelector(`#prel-${pId}`);
                        if (cb) cb.checked = true;
                    });
                    event.resource_ids?.forEach(rId => {
                        const cb = form.querySelector(`#res-${rId}`);
                        if (cb) cb.checked = true;
                    });
                    event.sponsor_ids?.forEach(sId => {
                        const cb = form.querySelector(`#spon-${sId}`);
                        if (cb) cb.checked = true;
                    });
                    event.catering_ids?.forEach(cId => {
                        const cb = form.querySelector(`#catr-${cId}`);
                        if (cb) cb.checked = true;
                    });

                    modal.show();
                }
            } catch (error) {
                ui.showError(`Nie można załadować danych wydarzenia: ${error.message}`);
            }
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formError.style.display = 'none';
        form.classList.add('was-validated');

        const startDate = new Date(startedAtInput.value);
        const endDate = new Date(endedAtInput.value);
        if (endDate <= startDate) {
            endedAtInput.setCustomValidity('Data zakończenia musi być późniejsza niż rozpoczęcia.');
            endedAtInput.reportValidity();
            return;
        } else {
            endedAtInput.setCustomValidity('');
        }

        if (!form.checkValidity()) {
            return;
        }

        const prelegentIds = Array.from(form.querySelectorAll('input[name="prelegentIds"]:checked')).map(cb => parseInt(cb.value));
        const resourceIds = Array.from(form.querySelectorAll('input[name="resourceIds"]:checked')).map(cb => parseInt(cb.value));
        const sponsorIds = Array.from(form.querySelectorAll('input[name="sponsorIds"]:checked')).map(cb => parseInt(cb.value));
        const cateringIds = Array.from(form.querySelectorAll('input[name="cateringIds"]:checked')).map(cb => parseInt(cb.value));

        const eventData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            price: parseFloat(priceInput.value),
            locale_id: parseInt(localeSelect.value),
            category_id: parseInt(categorySelect.value),
            started_at: startDate.toISOString(),
            ended_at: endDate.toISOString(),
            prelegent_ids: prelegentIds,
            resource_ids: resourceIds,
            sponsor_ids: sponsorIds,
            catering_ids: cateringIds
        };

        const eventId = idInput.value;
        const isEditing = !!eventId;
        const url = isEditing ? `/events/${eventId}` : '/events';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await fetchWrapper(url, {method, body: JSON.stringify(eventData)});
            modal.hide();
            await renderEventsList(document.getElementById('app-content'));
            ui.showSuccess(`Wydarzenie zostało ${isEditing ? 'zaktualizowane' : 'dodane'} pomyślnie.`);
        } catch (error) {
            formError.textContent = 'Błędne dane';
            formError.style.display = 'block';
        } finally {
            form.classList.remove('was-validated');
            endedAtInput.setCustomValidity('');
        }
    });

    container.querySelectorAll('.delete-event-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const name = e.currentTarget.dataset.name;
            deleteIdInput.value = id;
            deleteNameSpan.textContent = name;
            deleteErrorDiv.style.display = 'none';
            deleteModal.show();
        });
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
        const idToDelete = deleteIdInput.value;
        if (!idToDelete || !deleteModal || !deleteErrorDiv) return;
        deleteErrorDiv.style.display = 'none';

        try {
            await fetchWrapper(`/events/${idToDelete}`, {method: 'DELETE'});
            deleteModal.hide();
            await renderEventsList(document.getElementById('app-content'));
            ui.showSuccess('Wydarzenie zostało pomyślnie usunięte.');
        } catch (error) {
            deleteErrorDiv.textContent = 'Błędne dane';
            deleteErrorDiv.style.display = 'block';
        }
    });

}

function attachCommonEventListeners() {
    const container = document.getElementById('app-content');
    const eventDetailsModalElement = document.getElementById('eventDetailsModal');
    const eventDetailsModal = eventDetailsModalElement ? new bootstrap.Modal(eventDetailsModalElement) : null;
    const eventDetailsModalBody = document.getElementById('eventDetailsModalBody');

    container.querySelectorAll('.register-event-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const eventId = e.currentTarget.dataset.id;

            try {
                const result = await fetchWrapper('/tickets', {
                    method: 'POST',
                    body: JSON.stringify({event_id: parseInt(eventId)})
                });
                await renderEventsList(container);
                ui.showSuccess(`Pomyślnie zapisano na wydarzenie! Bilet ID: ${result.id}`);
            } catch (error) {
                ui.showError(`Błąd zapisu na wydarzenie: ${error.message}`);
            }
        });
    });

    container.querySelectorAll('.details-event-btn').forEach(button => {
        if (!button.dataset.listenerAttached) {
            button.addEventListener('click', async (e) => {
                const eventId = e.currentTarget.dataset.id;

                eventDetailsModal.show();

                const eventDetails = await fetchWrapper(`/events/${eventId}`);

                eventDetailsModalBody.innerHTML = renderEventDetailsContent(eventDetails);
            });
            button.dataset.listenerAttached = 'true';
        }
    });

    attachNavigoLinks(container);
}

function renderEventDetailsContent(event) {
    if (!event) {
        return '<p>Nie znaleziono danych wydarzenia.</p>';
    }

    const startDate = new Date(event.started_at).toLocaleString('pl-PL', {dateStyle: 'full', timeStyle: 'short'});
    const endDate = new Date(event.ended_at).toLocaleString('pl-PL', {dateStyle: 'full', timeStyle: 'short'});
    const price = parseFloat(event.price).toFixed(2);

    const renderRelatedList = (ids, cache, cacheKey, nameKey, label) => {
        if (!ids || ids.length === 0) {
            return `<li class="list-group-item small text-muted">Brak ${label.toLowerCase()}</li>`;
        }
        const items = ids.map(id => {
            const item = cache.find(c => c.id === id);
            return item ? escapeHtml(item[nameKey]) : `Nieznany ${label} (ID: ${id})`;
        }).join(', ');
        return `<li class="list-group-item small"><strong>${label}:</strong> ${items}</li>`;
    };

    return `
        <h4>${escapeHtml(event.name)}</h4>
        <p class="lead">${escapeHtml(event.description)}</p>
        <hr>
        <dl class="row">
          <dt class="col-sm-3">Kategoria:</dt>
          <dd class="col-sm-9">${escapeHtml(event.category_name)}</dd>

          <dt class="col-sm-3">Lokalizacja:</dt>
          <dd class="col-sm-9">${escapeHtml(event.locale_name)}, ${escapeHtml(event.locale_city)}</dd>

          <dt class="col-sm-3">Rozpoczęcie:</dt>
          <dd class="col-sm-9">${startDate}</dd>

          <dt class="col-sm-3">Zakończenie:</dt>
          <dd class="col-sm-9">${endDate}</dd>

          <dt class="col-sm-3">Cena:</dt>
          <dd class="col-sm-9">${price} PLN</dd>

           <dt class="col-sm-3">Liczba zapisanych:</dt>
           <dd class="col-sm-9">${event.ticket_count}</dd>
        </dl>
        <hr>
        <h6>Powiązane zasoby:</h6>
        <ul class="list-group list-group-flush mb-3">
            ${renderRelatedList(event.prelegent_ids, prelegentsCache, 'id', 'name', 'Prelegenci')}
            ${renderRelatedList(event.resource_ids, resourcesCache, 'id', 'name', 'Zasoby')}
            ${renderRelatedList(event.sponsor_ids, sponsorsCache, 'id', 'name', 'Sponsorzy')}
            ${renderRelatedList(event.catering_ids, cateringsCache, 'id', 'name', 'Catering')}
        </ul>
    `;
}