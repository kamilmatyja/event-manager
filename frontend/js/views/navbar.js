import {render} from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';

const navbarContainerId = 'navbar-container';

export function renderNavbar() {
    const isLoggedIn = auth.isLoggedIn();
    const userRole = auth.getUserRole();
    const userInfo = auth.getUserInfo();

    let navLinks = `
        <li class="nav-item">
            <a class="nav-link" href="#/events" data-navigo>Wydarzenia</a>
        </li>
    `;

    let authLinks = '';
    let userInfoDisplay = '';

    if (isLoggedIn) {

        if (userRole === auth.ROLES_MAP.MEMBER) {
            navLinks += `
                <li class="nav-item">
                    <a class="nav-link" href="#/my-tickets" data-navigo>Moje Bilety</a>
                </li>`;
        }
        if (userRole === auth.ROLES_MAP.PRELEGENT) {
            navLinks += `
                <li class="nav-item">
                    <a class="nav-link" href="#/my-lectures" data-navigo>Moje Prelekcje</a>
                </li>`;
        }
        if (userRole === auth.ROLES_MAP.ADMINISTRATOR) {
            navLinks += `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="adminDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Zarządzanie
                    </a>
                    <ul class="dropdown-menu" aria-labelledby="adminDropdown">
                        <li><a class="dropdown-item" href="#/categories" data-navigo>Kategorie</a></li>
                        <li><a class="dropdown-item" href="#/locales" data-navigo>Lokalizacje</a></li>
                        <li><a class="dropdown-item" href="#/caterings" data-navigo>Katering</a></li>
                        <li><a class="dropdown-item" href="#/prelegents" data-navigo>Prelegenci</a></li>
                        <li><a class="dropdown-item" href="#/resources" data-navigo>Sprzęt</a></li>
                        <li><a class="dropdown-item" href="#/sponsors" data-navigo>Sponsorzy</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#/users" data-navigo>Użytkownicy</a></li>
                    </ul>
                </li>
            `;
        }

        if (userInfo && userInfo.nick) {
            userInfoDisplay = `<span class="navbar-text me-3">Zalogowano jako: ${userInfo.nick}</span>`;
        }

        authLinks = `
            <li class="nav-item">
                <button id="logout-button" class="btn btn-outline-secondary ms-2">Wyloguj się</button>
            </li>
        `;
    } else {

        authLinks = `
            <li class="nav-item">
                <a class="nav-link" href="#/register" data-navigo>Zarejestruj się</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#/login" data-navigo>Zaloguj się</a>
            </li>
        `;
    }

    const navbarHtml = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand" href="#/events">EventManager</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNavDropdown">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    ${navLinks}
                </ul>
                 <div class="d-flex align-items-center">
                    ${userInfoDisplay}
                    <ul class="navbar-nav mb-2 mb-lg-0">
                        ${authLinks}
                    </ul>
                </div>
            </div>
        </div>
    </nav>
    `;

    render(navbarContainerId, navbarHtml);

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }

    document.querySelectorAll('#navbar-container a[data-navigo]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetHash = link.getAttribute('href');
            navigateTo(targetHash);
        });

        if (link.getAttribute('href') === window.location.hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

}