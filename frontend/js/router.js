import * as auth from './auth.js';
import {render, showError, showLoadingSpinner} from './ui.js';
import {renderNavbar} from './views/components/navbar.js';

import {renderHomeView} from './views/homeView.js';
import {renderEventsList} from './views/eventsView.js';
import {renderCategoriesList} from './views/categoriesView.js';
import {renderLocalesList} from './views/localesView.js';
import {renderCateringsList} from './views/cateringsView.js';
import {renderPrelegentsList} from './views/prelegentsView.js';
import {renderResourcesList} from './views/resourcesView.js';
import {renderSponsorsList} from './views/sponsorsView.js';
import {renderUsersList} from './views/usersView.js';
import {renderLoginForm} from './views/loginView.js';
import {renderRegisterForm} from './views/registerView.js';
import {renderMyTickets} from './views/myTicketsView.js';
import {renderMyLectures} from './views/myLecturesView.js';

const routes = {
    '/': {view: renderHomeView, isPublic: true},
    '/events': {view: renderEventsList, isPublic: true},
    '/login': {view: renderLoginForm, isPublic: true, requiresLogout: true},
    '/register': {view: renderRegisterForm, isPublic: true, requiresLogout: true},
    '/my-tickets': {view: renderMyTickets, requiredRole: auth.ROLES_MAP.MEMBER},
    '/my-lectures': {view: renderMyLectures, requiredRole: auth.ROLES_MAP.PRELEGENT},
    '/categories': {view: renderCategoriesList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
    '/locales': {view: renderLocalesList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
    '/caterings': {view: renderCateringsList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
    '/prelegents': {view: renderPrelegentsList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
    '/resources': {view: renderResourcesList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
    '/sponsors': {view: renderSponsorsList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
    '/users': {view: renderUsersList, requiredRole: auth.ROLES_MAP.ADMINISTRATOR},
};

const contentElement = document.getElementById('app-content');

export function navigateTo(hash) {
    if (window.location.hash === hash) {
        return;
    }
    window.location.hash = hash;
}

async function router() {
    renderNavbar();
    const hash = window.location.hash || '#/';
    const path = hash.startsWith('#') ? hash.substring(1) : hash;

    const routeConfig = routes[path];

    if (!routeConfig) {
        console.error(`Route not found: ${path}`);
        render(contentElement.id, '<h1 class="text-center text-danger mt-5">404 - Nie znaleziono strony</h1>');
        return;
    }

    const isLoggedIn = auth.isLoggedIn();
    const userRole = auth.getUserRole();

    if (routeConfig.requiresLogout && isLoggedIn) {
        console.warn(`Route ${path} requires logout. Redirecting...`);
        navigateTo(auth.getDefaultRouteForUser());
        return;
    }

    if (routeConfig.requiredRole !== undefined) {
        if (!isLoggedIn) {
            console.warn(`Route ${path} requires login. Redirecting to /login...`);
            navigateTo('#/login');
            return;
        }
        if (routeConfig.requiredRole !== null && userRole !== routeConfig.requiredRole) {
            console.warn(`Route ${path} requires role ${routeConfig.requiredRole}, but user has role ${userRole}. Forbidden.`);
            showError(`Nie masz uprawnień (wymagana rola: ${getKeyByValue(auth.ROLES_MAP, routeConfig.requiredRole) || 'Zalogowany użytkownik'})`, `#${contentElement.id}`);

            return;
        }
    }

    showLoadingSpinner(`#${contentElement.id}`);

    try {
        await routeConfig.view(contentElement);
    } catch (error) {
        console.error(`Error rendering route ${path}:`, error);
        showError(`Wystąpił błąd podczas ładowania widoku: ${error.message}`, `#${contentElement.id}`);
    }
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

router();