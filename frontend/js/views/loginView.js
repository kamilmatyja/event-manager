import {render} from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';

export function renderLoginForm(containerElement) {

    if (auth.isLoggedIn()) {
        navigateTo(auth.getDefaultRouteForUser());
        return;
    }

    const loginFormHtml = `
        <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">
                <h1 class="text-center mb-4">Zaloguj się</h1>
                <form id="login-form" novalidate>
                    <div class="form-floating mb-3">
                        <input type="email" class="form-control" id="email" placeholder="name@example.com" required minlength="5">
                        <label for="email">Adres Email</label>
                        <div class="invalid-feedback">
                            Proszę podać poprawny adres email.
                        </div>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="password" placeholder="Hasło" required minlength="8" pattern="(?=.*\\d)(?=.*[a-zA-Z]).{8,}">
                        <label for="password">Hasło</label>
                         <div class="invalid-feedback">
                            Proszę podać hasło.
                        </div>
                    </div>
                    <div id="login-error" class="text-danger mb-3" style="display: none;"></div>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary btn-lg">Zaloguj</button>
                    </div>
                     <p class="mt-3 text-center">
                        Nie masz konta? <a href="#/register" data-navigo>Zarejestruj się</a>
                     </p>
                </form>
            </div>
        </div>
    `;

    render(containerElement.id, loginFormHtml);
    attachLoginEventListeners();
}

function attachLoginEventListeners() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginErrorDiv = document.getElementById('login-error');

    loginForm.querySelector('a[data-navigo]').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('#/register');
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        loginErrorDiv.style.display = 'none';
        loginForm.classList.add('was-validated');

        if (!loginForm.checkValidity()) {
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        const result = await auth.login(email, password);

        if (!result.success) {
            loginErrorDiv.textContent = 'Błędne dane logowania. Proszę spróbować ponownie.';
            loginErrorDiv.style.display = 'block';
            loginForm.classList.remove('was-validated');

            if (result.message && result.message.toLowerCase().includes('invalid')) {
                emailInput.classList.add('is-invalid');
                passwordInput.classList.add('is-invalid');
            }
        }
    });

    emailInput.addEventListener('input', () => emailInput.classList.remove('is-invalid'));
    passwordInput.addEventListener('input', () => passwordInput.classList.remove('is-invalid'));
}