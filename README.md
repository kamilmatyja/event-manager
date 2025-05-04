# Menedżer Wydarzeń

Ten plik README opisuje kroki niezbędne do skonfigurowania, zainstalowania zależności, uruchomienia oraz przetestowania aplikacji "Menedżer Wydarzeń" w lokalnym środowisku deweloperskim.

## Opis Aplikacji

Menedżer Wydarzeń to aplikacja webowa typu Full Stack składająca się z:
*   **Backendu:** API RESTful zbudowane w Node.js z użyciem frameworka Express, zarządzające logiką biznesową, uwierzytelnianiem (JWT) i interakcją z bazą danych PostgreSQL (poprzez Knex.js).
*   **Frontendu:** Interfejs użytkownika zbudowany przy użyciu HTML, CSS (Bootstrap 5) i Vanilla JavaScript, komunikujący się z backendowym API.
*   **Bazy Danych:** PostgreSQL uruchamianej w kontenerze Docker.

## Wymagania Wstępne

Przed rozpoczęciem upewnij się, że masz zainstalowane następujące oprogramowanie:
*   [Node.js](https://nodejs.org/) (zalecana wersja >= 18.x) i npm
*   [Docker](https://www.docker.com/get-started) i Docker Compose
*   [Git](https://git-scm.com/) (do sklonowania repozytorium)

## Instalacja i Uruchomienie

Poniższe kroki przeprowadzą Cię przez proces instalacji i uruchomienia aplikacji. Wykonaj je w terminalu z głównego katalogu projektu.

---

1.  **`cd frontend`**
    *   **Opis:** Zmienia bieżący katalog na podkatalog `frontend`. Wszystkie kolejne polecenia (do następnego `cd`) będą wykonywane w kontekście frontendu.

2.  **`npm install`**
    *   **Opis:** Instaluje wszystkie zależności frontendu zdefiniowane w pliku `frontend/package.json`. Dotyczy to bibliotek takich jak Bootstrap, Bootstrap Icons oraz narzędzi deweloperskich jak `live-server` czy `concurrently`.

3.  **`cd ../backend`**
    *   **Opis:** Zmienia bieżący katalog z `frontend` z powrotem do katalogu nadrzędnego (głównego katalogu projektu), a następnie przechodzi do podkatalogu `backend`. Kolejne polecenia będą dotyczyć backendu.

4.  **`cp .env.example .env`**
    *   **Opis:** Kopiuje plik `.env.example` (zawierający przykładowe zmienne środowiskowe) do nowego pliku o nazwie `.env`. Plik `.env` jest używany przez aplikację do ładowania konfiguracji (np. danych dostępowych do bazy, sekretu JWT) i **nie powinien być commitowany do Git**.
    *   **WAŻNE:** Po wykonaniu tego kroku **musisz edytować plik `.env`** i uzupełnić go poprawnymi wartościami (np. hasło do bazy danych, własny `JWT_SECRET`). Wartości dla bazy danych (`DB_USER`, `DB_PASSWORD`, `DB_NAME`) muszą być zgodne z tymi zdefiniowanymi w pliku `backend/docker-compose.yml`.

5.  **`docker compose up -d`**
    *   **Opis:** Uruchamia usługi zdefiniowane w pliku `docker-compose.yml` (w katalogu `backend`). W tym przypadku uruchamia kontener z bazą danych PostgreSQL w trybie odłączonym (`-d`, działa w tle). Docker Compose automatycznie utworzy sieć i wolumin, jeśli nie istnieją. Baza danych zostanie zainicjalizowana z użyciem zmiennych środowiskowych przekazanych z pliku `.env`.

6.  **`npm install`**
    *   **Opis:** Instaluje wszystkie zależności backendu zdefiniowane w pliku `backend/package.json`. Obejmuje to framework Express, Knex.js, sterownik `pg`, `bcrypt`, `jsonwebtoken` oraz zależności deweloperskie jak `nodemon`, `jest`, `supertest`.

7.  **`npx knex migrate:latest`**
    *   **Opis:** Zanim uruchomisz aplikację lub seedery, musisz utworzyć strukturę tabel w bazie danych.

8.  **`npx knex seed:run`**
    *   **Opis:** Uruchamia pliki "seedów", które wypełniają bazę danych początkowymi danymi (np. kontem administratora, kategoriami, przykładowymi wydarzeniami). Jest to przydatne do testowania i developmentu. Wykonaj ten krok po uruchomieniu migracji.

9.  **`npm run dev`**
    *   **Opis:** Uruchamia skrypt `dev` zdefiniowany w `backend/package.json`. Skrypt ten używa `concurrently` do równoczesnego uruchomienia:
        *   Serwera backendowego za pomocą `nodemon` (nasłuchuje na porcie z `.env`, np. 3000 i automatycznie restartuje się przy zmianach kodu).
        *   Serwera deweloperskiego dla frontendu (prawdopodobnie `live-server`, nasłuchuje na porcie np. 8080 i odświeża przeglądarkę przy zmianach).
    *   **Działanie:** Jest to główna komenda do uruchomienia całej aplikacji w trybie deweloperskim. Adresy URL będą widoczne w terminalu po uruchomieniu.

10. **`npm test`**
    *   **Opis:** Uruchamia skrypt `test` zdefiniowany w `backend/package.json`. Wykonuje zestaw testów (jednostkowych/integracyjnych) dla backendu przy użyciu frameworka Jest i biblioteki Supertest.

---

Po wykonaniu powyższych kroków, aplikacja powinna być dostępna:
*   Frontend: Pod adresem `http://127.0.0.1:8080`.
*   Backend API: Pod adresem `http://localhost:3000`.
*   Dokumentacja API (Swagger): Pod adresem `http://localhost:3000/api-docs`.