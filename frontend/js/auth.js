import {fetchWrapper} from './api.js';
import {renderNavbar} from './views/components/navbar.js';
import {navigateTo} from './router.js';

const TOKEN_KEY = 'authToken';

export function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
    return !!getToken();
}

export function getUserInfo() {
    const token = getToken();
    if (!token) return null;
    try {
        const payloadBase64 = token.split('.')[1];

        return JSON.parse(atob(payloadBase64));
    } catch (error) {
        console.error('Error decoding token:', error);
        removeToken();
        return null;
    }
}

export function getUserRole() {
    const userInfo = getUserInfo();
    return userInfo ? userInfo.role : null;
}

export function getUserId() {
    const userInfo = getUserInfo();
    return userInfo ? userInfo.id : null;
}

export async function login(email, password) {
    try {
        const data = await fetchWrapper('/auth/login', {
            method: 'POST',
            body: JSON.stringify({email, password}),
        });
        if (data.token) {
            saveToken(data.token);
            renderNavbar();
            navigateTo(getDefaultRouteForUser());
            return {success: true, user: data.user};
        } else {

            return {success: false, message: data.message || 'Login failed.'};
        }
    } catch (error) {
        console.error('Login error:', error);
        return {success: false, message: error.message || 'Login failed due to a network or server error.'};
    }
}

export async function register(userData) {
    try {

        const {confirmPassword, ...backendData} = userData;
        const data = await fetchWrapper('/auth/register', {
            method: 'POST',
            body: JSON.stringify(backendData),
        });
        if (data.token) {
            saveToken(data.token);
            renderNavbar();
            navigateTo(getDefaultRouteForUser());
            return {success: true, user: data.user};
        } else {
            return {success: false, message: data.message || 'Registration failed.'};
        }
    } catch (error) {
        console.error('Registration error:', error);
        return {success: false, message: error.message || 'Registration failed due to a network or server error.'};
    }
}

export async function logout() {
    try {
        await fetchWrapper('/auth/logout', {method: 'POST'});
    } catch (error) {
        console.warn('Logout API call failed (might be expected if token was already invalid):', error.message);
    } finally {
        removeToken();
        renderNavbar();
        navigateTo('#/login');
    }
}

export function getDefaultRouteForUser() {
    const role = getUserRole();
    switch (role) {
        case 1:
            return '#/my-tickets';
        case 2:
            return '#/my-lectures';
        case 3:
            return '#/users';
        default:
            return '#/events';
    }
}

export const ROLES_MAP = {
    MEMBER: 1,
    PRELEGENT: 2,
    ADMINISTRATOR: 3
};

export const ROLES_TRANSLATIONS = {
    ADMINISTRATOR: 'Administrator',
    PRELEGENT: 'Prelegent',
    MEMBER: 'Członek',
    UNKNOWN: 'Nieznana'
};