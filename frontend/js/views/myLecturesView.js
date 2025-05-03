import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';
import {escapeHtml} from "../helpers.js";

export async function renderMyLectures(containerElement) {
    const userRole = auth.getUserRole();

    if (userRole !== auth.ROLES_MAP.PRELEGENT && userRole !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do przeglądania prelekcji.', `#${containerElement.id}`);
        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {
        let myLectures = [];
        try {
            myLectures = await fetchWrapper('/prelegents/my');
        } catch (error) {
            if (error.message.includes('404') || error.message.toLowerCase().includes('not found')) {
                containerElement.innerHTML = '<h1 class="mb-4">Moje Prelekcje</h1><p class="text-center">Nie znaleziono profilu prelegenta powiązanego z Twoim kontem użytkownika lub nie jesteś przypisany(a) do żadnych wydarzeń.</p>';
                if (userRole === auth.ROLES_MAP.ADMINISTRATOR) {
                    containerElement.innerHTML += `<div class="text-center mt-3"><a href="#/prelegents" class="btn btn-secondary" data-navigo>Zarządzaj Prelegentami</a></div>`;
                    attachNavigoLinks(containerElement);
                }
                return;
            }

            throw error;
        }

        let contentHtml;
        if (!myLectures || myLectures.length === 0) {
            contentHtml = '<p>Nie jesteś aktualnie przypisany(a) do żadnych wydarzeń jako prelegent.</p>';
        } else {

            myLectures.sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

            const lecturesHtml = myLectures.map(event => renderLectureCard(event)).join('');
            contentHtml = `<div class="row row-cols-1 row-cols-md-2 g-4">${lecturesHtml}</div>`;
        }

        containerElement.innerHTML = `
            <h1 class="mb-4">Moje Prelekcje</h1>
            ${contentHtml}
        `;

    } catch (error) {
        console.error('Error fetching my lectures:', error);
        ui.showError(`Nie udało się załadować Twoich prelekcji: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderLectureCard(event) {

    if (!event || !event.started_at || !event.ended_at || !event.price || !event.name) {
        console.warn('Received incomplete event data for rendering lecture card:', event);

        return `
        <div class="col">
            <div class="card h-100 shadow-sm border-warning">
                <div class="card-body">
                    <h5 class="card-title text-warning">Brak danych wydarzenia</h5>
                    <p class="card-text small">Nie można wyświetlić informacji o tej prelekcji.</p>
                </div>
            </div>
        </div>`;
    }

    const startDate = new Date(event.started_at).toLocaleString('pl-PL', {dateStyle: 'medium', timeStyle: 'short'});
    const endDate = new Date(event.ended_at).toLocaleString('pl-PL', {dateStyle: 'medium', timeStyle: 'short'});
    const price = parseFloat(event.price).toFixed(2);

    const now = new Date();
    const start = new Date(event.started_at);
    const end = new Date(event.ended_at);
    let statusBadge = '';
    if (now < start) {
        statusBadge = '<span class="badge bg-info text-dark">Nadchodzące</span>';
    } else if (now >= start && now <= end) {
        statusBadge = '<span class="badge bg-success">W trakcie</span>';
    } else {
        statusBadge = '<span class="badge bg-secondary">Zakończone</span>';
    }

    return `
    <div class="col">
        <div class="card h-100 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                 <h5 class="mb-0">${escapeHtml(event.name)}</h5>
                 ${statusBadge}
            </div>
            <div class="card-body">
                <h6 class="card-subtitle mb-2 text-muted">${escapeHtml(event.category_name || 'Brak kategorii')}</h6>
                <p class="card-text mb-1">
                    <i class="bi bi-geo-alt-fill text-secondary"></i> ${escapeHtml(event.locale_name || 'Brak lokalu')}, ${escapeHtml(event.locale_city || 'Brak miasta')}
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
                        <span class="badge bg-light text-dark rounded-pill">${event.ticket_count ?? 'N/A'}</span> {/* Użyj ?? dla ticket_count */}
                    </li>
                 </ul>
            </div>
             <div class="card-footer text-end bg-light">
                  <button class="btn btn-sm btn-outline-info lecture-details-btn" data-event-id="${event.id}">
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