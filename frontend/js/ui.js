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