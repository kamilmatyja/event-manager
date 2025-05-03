import {renderEventsList} from './eventsView.js';

/**
 * Renderuje widok strony głównej.
 * Obecnie po prostu renderuje listę wydarzeń.
 * @param {HTMLElement} containerElement - Element kontenera, w którym ma być renderowany widok.
 */
export async function renderHomeView(containerElement) {

    await renderEventsList(containerElement);
}