import * as ui from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';
import {escapeHtml} from "../helpers.js";

/**
 * Renderuje widok strony głównej z powitaniem.
 * @param {HTMLElement} containerElement - Element kontenera, w którym ma być renderowany widok.
 */
export async function renderHomeView(containerElement) {
    const isLoggedIn = auth.isLoggedIn();
    const userInfo = auth.getUserInfo();
    let welcomeMessage = 'Witaj w Menedżerze Wydarzeń!';
    let actionButtonHtml = `
        <a href="#/events" class="btn btn-primary btn-lg me-2" data-navigo>Przeglądaj wydarzenia</a>
        <a href="#/login" class="btn btn-outline-secondary btn-lg" data-navigo>Zaloguj się</a>
    `;

    if (isLoggedIn && userInfo) {
        welcomeMessage = `Witaj z powrotem, ${escapeHtml(userInfo.nick)}!`;

        const defaultRoute = auth.getDefaultRouteForUser();
        let buttonText = 'Przejdź do panelu';
        if (defaultRoute === '#/my-tickets') buttonText = 'Zobacz moje bilety';
        if (defaultRoute === '#/my-lectures') buttonText = 'Zobacz moje prelekcje';
        if (defaultRoute === '#/events' && auth.getUserRole() === auth.ROLES_MAP.ADMINISTRATOR) buttonText = 'Zarządzaj wydarzeniami';

        actionButtonHtml = `
            <a href="${defaultRoute}" class="btn btn-success btn-lg me-2" data-navigo>${buttonText}</a>
            <button id="home-logout-button" class="btn btn-outline-secondary btn-lg">Wyloguj się</button>
        `;
    }

    const homeHtml = `
        <div class="container mt-5">
            <div class="p-5 mb-4 bg-light rounded-3 shadow-sm">
                <div class="container-fluid py-5 text-center">
                    <h1 class="display-5 fw-bold">${welcomeMessage}</h1>
                    <p class="fs-4 col-md-10 mx-auto">
                        Znajdź interesujące wydarzenia, zapisz się na nie lub zarządzaj systemem jako administrator.
                    </p>
                    <div class="mt-4">
                        ${actionButtonHtml}
                    </div>
                </div>
            </div>

            <div class="row align-items-md-stretch">
                <div class="col-md-6">
                    <div class="h-100 p-5 text-white bg-dark rounded-3">
                        <h2>Nadchodzące wydarzenia</h2>
                        <p>Zobacz co ciekawego wkrótce się odbędzie...</p>
                        <a href="#/events" class="btn btn-outline-light" data-navigo>Zobacz wszystkie</a>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="h-100 p-5 bg-light border rounded-3">
                        <h2>Twoje konto</h2>
                        <p>Zarządzaj swoimi biletami lub profilem.</p>
                         ${isLoggedIn ? '<a href="' + auth.getDefaultRouteForUser() + '" class="btn btn-outline-secondary" data-navigo>Przejdź</a>' : '<a href="#/login" class="btn btn-outline-secondary" data-navigo>Zaloguj się</a>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    ui.render(containerElement.id, homeHtml);
    attachHomeEventListeners(containerElement);
}

function attachHomeEventListeners(container) {
    container.querySelectorAll('a[data-navigo]').forEach(link => {
        if (!link.dataset.listenerAttached) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.getAttribute('href'));
            });
            link.dataset.listenerAttached = 'true';
        }
    });

    const logoutButton = container.querySelector('#home-logout-button');
    if (logoutButton && !logoutButton.dataset.listenerAttached) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
        logoutButton.dataset.listenerAttached = 'true';
    }
}