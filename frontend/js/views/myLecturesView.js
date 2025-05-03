import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';
import {escapeHtml} from "../helpers.js";

function renderLectureCard(event) {
    const eventName = event.name;
    const startDateRaw = event.started_at;
    const endDateRaw = event.ended_at;
    const priceRaw = event.price;

    const startDate = startDateRaw ? new Date(startDateRaw).toLocaleString('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : 'Brak daty rozpoczęcia';
    const endDate = endDateRaw ? new Date(endDateRaw).toLocaleString('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : 'Brak daty zakończenia';
    const price = typeof priceRaw !== 'undefined' && priceRaw !== null ? parseFloat(priceRaw).toFixed(2) : 'N/A';

    let statusBadge = '<span class="badge bg-warning text-dark">Nieznany status</span>';
    if (startDateRaw && endDateRaw) {
        const now = new Date();
        const start = new Date(startDateRaw);
        const end = new Date(endDateRaw);

        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            if (now < start) {
                statusBadge = '<span class="badge bg-info text-dark">Nadchodzące</span>';
            } else if (now >= start && now <= end) {
                statusBadge = '<span class="badge bg-success">W trakcie</span>';
            } else {
                statusBadge = '<span class="badge bg-secondary">Zakończone</span>';
            }
        }
    }

    return `
    <div class="col">
        <div class="card h-100 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                 <h5 class="mb-0">${escapeHtml(eventName)}</h5>
                 ${statusBadge}
            </div>
            <div class="card-body">
                <h6 class="card-subtitle mb-2 text-muted">${escapeHtml(event.category_name)}</h6>
                <p class="card-text mb-1">
                    <i class="bi bi-geo-alt-fill text-secondary"></i> ${escapeHtml(event.locale_name)}, ${escapeHtml(event.locale_city)}
                </p>
                <p class="card-text small">
                    <i class="bi bi-calendar-range text-secondary"></i> ${startDate} - ${endDate}
                </p>
                <p class="card-text small mt-2">${escapeHtml(event.description?.substring(0, 150) || '')}${event.description?.length > 150 ? '...' : ''}</p>

                 <ul class="list-group list-group-flush mt-3">
                    <li class="list-group-item d-flex justify-content-between align-items-center small py-1 px-0">
                        Cena (wydarzenia):
                        <span class="badge bg-light text-dark rounded-pill">${price} PLN</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center small py-1 px-0">
                        Liczba zapisanych:
                        <span class="badge bg-light text-dark rounded-pill">${typeof event.ticket_count !== 'undefined' && event.ticket_count !== null ? event.ticket_count : 'N/A'}</span>
                    </li>
                 </ul>
            </div>
        </div>
    </div>
    `;
}

function attachNavigoLinks(container) {

    container.querySelectorAll('a[data-navigo], button[data-navigo]').forEach(link => {
        if (!link.dataset.listenerAttached) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.tagName === 'BUTTON' ? link.dataset.navigo : link.getAttribute('href');
                if (target) {
                    navigateTo(target);
                }
            });
            link.dataset.listenerAttached = 'true';
        }
    });

    container.querySelectorAll('.lecture-details-btn').forEach(button => {
        if (!button.dataset.listenerAttachedDetails) {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.dataset.eventId;
                if (eventId) {
                    navigateTo(`/events/${eventId}`);
                }
            });
            button.dataset.listenerAttachedDetails = 'true';
        }
    });
}

export async function renderMyLectures(containerElement) {
    const loggedInUserId = auth.getUserId();

    if (auth.getUserRole() !== auth.ROLES_MAP.PRELEGENT) {
        ui.showError('Musisz być zalogowany jako prelegent, aby przeglądać swoje prelekcje.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        const [allEvents, allPrelegents] = await Promise.all([
            fetchWrapper('/events'),
            fetchWrapper('/prelegents')
        ]);

        const userPrelegent = allPrelegents.find(prelegent => prelegent.user_id === loggedInUserId);
        if (!userPrelegent) {
            containerElement.innerHTML = '<p>Nie jesteś aktualnie przypisany(a) do żadnych wydarzeń jako prelegent.</p>';
            return;
        }

        const myLectures = allEvents.filter(event => event.prelegent_ids?.includes(userPrelegent.id));

        let contentHtml;
        if (!myLectures || myLectures.length === 0) {
            contentHtml = '<p>Nie jesteś aktualnie przypisany(a) do żadnych wydarzeń jako prelegent.</p>';
        } else {
            myLectures.sort((a, b) => {
                const dateA = a.started_at ? new Date(a.started_at) : 0;
                const dateB = b.started_at ? new Date(b.started_at) : 0;
                return dateA - dateB;
            });

            const lecturesHtml = myLectures.map(event => renderLectureCard(event)).join('');
            contentHtml = `<div class="row row-cols-1 row-cols-md-2 g-4">${lecturesHtml}</div>`;
        }

        containerElement.innerHTML = `${contentHtml}`;

        attachNavigoLinks(containerElement);
    } catch (error) {
        ui.showError(`Nie udało się załadować Twoich prelekcji (${error.message})`, `#${containerElement.id}`);
    }
}