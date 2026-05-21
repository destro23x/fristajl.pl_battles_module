#!/bin/bash
# LocalStack init script - runs after S3 service is ready
set -e

ENDPOINT="http://localhost:4566"
REGION="eu-central-1"

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION="$REGION"

BUCKETS=(
  "fristajl-prod-topics"
  "fristajl-prod-topics-propositions"
  "fristajl-prod-pictures"
  "fristajl-prod-pictures-propositions"
  "fristajl-prod-beats"
  "fristajl-prod-beats-propositions"
  "fristajl-prod-sounds"
  "fristajl-prod-sounds-propositions"
  "fristajl-prod-tiktoks"
  "fristajl-prod-tiktoks-propositions"
)

for bucket in "${BUCKETS[@]}"; do
  echo "Creating bucket: $bucket"
  aws --endpoint-url="$ENDPOINT" s3api create-bucket \
    --bucket "$bucket" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
  aws --endpoint-url="$ENDPOINT" s3api put-bucket-acl \
    --bucket "$bucket" \
    --acl public-read \
    --region "$REGION" 2>/dev/null || true
done

echo "All S3 buckets ready."

# Upload test topics.txt to topics bucket
echo "Uploading test topics.txt..."
cat <<'TOPICS' > /tmp/topics.txt
abstrakcyjna geometria codzienności
czas który ucieka przez palce
miasto które nigdy nie śpi
lustro bez odbicia
puste krzesło przy stole
dźwięk deszczu na betonie
granica między snem a jawą
cień który wyprzedza człowieka
słowa niewypowiedziane do końca
niebo widziane z podziemia
zafreestajluj na temat z donete'a tipeo
Gołąb, który sprzedaje ubezpieczenia na przystanku
Papież prowadzący kanał o driftowaniu traktorem
Żabka jako niezależne państwo nuklearne
Dentysta walczący mieczem świetlnym o ostatni kebab
Kret będący influencerem fitness
Lodówka, która obraziła się i uciekła do lasu
Sztuczna inteligencja uzależniona od disco polo
Ryba pracująca na infolinii banku
Wujek z wesela jako tajny agent kosmitów
Skarpetki prowadzące między sobą wojnę domową
Diler pietruszki ścigany przez CBŚ
Autobus miejski opętany przez ducha rapera
Bobry budujące galerię handlową na środku Wisły
Kaczka, która została prezesem korporacji
Ochroniarz z siłowni walczący z demonami na hulajnodze
Mikrofalówka aspirująca do kariery politycznej
Smok wawelski streamujący gry na Twitchu
Zombie pytające ludzi o polecenia seriali
Król średniowiecza uzależniony od TikToka
Biedronka zamieniona w arenę gladiatorów po 22:00
TOPICS

aws --endpoint-url="$ENDPOINT" s3 cp /tmp/topics.txt "s3://fristajl-prod-topics/topics.txt" \
  --region "$REGION" \
  --acl public-read

echo "topics.txt uploaded."
