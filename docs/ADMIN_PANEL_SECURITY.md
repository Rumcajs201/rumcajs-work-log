# Prywatny panel administracyjny — architektura bezpieczeństwa

## Zasada podstawowa

Panel administracyjny nie może być częścią publicznej aplikacji GitHub Pages chronioną wyłącznie ukrytym adresem albo PIN-em w JavaScript. Kod strony publicznej jest dostępny dla każdego użytkownika.

## Docelowa architektura

1. Logowanie przez Google/Firebase Authentication.
2. Dostęp wyłącznie dla konta administratora znajdującego się na liście dozwolonych kont.
3. Dane zgłoszeń pobierane przez backend, nigdy bezpośrednio z Gmaila przez publiczny JavaScript.
4. Brak tokenów Gmail, kluczy prywatnych i sekretów w repozytorium.
5. Reguły Firestore/Backend odrzucają każde żądanie użytkownika bez uprawnień administratora.
6. Odpowiedzi tworzone jako szkice. Wysyłanie wymaga osobnej, świadomej decyzji administratora.

## Statusy zgłoszeń

- Nowe
- W analizie
- Zaplanowane
- Naprawione
- Zamknięte

## Kategorie

- Błąd
- Pomysł
- Pytanie

## Dane techniczne dołączane przez aplikację

- identyfikator urządzenia RW-
- numer wersji aplikacji
- profil aplikacji
- język
- platforma i przeglądarka
- stan połączenia
- data i godzina UTC

Aplikacja nie dołącza historii pracy, lokalizacji, notatek ani innych danych użytkownika.

## Wdrożony etap operacyjny

Skrzynka Gmail ma osobne etykiety WorkLog, a cykliczny proces sprawdza nowe zgłoszenia, klasyfikuje je, przygotowuje podsumowania i może tworzyć szkice odpowiedzi. Wiadomości nie są wysyłane automatycznie.

## Kolejny etap wizualny

Graficzny panel administratora należy uruchomić dopiero po skonfigurowaniu Firebase Authentication i bezpiecznego backendu. Do tego czasu nie wolno publikować strony admina z dostępem do danych Gmail.