import {render} from '../../ui.js';

const footerContainerId = 'footer-container';

export function renderFooter() {
    const year = new Date().getFullYear();
    const footerHtml = `
    <div class="bg-dark text-light text-center p-3">
        © ${year} Menedżer Wydarzeń. Wszystkie prawa zastrzeżone.
    </div>
    `;
    render(footerContainerId, footerHtml);
}