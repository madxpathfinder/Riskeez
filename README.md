# GRC Platform

A self-hosted **Risk Management & GRC (Governance, Risk and Compliance)** platform built for organisations that need full control over their risk data. Provides risk registers, control libraries, compliance assessments, document management, and AI-assisted analysis — all running on your own infrastructure.

---

## Mündəricat / Table of Contents

1. [Qısa Başlanğıc (Linux)](#1-qısa-başlanğıc-linux)
2. [İstifadə Qaydası](#2-istifadə-qaydası)
3. [Non-Interactive Setup](#3-non-interactive-setup)
4. [Post-Install Verification](#4-post-install-verification)
5. [İstifadəçi Rolları](#5-istifadəçi-rolları)
6. [Problemlərin Həlli](#6-problemlərin-həlli)
7. [Faydalı Əmrlər](#7-faydalı-əmrlər)
8. [Yeni Xüsusiyyətlər](#8-yeni-xüsusiyyətlər)
9. [Risk Qiymətləndirmə Sistemi](#9-risk-qiymətləndirmə-sistemi)
10. [Git ilə Deployment](#10-git-ilə-deployment)
11. [Deployment (package.sh)](#11-deployment-packagesh)
12. [Sessiya Təhlükəsizliyi](#12-sessiya-təhlükəsizliyi)
13. [URL Strukturu](#13-url-strukturu)
14. [Architecture](#14-architecture)

---

## 1. Qısa Başlanğıc (Linux)

```bash
# 1. Sıxılmış faylı açın
unzip grc-platform.zip -d /var/www/riskeez

# 2. Quraşdırma skriptinə icra icazəsi verin
chmod +x /var/www/riskeez/setup.sh

# 3. Skripti administrator səlahiyyətləri ilə işə salın
sudo bash /var/www/riskeez/setup.sh
```

Skript tərəfindən avtomatik quraşdırılacaq paketlər:
- **Node.js 20+** (LTS)
- **PostgreSQL 15+**
- **Nginx**
- **PM2** (proses idarəetmə)

---

## 2. İstifadə Qaydası

### Quraşdırma Sihirbazı

`setup.sh` skripti işə salındıqda interaktiv sihirbaz başlayır. Sihirbaz aşağıdakı məlumatları soruşur:

| Sual | Açıqlama | Nümunə |
|---|---|---|
| Admin full name | Sistem administratorunun tam adı | `Əli Həsənov` |
| Admin email address | Giriş üçün e-poçt ünvanı | `admin@asanxidmet.az` |
| Admin password | Minimum 8 simvol | `P@ssw0rd!` |
| Organisation name | Şirkətin rəsmi adı | `Asan Xidmət` |
| Application name | Proqramın adı (avtomatik təklif edilir) | `Asan Risk` |
| Server IP or hostname | Serverin IP ünvanı və ya host adı | `192.168.1.10` |
| Setup mode | `single` (bir server) / `enterprise` (çoxlu server) | `single` |
| Backend API port | API portu (standart: 3001) | `3001` |
| Frontend (Nginx) port | Nginx portu (standart: 80) | `80` |

### Proqram Adı (App Name) Qaydası

Proqramın adı şirkətin adının **birinci sözündən** + **boşluq** + **"Risk"** əlavəsindən yaradılır:

| Şirkət Adı | Avtomatik Təklif |
|---|---|
| `Asan Xidmət` | `Asan Risk` |
| `Azərenerji` | `Azərenerji Risk` |
| `SOCAR` | `SOCAR Risk` |
| `Kapital Bank` | `Kapital Risk` |

Siz öz adınızı da yaza bilərsiniz, amma **"Risk" sözü mütləq olmalıdır**.

### Sistemə Giriş

Quraşdırma tamamlandıqdan sonra brauzerdə açın:

```
http://<server-ip>/
```

Sihirbaz zamanı daxil etdiyiniz admin e-poçtu və şifrəsi ilə daxil olun.

---

## 3. Non-Interactive Setup

Bütün parametrləri əvvəlcədən vermək mümkündür:

```bash
sudo bash setup.sh \
  --admin-name     "Əli Həsənov" \
  --admin-email    "admin@asanxidmet.az" \
  --admin-password "P@ssw0rd!" \
  --org-name       "Asan Xidmət" \
  --app-name       "AsanRisk" \
  --server-ip      "192.168.1.10" \
  --setup-mode     single \
  --backend-port   3001 \
  --frontend-port  80
```

---

## 4. Post-Install Verification

```bash
# PM2 prosesinin statusunu yoxlayın
pm2 status

# API-nin işlədiyini yoxlayın
curl -s http://localhost:3001/api/health | python3 -m json.tool

# Nginx konfiqurasiyasını yoxlayın
sudo nginx -t

# Verilənlər bazasına qoşulmağı yoxlayın
sudo -u postgres psql -d riskeez -c "SELECT COUNT(*) FROM users;"
```

---

## 5. İstifadəçi Rolları

| Rol | Azerbaycanca | İcazələr |
|---|---|---|
| **Admin** | Administrator | Bütün funksiyalar — istifadəçi idarəetməsi, parametrlər, bütün modullar |
| **Risk Manager** | Risk Meneceri | Risk reyestri, qiymətləndirmələr, nəzarət tədbirləri, hesabatlar, sənədlər |
| **Auditor** | Auditor | Bütün məlumatlara oxuma icazəsi; yeni qeydlər əlavə edə bilər |
| **Viewer / CEO** | Baxıcı / CEO | Yalnız İdarə Paneli — bütün digər bölmələr gizlədilir |

### Rol Məhdudiyyətləri (Viewer / CEO)

`Viewer` roluna sahib istifadəçilər yalnız **İdarə Panelini** (Dashboard) görür. Digər bütün bölmələr (Risk Reyestri, Qiymətləndirmələr, Nəzarət Tədbirləri, Sənədlər, Hesabatlar, Parametrlər) yan paneldən gizlədilir. Backend API həmçinin `403 Forbidden` qaytarır.

### Yeni İstifadəçi Əlavə Etmək

**Parametrlər → İstifadəçilər və İcazələr** bölməsindən yeni istifadəçi əlavə edin. Email ünvanı, ad, rol seçin və müvəqqəti şifrə təyin edin.

---

## 6. Problemlərin Həlli

### Sistem işə düşmür

```bash
# PM2 loglarına baxın
pm2 logs riskeez-api --lines 50

# Nginx loglarına baxın
sudo tail -50 /var/log/nginx/error.log

# Verilənlər bazası əlaqəsini yoxlayın
sudo -u postgres psql -c "\l"
```

### Şifrəni sıfırlamaq

```bash
cd /var/www/riskeez/backend
npm run admin:reset-password
```

### Port artıq istifadədədir

```bash
# 3001 portunu hansı prosesin istifadə etdiyini tapın
sudo lsof -i :3001

# Portu azad etmək üçün prosesi dayandırın
pm2 stop riskeez-api
```

### Nginx 502 Bad Gateway

```bash
# Backend API işləyirmi?
pm2 status riskeez-api

# Backend işləmirsə — yenidən başladın
pm2 restart riskeez-api

# Nginx konfiqurasiyasını yenidən yükləyin
sudo systemctl reload nginx
```

### Verilənlər bazası bağlantı xətası

```bash
# PostgreSQL işləyirmi?
sudo systemctl status postgresql

# İşləmirsə — başladın
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Proqramın adı dəyişmir

Proqramın adını **Parametrlər → Təşkilat** bölməsindən dəyişə bilərsiniz. Dəyişiklik dərhal bütün istifadəçilər üçün qüvvəyə minir (brauzer yeniləndikdən sonra).

---

## 7. Faydalı Əmrlər

```bash
# API loglarına baxmaq
pm2 logs riskeez-api

# API-ni yenidən başlatmaq
pm2 restart riskeez-api

# API-ni dayandırmaq
pm2 stop riskeez-api

# PM2 statusu
pm2 status

# Nginx yenidən yükləmək
sudo systemctl reload nginx

# Nginx yenidən başlatmaq
sudo systemctl restart nginx

# PostgreSQL statusu
sudo systemctl status postgresql

# Quraşdırmanı yenidən işə salmaq (idempotent)
sudo bash /var/www/riskeez/setup.sh

# Sistem yeniləmələri
cd /var/www/riskeez && npm install && npm run build
cd /var/www/riskeez/backend && npm install
pm2 restart riskeez-api
```

---

## 8. Yeni Xüsusiyyətlər

### İdarə Paneli Filtrləri

İdarə panelinin yuxarı hissəsindəki filtrlər bütün göstəriciləri dərhal yeniləyir:

| Filtr | Seçimlər |
|---|---|
| **Zaman Aralığı** | Bütün vaxt / Son 7 gün / Son 30 gün / Son 90 gün / Bu il |
| **Status Filtri** | Bütün statuslar / Açıq risklər / Həll olunan / Həll olunmayan / Gecikmiş |

### Şöbə Sahəsi (Department)

Risk əlavə edərkən və ya redaktə edərkən **Şöbə** sahəsini doldurun. İdarə panelinin alt hissəsindəki **"Şöbə üzrə risklər"** cədvəli hər şöbə üzrə risk statistikasını göstərir:
- Ümumi risklər
- Həll olunan / həll olunmayan risklər
- Kritik risklər
- Gecikmiş risklər

Cədvəldəki hər şöbəyə klikləmək Risk Reyestrini həmin şöbə üzrə filtrləyir.

### Ciddilik üzrə Top 5 Risk

İdarə panelindəki **"Ciddilik üzrə top 5 risk"** cədvəli riskləri aşağıdakı ardıcıllıqla göstərir:
1. Kritik → Yüksək → Orta → Aşağı
2. Eyni səviyyədə: bal (yüksəkdən aşağıya)
3. Eyni balda: son tarix (yaxın tarixdən uzaq tarixə)

Cədvəldə: Risk adı, Şöbə, Sahib, Bal, Status, Son tarix, Səviyyə göstərilir.

### Vaxt Üzrə Müqayisə Qrafiki

İdarə panelinin alt hissəsindəki **"Risklərin vaxt üzrə müqayisəsi"** bölməsi riskləri müxtəlif dövrlərdə müqayisə etməyə imkan verir.

#### Qruplaşdırma seçimləri:

| Seçim | Açıqlama |
|---|---|
| Günlük | Hər gün ayrı sütun/nöqtə |
| Həftəlik | ISO həftə nömrəsi üzrə |
| Aylıq | Yanvar, Fevral və s. |
| Rüblük | Q1, Q2, Q3, Q4 |
| İllik | Hər il ayrı sütun |

#### Tarix aralığı presetləri:

| Preset | Standart qruplaşdırma |
|---|---|
| Son 7 gün | Günlük |
| Son 30 gün | Günlük |
| Son 90 gün | Həftəlik |
| Bu ay | Günlük |
| Bu il | Aylıq |
| Xüsusi tarix | Seçilmiş qruplaşdırma |

#### Grafik növləri:
- **Xətt qrafiki** — yaradılan/həll olunan/həll olunmayan risklərin tendensiyası
- **Sütun qrafiki** — müqayisəli analiz
- **Cədvəl** — bütün göstəricilərlə detallı görünüş

#### Seriyalar (rəng düymələri ilə aktivləşdirilir):
Yaradılan · Həll olunan · Həll olunmayan · Kritik · Yüksək · Orta · Aşağı · Gecikmiş

#### Filtrləmə:
Tarix aralığı, Qruplaşdırma, Şöbə, Səviyyə, Status, Məsul şəxs sahələri üzrə filtrləmək mümkündür.

#### CSV ixracı:
"CSV ixrac et" düyməsi bütün cədvəl məlumatlarını yükləyir (cəmi sətri daxil).

#### Naviqasiya:
- **Cədvəl sətrinə klik** → Risk reyestri həmin dövrə görə filtrləyir
- **Kritik sayına klik** → Risk reyestri o dövr + Kritik filtrli açılır

### API: Vaxt üzrə seriya

```
GET /api/dashboard/time-series?from=2025-01-01&to=2025-12-31&groupBy=month
```

**Parametrlər:**

| Parametr | Dəyərlər | Açıqlama |
|---|---|---|
| `from` | YYYY-MM-DD | Başlanğıc tarixi |
| `to` | YYYY-MM-DD | Son tarixi |
| `groupBy` | day\|week\|month\|quarter\|year | Qruplaşdırma |
| `department` | mətn | Şöbə filtri |
| `severity` | critical\|high\|medium\|low | Səviyyə filtri |
| `status` | open\|resolved\|unresolved | Status filtri |
| `owner` | mətn | Məsul şəxs filtri (qismən uyğunlaşma) |

**Nümunə cavab:**
```json
{
  "groupBy": "month",
  "from": "2025-01-01",
  "to": "2025-12-31",
  "series": [
    {
      "period": "2025-01",
      "label": "Yanvar 2025",
      "createdRisks": 8,
      "resolvedRisks": 3,
      "unresolvedRisks": 5,
      "criticalRisks": 1,
      "highRisks": 3,
      "mediumRisks": 3,
      "lowRisks": 1,
      "overdueRisks": 2,
      "changePercent": 12.5
    }
  ]
}
```

Boş dövrlər sıfır dəyərlərlə qaytarılır (qrafiklər düzgün göstərilməsi üçün).

### Risk Xəritəsi (5×5 Matris)

İdarə panelindəki **"Risk xəritəsi"** bölməsi riskləri Ehtimal × Təsir matrisində vizual olaraq göstərir.

#### Matrisin quruluşu

- **Y oxu (şaquli):** Ehtimal — 1 (çox aşağı) → 5 (çox yüksək), yuxarıdan aşağıya
- **X oxu (üfüqi):** Təsir — 1 (minimal) → 5 (kritik), soldan sağa
- **Bal:** `Ehtimal × Təsir` (1–25)

#### Ciddilik səviyyələri

| Bal | Səviyyə | Rəng |
|---|---|---|
| 16–25 | Kritik | Tünd qırmızı/burgundy |
| 10–15 | Yüksək | Narıncı |
| 5–9 | Orta | Sarı/kəhrəba |
| 1–4 | Aşağı | Yaşıl |

#### Hücrə görünüşü

- **Risk var:** Həmin hücrə rənglənir və risklərin sayı göstərilir
- **Risk yoxdur:** Hücrə solğun rəngdə göstərilir, əvəzinə bal rəqəmi çıxır

#### Klikləyərək naviqasiya (Risk Xəritəsi)

Matrisin istənilən hücrəsinə klikləmək Risk Reyestri səhifəsini **həmin ehtimal və təsir qiymətləri ilə filtrəyir**:

```
Hücrəyə klik → Risk Reyestri: likelihood=X, impact=Y
```

#### API

`GET /api/dashboard/summary` cavabında `riskMap[]` massivi əlavə edilib:

```json
{
  "riskMap": [
    { "likelihood": 3, "impact": 5, "score": 15, "severity": "high", "count": 4 },
    { "likelihood": 5, "impact": 5, "score": 25, "severity": "critical", "count": 2 }
  ]
}
```

Yalnız risk olan hücrələr qaytarılır; boş hücrələr frontend tərəfindən hesablanır.

### İdarə Paneli Layout Sırası

İdarə panelinin bölmələri aşağıdakı ardıcıllıqla göstərilir:

1. **KPI kartları** — Ümumi / Açıq / Kritik / Gecikmiş / Həll olunan
2. **Filtr paneli** — Zaman aralığı + Status filtri
3. **Vaxt üzrə müqayisə qrafiki** — Trend analizi (xətt/sütun/cədvəl)
4. **Risk xəritəsi + AI Paneli** — Yan-yana layout (Risk Map solda, AI+mini qrafiklər sağda)
5. **Ciddilik üzrə Top 5 Risk** — Tam en ilə cədvəl
6. **Şöbə üzrə risklər** — Tam en ilə cədvəl (şöbə məlumatı varsa)

### Klikləyərək Naviqasiya

İdarə panelindəki bütün statistika kartları kliklenebildir:

| Element | Risk Reyestrindəki Filtr |
|---|---|
| Kritik kart | Kritik səviyyəli risklər |
| Yüksək kart | Yüksək səviyyəli risklər |
| Açıq kart | Açıq statuslu risklər |
| Həll olunan kart | Azaldılmış/bağlı risklər |
| Həll olunmayan kart | Açıq/icradakı risklər |
| Gecikmiş kart | Son tarixi keçmiş risklər |
| Şöbə cədvəli sətri | Həmin şöbənin riskləri |
| Risk xəritəsi hücrəsi | Həmin Ehtimal × Təsir qiymətli risklər |

---

## 9. Risk Qiymətləndirmə Sistemi

### Xülasə

Platforma **kateqoriya əsaslı risk qiymətləndirməsi** modulu ilə təchiz olunmuşdur. 10 kateqoriya üzrə 170+ Azərbaycanca sual bankı mövcuddur. Qiymətləndirmə sihirbazı istifadəçini 6 addımla aparır.

### Qiymətləndirmə Addımları

| Addım | Ad | Məzmun |
|---|---|---|
| 1 | Əhatə Dairəsi | Tam Təşkilat / Xüsusi Şöbə / Coğrafi Bölgə / Layihə |
| 2 | Metadata | Başlıq, Məsul Rəhbər |
| 3 | Kateqoriyalar | Audit kateqoriyalarını seçin (seçilməzsə hamısı) |
| 4 | Suallar | Seçilmiş kateqoriya üzrə suallar |
| 5 | Önizləmə | Risk boşluqlarının ilkin nəticəsi |
| 6 | Tamamlandı | Reyestrə yazılan risklər, yekun ball |

### Cavab Seçimləri

| Cavab | Risk Balı | İzah |
|---|---|---|
| **Bəli** | 0 | Uyğun — risk yoxdur |
| **Qismən** | 2 | Qismən uyğun — orta risk |
| **Xeyr** | 4 | Uyğunsuz — tam risk |
| **N/A** | Xaric | Hesablamaya daxil edilmir |

### Bal Hesablama Formulu

```
Risk % = Σ(Cavab Balı × Çəki) / Σ(4 × Çəki) × 100
```

| Risk % | Səviyyə |
|---|---|
| 0–25% | Aşağı |
| 26–50% | Orta |
| 51–75% | Yüksək |
| 76–100% | Kritik |

### Sual Kateqoriyaları

| Kateqoriya | Sual Sayı |
|---|---|
| İT və Kibertəhlükəsizlik | 25 |
| Uyğunluq və Tənzimləmə | 20 |
| Məlumatların Məxfiliyi | 20 |
| Fiziki Təhlükəsizlik | 15 |
| Əməliyyat Riski | 15 |
| Maliyyə Riski | 15 |
| Satıcı/Üçüncü Tərəf | 15 |
| İnsan Resursları | 15 |
| Biznesin Davamlılığı | 15 |
| Reputasiya Riski | 15 |
| **Cəmi** | **170** |

### Risk İnteqrasiyası

Qiymətləndirmə tamamlandıqda kateqoriya üzrə uyğunsuzluq **25%** həddini keçirsə, sistem avtomatik olaraq müvafiq risklər yaradır və **Risk Reyestrinə** əlavə edir.

### API

```
GET  /api/assessments/categories
GET  /api/assessments/questions?categories=it_cybersecurity,compliance
POST /api/assessments/:id/complete
POST /api/assessments/:id/report
```

---

## 10. Git ilə Deployment

Bu bölmə kodun **developer maşınından GitHub-a** necə push ediləcəyini, **Ubuntu serverlərdə** (test və prod) necə qurulacağını və sonraki yeniləmələrin necə aparılacağını izah edir.

---

### Branch strategiyası

```
main     ──►  Prod server   (istehsal mühiti)
develop  ──►  Test server   (sınaq mühiti)
```

- Bütün yeni dəyişikliklər əvvəlcə `develop` branch-ına push edilir → Test serverdə yoxlanılır
- Test keçdikdən sonra `develop` → `main`-ə merge edilir → Prod serverə deploy edilir

---

### DEV MAŞIN: GitHub-a push etmək

#### İlk dəfə (yalnız bir dəfə)

```bash
# 1. Repo-nu klonlayın (əgər hələ klonlanmayıbsa)
git clone https://github.com/madxpathfinder/Riskeez.git /var/www/riskeez
cd /var/www/riskeez

# 2. develop branch-ını yaradın
git checkout -b develop
git push origin develop
```

#### Hər dəfə dəyişiklik etdikdən sonra

```bash
# 1. Hansı faylların dəyişdiyinə baxın
git status

# 2. Dəyişiklikləri stage-ə əlavə edin
git add .

# 3. Commit edin (mənalı mesaj yazın)
git commit -m "feat: yeni xüsusiyyətin qısa təsviri"

# 4. Develop branch-ına push edin
git push origin develop
```

> **Qeyd:** GitHub şifrə istəyirsə, hesab şifrəsini deyil, **Personal Access Token** istifadə edin.
> Token yaratmaq: GitHub → Settings → Developer settings → Personal access tokens → Generate new token → `repo` scope seçin.

#### Test keçdikdən sonra — Prod-a merge etmək

```bash
# main branch-a keçin
git checkout main

# develop-dan merge edin
git merge develop

# Prod-a push edin
git push origin main

# Geri develop-a qayıdın
git checkout develop
```

---

### TEST SERVER: İlk qurulum (yalnız bir dəfə)

Ubuntu serverinə SSH ilə qoşulun:

```bash
ssh user@test-server-ip
```

Sonra bu əmrləri icra edin:

```bash
# 1. Git quraşdırın (əgər yoxdursa)
sudo apt-get update && sudo apt-get install -y git

# 2. Repo-nu klonlayın
sudo git clone https://github.com/madxpathfinder/Riskeez.git /var/www/riskeez

# 3. develop branch-ına keçin
cd /var/www/riskeez
sudo git checkout develop

# 4. Setup skriptini işə salın (interaktiv sihirbaz başlayır)
sudo bash setup.sh
```

Sihirbaz soruşacaq:
- Admin adı, e-poçt, şifrə
- Təşkilat adı
- Serverin IP ünvanı
- Port nömrələri (standart: API=3001, Frontend=80)

Setup tamamlandıqdan sonra brauzerinizdə `http://test-server-ip` ünvanını açın.

---

### PROD SERVER: İlk qurulum (yalnız bir dəfə)

```bash
ssh user@prod-server-ip

# 1. Git quraşdırın
sudo apt-get update && sudo apt-get install -y git

# 2. Repo-nu klonlayın
sudo git clone https://github.com/madxpathfinder/Riskeez.git /var/www/riskeez

# 3. main branch-da olduğunuzu yoxlayın (standart olaraq main gəlir)
cd /var/www/riskeez
git branch   # → main

# 4. Setup skriptini işə salın
sudo bash setup.sh
```

---

### YENİLƏMƏ: Kod dəyişikliyini serverə çəkmək

İlk qurulumdan sonra hər yeniləmə üçün yalnız **deploy.sh** istifadə edin.

**Test serverdə:**
```bash
sudo bash /var/www/riskeez/deploy.sh --branch develop
```

**Prod serverdə:**
```bash
sudo bash /var/www/riskeez/deploy.sh --branch main
```

`deploy.sh` avtomatik olaraq aşağıdakıları edir:
1. `git pull` — ən son kodu çəkir
2. `npm ci` — asılılıqları quraşdırır
3. DB migrasiyalarını tətbiq edir
4. `npm run build` — frontend-i build edir
5. `pm2 restart` — API-ni yenidən başladır
6. `nginx reload` — Nginx-i yeniləyir

---

### Tam iş axını (workflow)

```
Developer maşın
      │
      │  git add . && git commit && git push origin develop
      ▼
   GitHub (develop branch)
      │
      │  sudo bash deploy.sh --branch develop
      ▼
   Test server  ──── yoxlama ────► Problemi yox?
                                         │
                              git checkout main
                              git merge develop
                              git push origin main
                                         │
                              sudo bash deploy.sh --branch main
                                         │
                                    Prod server
```

---

## 11. Deployment (package.sh)

### Paket yaratmaq

```bash
chmod +x package.sh
./package.sh
```

Bu əmr `dist/<AppName>-deploy.zip` adında bir deployment paketi yaradır. Məsələn: `dist/AsanRisk-deploy.zip`

#### Paketin məzmunu

| Daxil | Çıxarılmış |
|---|---|
| `src/` (frontend mənbə kodu) | `node_modules/` |
| `backend/src/` (API mənbə kodu) | `.git/` |
| `dist/` (build edilmiş frontend) | `.env` (gizli konfiqurasiyanı içərir) |
| `setup.sh` | `logs/` |
| `README.md` | Müvəqqəti fayllar |
| `ecosystem.config.cjs` | |
| `nginx.riskeez.conf` | |
| `backend/*.sql` (mirasiya faylları) | |
| `backend/.env.example` | |

### Başqa servera deploy etmək

```bash
# 1. Paketi köçürün
scp dist/AsanRisk-deploy.zip user@server:/tmp/

# 2. Serverə qoşulun
ssh user@server

# 3. Açın
unzip /tmp/AsanRisk-deploy.zip -d /var/www/riskeez

# 4. Quraşdırın
cd /var/www/riskeez
chmod +x setup.sh
sudo ./setup.sh
```

Setup.sh aşağıdakıları avtomatik edir:
- Node.js, PM2, PostgreSQL, Nginx quraşdırır
- Verilənlər bazasını yaradır
- Mirasiya fayllarını tətbiq edir
- 170 AZ sualı seed edir
- Admin istifadəçi yaradır
- Nginx konfigurasiyanı yazır
- PM2 prosesini başladır

---

## 12. Sessiya Təhlükəsizliyi

### 12 Saatlıq Avtomatik Çıxış

İstifadəçi sessiyası **12 saat** sonra avtomatik sona çatır.

| Mexanizm | Davranış |
|---|---|
| JWT müddəti | `expiresIn: "12h"` — server 12 saatdan köhnə tokenləri 401 ilə rədd edir |
| Frontend yoxlaması | Hər 5 dəqiqədə bir token yaşı yoxlanılır |
| Fokus yoxlaması | Brauzer pəncərəsi fokusa qayıtdıqda token yenidən yoxlanılır |
| 401 cavabı | API 401 qaytararsa, avtomatik çıxış + yönləndirmə |

Sessiya bitdikdə ekranda:
> **"Sessiya müddəti bitib. Zəhmət olmasa yenidən daxil olun."**

### Çıxış zamanı silinənlər

- `riskeez_jwt` (JWT token)
- `riskeez_current_user` (istifadəçi məlumatı)
- `riskeez_session` (sessiya)

---

## 13. URL Strukturu

Platforma **React Router** əsaslı təmiz URL-lərdən istifadə edir:

| URL | Səhifə |
|---|---|
| `/dashboard` | İdarə paneli |
| `/risks` | Risk reyestri |
| `/risks?severity=critical` | Yalnız kritik risklər |
| `/risks?department=IT` | IT şöbəsinin riskləri |
| `/risks?status=Open` | Açıq risklər |
| `/risks?likelihood=5&impact=5` | Risk xəritəsi hücrəsi |
| `/assessments` | Qiymətləndirmələr |
| `/assessments/new` | Yeni qiymətləndirmə |
| `/assessments/:id` | Qiymətləndirmə detalları |
| `/controls` | Nəzarət tədbirləri |
| `/documents` | Sənədlər |
| `/audit-logs` | Audit jurnalı |
| `/reports` | Hesabatlar |
| `/settings` | Parametrlər |
| `/security-events` | Hadisə ensiklopediyası |
| `/security-events/:eventId` | Xüsusi hadisə (məs. `/security-events/4624`) |
| `/securitylog/encyclopedia/event.aspx?eventid=4624` | Köhnə URL formatı (dəstəklənir) |

### Hadisə Ensiklopediyası

Windows Təhlükəsizlik Hadisə ID-ləri kataloqu:

```
/security-events/4624   — Uğurlu Giriş
/security-events/4625   — Uğursuz Giriş Cəhdi
/security-events/4740   — Hesab Kilidləndi
/security-events/4720   — Yeni İstifadəçi Yaradıldı
/security-events/7045   — Yeni Xidmət Quraşdırıldı
...
```

Axtarış, kateqoriya filtrası və ciddilik filtrası mövcuddur. Hər hadisə üçün:
- Hadisə adı (AZ)
- Təsvir
- Riskin mənası
- Tövsiyə olunan tədbirlər

---

## 14. Architecture



```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                     Nginx                               │
│   Static files: /var/www/riskeez/dist                   │
│   API proxy:    /api → localhost:3001                   │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Node.js / Express API                       │
│              PM2: riskeez-api                           │
│              Port: 3001                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  PostgreSQL                             │
│              Database: riskeez                          │
└─────────────────────────────────────────────────────────┘
```

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS v4  
**Backend:** Node.js + Express + TypeScript  
**Database:** PostgreSQL 15+  
**Process Manager:** PM2  
**Reverse Proxy:** Nginx  

---

*GRC Platform — Enterprise Risk Intelligence & Governance*
