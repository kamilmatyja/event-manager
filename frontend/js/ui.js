/**
 * Renderuje zawartość HTML w wybranym kontenerze.
 * @param {string} containerSelector - Selektor CSS kontenera.
 * @param {string} htmlContent - Zawartość HTML do wstawienia.
 */
export function render(containerSelector, htmlContent) {
    let containerSelectorWithHash = containerSelector;
    if (/^[a-zA-Z]/.test(containerSelector)) {
        containerSelectorWithHash = `#${containerSelector}`;
    }
    const container = document.querySelector(containerSelectorWithHash);

    if (container) {
        container.innerHTML = htmlContent;
    } else {
        console.error(`Container with selector "${containerSelector}" not found.`);
    }
}

/** Pokazuje element przez usunięcie klasy 'd-none' */
export function showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.remove('d-none');
    }
}

/** Ukrywa element przez dodanie klasy 'd-none' */
export function hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.add('d-none');
    }
}

/** Wstawia spinner ładowania */
export function showLoadingSpinner(containerSelector = '#app-content') {
    const spinnerHtml = `
        <div class="d-flex justify-content-center align-items-center loading-spinner" style="min-height: 300px;">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Ładowanie...</span>
            </div>
        </div>`;
    render(containerSelector, spinnerHtml);
}

/** Pokazuje komunikat błędu jako alert Bootstrap */
export function showError(message, containerSelector = '#app-content') {
    const errorHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Błąd!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;

    const container = document.querySelector(containerSelector);
    if (container) {
        container.insertAdjacentHTML('afterbegin', errorHtml);
    } else {
        console.error(`Error container "${containerSelector}" not found.`);
    }
}

/** Pokazuje komunikat sukcesu jako alert Bootstrap */
export function showSuccess(message, containerSelector = '#app-content') {
    const successHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
    const container = document.querySelector(containerSelector);
    if (container) {
        container.insertAdjacentHTML('afterbegin', successHtml);
    } else {
        console.error(`Success container "${containerSelector}" not found.`);
    }
}

/** Tworzy i zwraca element HTML */
export function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }

    if (options.classes) {
        element.classList.add(...options.classes);
    }

    if (options.text) {
        element.textContent = options.text;
    }

    if (options.html) {
        element.innerHTML = options.html;
    }

    if (options.dataset) {
        for (const [key, value] of Object.entries(options.dataset)) {
            element.dataset[key] = value;
        }
    }
    return element;
}

/** Czyści zawartość kontenera */
export function clearContainer(containerSelector) {
    render(containerSelector, '');
}