# Profile aplikacji

## Europris

Profil przeznaczony do pracy kierowców obsługujących Europris.

Funkcje:
- wspólna baza `stores.json` z projektu Europris Dostawy,
- wyszukiwanie po numerze, nazwie i adresie sklepu,
- wybór najbliższego sklepu przez GPS,
- docelowo lista dostaw i planowana liczba palet,
- docelowo miejsca ładunków powrotnych oraz magazyn centralny Moss.

## Uniwersalny

Profil dla kierowców innych firm i innych rodzajów transportu.

Funkcje:
- ręczne wpisanie firmy, magazynu lub adresu,
- brak pobierania bazy sklepów Europris,
- wspólny czas pracy, kalendarz, operacje, raporty i backup,
- docelowo lokalna baza własnych miejsc i różne jednostki ładunku.

## Zasada techniczna

Oba profile używają jednego wspólnego silnika aplikacji. Funkcje firmowe są włączane konfiguracją, a nie przez kopiowanie całej aplikacji.

Plik konfiguracji:

`js/config/app-config.js`

Wydanie tylko uniwersalne będzie mogło mieć:

```js
availableProfiles: ["universal"],
defaultProfile: "universal",
allowProfileChange: false
```

W takim wydaniu profil Europris i jego baza nie będą widoczne ani pobierane.
