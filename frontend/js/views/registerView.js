import {render} from '../ui.js';
import * as auth from '../auth.js';
import {navigateTo} from '../router.js';

export function renderRegisterForm(containerElement) {

    if (auth.isLoggedIn()) {
        navigateTo(auth.getDefaultRouteForUser());
        return;
    }

    const registerFormHtml = `
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <h1 class="text-center mb-4">Zarejestruj się</h1>
                <form id="register-form" novalidate>
                    <div class="row mb-3">
                        <div class="col-md-6">
                             <div class="form-floating">
                                <input type="text" class="form-control" id="first_name" placeholder="Imię" required minlength="5" maxlength="100">
                                <label for="first_name">Imię</label>
                                <div class="invalid-feedback">
                                    Proszę podać imię (min 5 znaków).
                                </div>
                            </div>
                        </div>
                         <div class="col-md-6">
                            <div class="form-floating">
                                <input type="text" class="form-control" id="last_name" placeholder="Nazwisko" required minlength="5" maxlength="100">
                                <label for="last_name">Nazwisko</label>
                                <div class="invalid-feedback">
                                     Proszę podać nazwisko (min 5 znaków).
                                </div>
                            </div>
                        </div>
                    </div>

                     <div class="form-floating mb-3">
                        <input type="text" class="form-control" id="nick" placeholder="Nick" required minlength="5" maxlength="100" pattern="^[a-zA-Z0-9_]+$">
                        <label for="nick">Nick</label>
                        <div class="invalid-feedback">
                            Proszę podać nick (min 5 znaków, tylko litery, cyfry i podkreślnik).
                        </div>
                    </div>

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
                         <div class="form-text">
                           Minimum 8 znaków, w tym co najmniej jedna litera i jedna cyfra.
                         </div>
                        <div class="invalid-feedback">
                            Hasło musi mieć min. 8 znaków, zawierać literę i cyfrę.
                        </div>
                    </div>

                     <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="confirmPassword" placeholder="Potwierdź Hasło" required minlength="8" pattern="(?=.*\\d)(?=.*[a-zA-Z]).{8,}">
                        <label for="confirmPassword">Potwierdź Hasło</label>
                        <div class="invalid-feedback">
                            Hasła muszą być identyczne.
                        </div>
                    </div>

                    <div id="register-error" class="text-danger mb-3" style="display: none;"></div>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary btn-lg">Zarejestruj</button>
                    </div>
                     <p class="mt-3 text-center">
                        Masz już konto? <a href="#/login" data-navigo>Zaloguj się</a>
                     </p>
                </form>
            </div>
        </div>
    `;

    render(containerElement.id, registerFormHtml);
    attachRegisterEventListeners();
}

function attachRegisterEventListeners() {
    const registerForm = document.getElementById('register-form');
    const firstNameInput = document.getElementById('first_name');
    const lastNameInput = document.getElementById('last_name');
    const nickInput = document.getElementById('nick');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const registerErrorDiv = document.getElementById('register-error');

    registerForm.querySelector('a[data-navigo]').addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('#/login');
    });

    confirmPasswordInput.addEventListener('input', () => {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Hasła muszą być identyczne.');

            if (registerForm.classList.contains('was-validated')) {
                confirmPasswordInput.reportValidity();
            }
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });

    passwordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Hasła muszą być identyczne.');
            if (registerForm.classList.contains('was-validated')) {
                confirmPasswordInput.reportValidity();
            }
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        registerErrorDiv.style.display = 'none';
        registerForm.classList.add('was-validated');

        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Hasła muszą być identyczne.');
            confirmPasswordInput.reportValidity();
            return;
        } else {
            confirmPasswordInput.setCustomValidity('');
        }

        if (!registerForm.checkValidity()) {
            return;
        }

        const userData = {
            first_name: firstNameInput.value.trim(),
            last_name: lastNameInput.value.trim(),
            nick: nickInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,

        };

        const result = await auth.register(userData);

        if (!result.success) {
            registerErrorDiv.textContent = 'Błędne dane rejestracji. Proszę spróbować ponownie';
            registerErrorDiv.style.display = 'block';
            registerForm.classList.remove('was-validated');

            if (result.message && result.message.toLowerCase().includes('email already exists')) {
                emailInput.classList.add('is-invalid');
                emailInput.focus();
            }
            if (result.message && result.message.toLowerCase().includes('nick already exists')) {
                nickInput.classList.add('is-invalid');
                nickInput.focus();
            }
        }
    });

    [firstNameInput, lastNameInput, nickInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
        input.addEventListener('input', () => input.classList.remove('is-invalid'));
    });
}