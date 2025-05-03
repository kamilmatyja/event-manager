import {API_BASE_URL} from './config.js';
import {getToken, logout} from './auth.js';

export async function fetchWrapper(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {

            if (response.status === 401 || response.status === 403) {
                console.warn(`Received ${response.status}, logging out.`);

                setTimeout(logout, 0);

                const errorData = await response.json().catch(() => ({message: `HTTP error ${response.status}`}));
                throw new Error(errorData.message || `HTTP error ${response.status}`);

            }

            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {

                errorData = {message: `HTTP error ${response.status}: ${response.statusText}`};
            }

            if (errorData.errors && Array.isArray(errorData.errors)) {
                const validationMessages = errorData.errors.map(e => `${e.path}: ${e.msg}`).join('; ');
                throw new Error(`Validation failed: ${validationMessages}`);
            }

            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error('API Fetch Error:', error);

        throw error;
    }
}