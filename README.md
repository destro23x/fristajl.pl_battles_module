# omeglin

Source code for the Omeglin app from https://javalin.io/tutorials/building-an-omegle-clone-in-javalin. 

Omeglin is a simple and fully functional Omegle clone built in Javalin, 
using plain JavaScript and CSS (no libraries or frontend build pipeline).

<img width="1003" alt="Omeglin" src="https://github.com/tipsy/omeglin/assets/1521451/33415a5f-95b7-47a4-90a1-b199e075a714">

Kotlin ma obsugiwać losowanie tematów i pobieranie całego pliku z S3
Dodawanie tematów -> kotlin przyjmuje tylko stringi i wrzuca je do S3 jako sha, amdin moze przegladnac wszystkie zgłoszenia i zupdatować plik w S3 tak aby nie było duplikatów.
Dla wrzucania obrazków 
Przez kotlin mozna wrzucić własne beaty. (zobaczyc czy nie pobierac jakiś małych opłat za to - promowanie sie producentów)

UI -> https://github.com/shadcn-ui/ui lub https://github.com/radix-ui/themes

Np:
100 000 tematów wygenerujesz raz,
zapiszesz w bazie,
a użytkownicy tylko je losują.
Wtedy płacisz jednorazowo kilka złotych.

Pobieranie TikToków:
export TIKTOK_MS_TOKEN=twój_token_tutaj
ADMIN_PASSWORD=... OPENROUTER_API_KEY=... docker compose up tiktok-cron
Cron już działa o 04:00 UTC — nie trzeba nic zmieniać w entrypoint.sh. Po przebudowaniu obrazu:


ADMIN_PASSWORD=twoje_haslo OPENROUTER_API_KEY=test docker compose build tiktok-cron

ADMIN_PASSWORD=twoje_haslo OPENROUTER_API_KEY=test docker compose up -d tiktok-cron
Możesz też ustawić TIKTOK_FYP_SCROLLS=50 w .env jeśli chcesz więcej URLi z FYP.

# Uruchamianie fetch.py w kontenerze (scripts/fetch-tiktoks)

Serwis `tiktok-cron` w `docker-compose.yml` uruchamia `fetch.py` raz przy starcie kontenera, a potem codziennie o 04:00 UTC przez crona.

1. Ustaw token w `.env` (wymagany, inaczej fetch jest pomijany):
```bash
echo "TIKTOK_MS_TOKEN=twoj_token_z_cookies" >> .env
```
Token bierzesz z DevTools → Application → Cookies na tiktok.com (cookie `msToken`).

2. Zbuduj i uruchom serwis (razem z zależnym `localstack`):
```bash
docker compose up --build tiktok-cron
```

3. Żeby odpalić jednorazowy fetch bez czekania na crona:
```bash
docker compose run --rm tiktok-cron python /app/fetch.py
```

4. Podgląd logów działającego kontenera:
```bash
docker compose logs -f tiktok-cron
```

Opcjonalne zmienne środowiskowe: `TIKTOK_HASHTAGS`, `TIKTOK_VIDEOS_PER_TAG`, `TIKTOK_FYP_SCROLLS` (np. `TIKTOK_FYP_SCROLLS=50` w `.env` da więcej URLi z FYP).

## Uruchamianie z prawdziwym AWS S3 (zamiast LocalStack)

Domyślnie `tiktok-cron` pisze do LocalStacka (`S3_ENDPOINT=http://localstack:4566`). Żeby wymusić zapis do prawdziwego bucketu `fristajl-prod-tiktoks` w AWS, nadpisz zmienne bezpośrednio w komendzie (nie polegaj na `export` w shellu — łatwo się zgubi między sesjami):
```bash
docker compose run --rm \
  -e S3_ENDPOINT= \
  -e AWS_ACCESS_KEY_ID=twoj_access_key \
  -e AWS_SECRET_ACCESS_KEY=twoj_secret_key \
  -e TIKTOK_MS_TOKEN=twoj_token \
  tiktok-cron python /app/fetch.py
```
Bucket wymaga nagłówka szyfrowania SSE-AES256 na każdym uploadzie (polityka `attach_deny_incorrect_encryption_headers` w `infrastructure/stacks/catalog/storage.yaml`) — `fetch.py` ustawia to automatycznie przez `ServerSideEncryption="AES256"` w `save_trending()`.

# Darmowe Modele AI
- https://www.pepper.pl/promocje/minimax-m3-darmowy-model-tekstowy-ai-inputoutput-000-w-tokenrouter-1296376

# fristajl.pl

Głosówki:
- Rurku: https://www.youtube.com/watch?v=NclHtjj3aWM
- Ziobro: https://www.youtube.com/watch?v=aOu4dswHcfQ
- dura lex durex
- spieprzaj dziadu
- plan a,b 
- nitro o wojtku goli
- tusk tasmy - https://www.google.com/search?q=tusk+giertych&rlz=1C5GCEM_enPL1114PL1115&oq=tusk+giertych&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIKCAEQABgTGBYYHjIKCAIQABgTGBYYHjIKCAMQABgTGBYYHjIKCAQQABgTGBYYHjIKCAUQABgTGBYYHjIKCAYQABgTGBYYHjIMCAcQABgKGBMYFhgeMgwICBAAGAoYExgWGB4yCggJEAAYExgWGB7SAQgyNzczajBqNKgCALACAQ&sourceid=chrome&source=chrome.ob&ie=UTF-8#fpstate=ive&vld=cid:175f2000,vid:LurN9D1NP1Q,st:0
- gnój dupa i kamieni kupa
- bedoes - tvn - https://www.youtube.com/live/UNAqqHIPbWA?si=nWNj8PYFhxbqtUg2
- temu robiłam temu robiła a temu
- 3 razy po dwa razy
- pyskowanie w sądzie - tyle lat zyje a ty mi pietnastaka dajesz ?

# Funkcje, które mozna zaimplementować
- Dodawanie nowych Jingli - chciałbym aby jungle i tiktoki tez mogły być dodawane przez uzytkowników, zeby mozna było melodie wrzucić.
- powiadomienia jak ktos zaproponuje obrazek albo temat.

# Monetyzacja
- Urządzać na discordzie bitwy i temat jest brany z donet'a. Np 20 złotych za rapowanie przez minute o Marcie Linkiewicz, Marcinie Najmanie etc generalnie to ma być obrazanie postaci znanych na beacie.
- Zarapuj na temat z doneta tipeo
- Napisać do Bessera - duza ekspozycja na młodych ludzi

- Ad sense włączyć to statyczna strona