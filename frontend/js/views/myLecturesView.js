import {fetchWrapper} from '../api.js';
import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';

export async function renderMyLectures(containerElement) {

    const userRole = auth.getUserRole();
    if (userRole !== auth.ROLES_MAP.PRELEGENT && userRole !== auth.ROLES_MAP.ADMINISTRATOR) {
        ui.showError('Brak uprawnień do przeglądania prelekcji.', `#${containerElement.id}`);

        return;
    }

    ui.showLoadingSpinner(`#${containerElement.id}`);
    try {

        let myPrelegentProfile;
        try {
            myPrelegentProfile = await fetchWrapper('/prelegents/user/me');
        } catch (error) {
            if (error.message.includes('No prelegent profile found') || error.message.includes('404')) {
                containerElement.innerHTML = '<p class="text-center">Nie znaleziono profilu prelegenta powiązanego z Twoim kontem użytkownika.</p>';

                if (userRole === auth.ROLES_MAP.ADMINISTRATOR) {
                    containerElement.innerHTML += `<div class="text-center mt-3"><a href="#/prelegents" class="btn btn-secondary" data-navigo>Zarządzaj Prelegentami</a></div>`;
                    attachNavigoLinks(containerElement);
                }
                return;
            }

            throw error;
        }

        if (!myPrelegentProfile || !myPrelegentProfile.id) {
            containerElement.innerHTML = '<p class="text-center">Nie jesteś zarejestrowany jako prelegent.</p>';
            return;
        }
        const myPrelegentId = myPrelegentProfile.id;

        const allEvents = await fetchWrapper('/events');

        const myLectures = allEvents.filter(event =>
            event.prelegentIds && Array.isArray(event.prelegentIds) && event.prelegentIds.includes(myPrelegentId)
        );

        let contentHtml;
        if (myLectures.length === 0) {
            contentHtml = '<p class="text-center">Nie jesteś aktualnie przypisany(a) do żadnych wydarzeń jako prelegent.</p>';
        } else {

            myLectures.sort((a, b) => new Date(a.started_at) - new Date(b.started_at));
            const lecturesHtml = myLectures.map(event => renderLectureCard(event)).join('');
            contentHtml = `<div class="row row-cols-1 row-cols-md-2 g-4">${lecturesHtml}</div>`;
        }

        containerElement.innerHTML = `
            ${contentHtml}
        `;

        attachMyLecturesEventListeners(containerElement);

    } catch (error) {
        console.error('Error fetching my lectures:', error);
        ui.showError(`Nie udało się załadować Twoich prelekcji: ${error.message}`, `#${containerElement.id}`);
    }
}

function renderLectureCard(event) {
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
                <h6 class="card-subtitle mb-2 text-muted">${escapeHtml(event.category_name)}</h6>
                <p class="card-text mb-1">
                    <i class="bi bi-geo-alt-fill text-secondary"></i> ${escapeHtml(event.locale_name)}, ${escapeHtml(event.locale_city)}
                </p>
                <p class="card-text small">
                    <i class="bi bi-calendar-range text-secondary"></i> ${startDate} - ${endDate}
                </p>
                <p class="card-text small mt-2">${escapeHtml(event.description.substring(0, 150))}${event.description.length > 150 ? '...' : ''}</p>

                 <ul class="list-group list-group-flush mt-3">
                    <li class="list-group-item d-flex justify-content-between align-items-center small py-1 px-0">
                        Cena (wydarzenia):
                        <span class="badge bg-light text-dark rounded-pill">${price} PLN</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between align-items-center small py-1 px-0">
                        Liczba zapisanych:
                        <span class="badge bg-light text-dark rounded-pill">${event.ticket_count}</span>
                    </li>
                 </ul>
            </div>
             <div class="card-footer text-end bg-light">
                  <button class="btn btn-sm btn-outline-primary lecture-details-btn" data-event-id="${event.id}">
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

function attachMyLecturesEventListeners(container) {
    container.querySelectorAll('.lecture-details-btn').forEach(button => {
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