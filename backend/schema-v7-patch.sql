-- schema-v7-patch.sql: Assessment question bank – schema + seed
-- Safe to re-run: ON CONFLICT ... DO UPDATE on all inserts

-- Extend assessment_questions table
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS category_key       TEXT;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS section            TEXT;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS options            JSONB;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS evidence_required  BOOLEAN DEFAULT false;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS recommended_evidence JSONB;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS risky_answers      JSONB;
ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS suggested_mitigation TEXT;

-- Category registry
CREATE TABLE IF NOT EXISTS assessment_question_categories (
  key         TEXT PRIMARY KEY,
  name_az     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER DEFAULT 0
);

INSERT INTO assessment_question_categories (key, name_az, name_en, description, sort_order) VALUES
  ('it_cybersecurity',  'İT və Kibertəhlükəsizlik', 'IT & Cybersecurity',  'Giriş nəzarəti, şəbəkə, yedəkləmə, yamaq idarəsi, hadisəyə cavab',       1),
  ('compliance',        'Uyğunluq və Tənzimləmə',  'Compliance & Regulatory', 'Qanunvericilik, audit, siyasətlər, hesabat öhdəlikləri',                2),
  ('data_privacy',      'Məlumatların Məxfiliyi',  'Data Privacy',        'Şəxsi məlumatların qorunması, GDPR, məlumat saxlama siyasəti',              3),
  ('physical_security', 'Fiziki Təhlükəsizlik',    'Physical Security',   'Binanın qorunması, server otağı, CCTV, ziyarətçi nəzarəti',                4),
  ('operational',       'Əməliyyat Riski',         'Operational Risk',    'Proseslərin sənədləşdirilməsi, dəyişiklik idarəetmə, insidentlər',          5),
  ('financial',         'Maliyyə Riski',            'Financial Risk',      'Maliyyə nəzarəti, audit, vəzifə ayrılığı, fırıldaqçılıq',                  6),
  ('vendor',            'Satıcı/Üçüncü Tərəf',     'Vendor / Third-Party','Satıcı qiymətləndirmə, müqavilə, SLA izləmə, konsantrasiya riski',          7),
  ('hr',                'İnsan Resursları',         'Human Resources',     'İşçi yoxlaması, icazə ləğvi, maarifləndirmə, NDA',                         8),
  ('business_continuity','Biznesin Davamlılığı',   'Business Continuity', 'BCP, RTO/RPO, fövqəladə vəziyyət planlaması, yedəkli infrastruktur',        9),
  ('reputational',      'Reputasiya Riski',         'Reputational Risk',   'Böhran kommunikasiya, media idarəsi, müştəri məmnuniyyəti',                10)
ON CONFLICT (key) DO UPDATE SET
  name_az     = EXCLUDED.name_az,
  name_en     = EXCLUDED.name_en,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- ──────────────────────────────────────────────────────────────────────────────
-- IT & CYBERSECURITY (25 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('it-01','it_cybersecurity','İT və Kibertəhlükəsizlik','Giriş Nəzarəti',
   'İstifadəçi hesabları rəsmi proses əsasında yaradılır və ləğv edilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'IAM proseduru hazırlayın; hesab yaradılması və ləğvi üçün ticketing sistemindən istifadə edin.',true),

  ('it-02','it_cybersecurity','İT və Kibertəhlükəsizlik','Giriş Nəzarəti',
   'Minimum imtiyaz (least-privilege) prinsipi tətbiq edilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Rol əsaslı giriş nəzarəti (RBAC) tətbiq edin; giriş hüquqlarını hər rübdə nəzərdən keçirin.',true),

  ('it-03','it_cybersecurity','İT və Kibertəhlükəsizlik','Şifrə Siyasəti',
   'Minimum 12 simvol şifrə tələb edilir?',
   4,'yes_no_partial_na',false,'["no"]',
   'Active Directory/Okta siyasətlərini yeniləyin; kompleks şifrə tələblərini aktiv edin.',true),

  ('it-04','it_cybersecurity','İT və Kibertəhlükəsizlik','Şifrə Siyasəti',
   'Standart şifrələr (default passwords) dərhal dəyişdirilir?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Onboarding prosesinə standart şifrə dəyişdirmə addımını əlavə edin.',true),

  ('it-05','it_cybersecurity','İT və Kibertəhlükəsizlik','Çoxfaktorlu Autentifikasiya',
   'İmtiyazlı hesablar (admin) üçün çoxfaktorlu autentifikasiya (MFA) aktiv edilmişdir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Bütün admin hesablarına MFA tətbiq edin; TOTP və ya hardware token istifadə edin.',true),

  ('it-06','it_cybersecurity','İT və Kibertəhlükəsizlik','Çoxfaktorlu Autentifikasiya',
   'Uzaqdan giriş (VPN, RDP) üçün MFA tələb edilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'VPN həllinə MFA inteqrasiyası edin; bütün uzaqdan giriş sessiyaları üçün MFA məcburi edin.',true),

  ('it-07','it_cybersecurity','İT və Kibertəhlükəsizlik','Şəbəkə Təhlükəsizliyi',
   'Şəbəkə seqmentasiyası (network segmentation) tətbiq edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'DMZ, iş stansiyaları və server şəbəkələrini ayırın; VLAN konfiqurasiyası edin.',true),

  ('it-08','it_cybersecurity','İT və Kibertəhlükəsizlik','Şəbəkə Təhlükəsizliyi',
   'Firewall qaydaları müntəzəm nəzərdən keçirilir?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Rüblük firewall audit keçirin; istifadəsiz qaydaları silin.',true),

  ('it-09','it_cybersecurity','İT və Kibertəhlükəsizlik','Şəbəkə Təhlükəsizliyi',
   'Müdaxilə aşkarlama/qarşısının alınması sistemi (IDS/IPS) mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Şəbəkə üzərində IDS/IPS həlləri (Snort, Suricata, ya da kommersiya analoqunu) tətbiq edin.',true),

  ('it-10','it_cybersecurity','İT və Kibertəhlükəsizlik','Yedəkləmə',
   'Kritik məlumatların yedəkləri müntəzəm alınır (ən az həftəlik)?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Avtomatlaşdırılmış yedəkləmə sistemi qurun; backup qrafiki icra jurnalını yoxlayın.',true),

  ('it-11','it_cybersecurity','İT və Kibertəhlükəsizlik','Yedəkləmə',
   'Yedəklərin bərpası mütəmadi sınaqdan keçirilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Hər rübdə restore testi keçirin; uğurlu/uğursuz nəticəni qeydə alın.',true),

  ('it-12','it_cybersecurity','İT və Kibertəhlükəsizlik','Yedəkləmə',
   'Yedəklər fiziki olaraq ayrı məkanda (off-site) saxlanılır?',
   4,'yes_no_partial_na',false,'["no"]',
   'Bulud (S3, Azure Blob) ya da fiziki off-site media istifadə edin; 3-2-1 strategiyasını tətbiq edin.',true),

  ('it-13','it_cybersecurity','İT və Kibertəhlükəsizlik','Yamaq İdarəsi',
   'Kritik yamaqlar (security patches) 30 gün ərzində tətbiq edilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Yamaq idarəetmə aləti (WSUS, Ansible, Intune) tətbiq edin; SLA-ya uyğun yamaq proseduru yaradın.',true),

  ('it-14','it_cybersecurity','İT və Kibertəhlükəsizlik','Yamaq İdarəsi',
   'Yamaq idarəetmə proseduru rəsmiləşdirilmişdir?',
   3,'yes_no_partial_na',true,'["no"]',
   'Yamaq idarəetmə siyasəti hazırlayın; test → onay → tətbiq mərhələlərini sənədləşdirin.',true),

  ('it-15','it_cybersecurity','İT və Kibertəhlükəsizlik','Hadisəyə Cavab',
   'Rəsmi kibertəhlükəsizlik hadisəsinə cavab planı mövcuddur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'IRP (Incident Response Plan) hazırlayın; rollar, eskalasiya addımları və bildiriş prosedurunu müəyyən edin.',true),

  ('it-16','it_cybersecurity','İT və Kibertəhlükəsizlik','Hadisəyə Cavab',
   'Hadisəyə cavab planı son 12 ayda sınaqdan keçirilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Tabletop məşqləri keçirin; nəticələri qeydə alın və planı müvafiq şəkildə yeniləyin.',true),

  ('it-17','it_cybersecurity','İT və Kibertəhlükəsizlik','Hadisəyə Cavab',
   'Kibertəhlükəsizlik hadisələri qeydə alınır, araşdırılır və bağlanır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'SIEM/Ticketing sistemi quraşdırın; hadisə həyat dövründə (qəbul, araşdırma, bağlanma) ardıcıl izləmə aparın.',true),

  ('it-18','it_cybersecurity','İT və Kibertəhlükəsizlik','Loglama',
   'Sistemlər və tətbiqlər üzrə mərkəzləşdirilmiş log toplanması aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'SIEM (Splunk, ELK, ya da oxşar) həllindən istifadə edin; bütün kritik sistemlər log göndərsin.',true),

  ('it-19','it_cybersecurity','İT və Kibertəhlükəsizlik','Loglama',
   'Loglar ən az 90 gün müddətinə saxlanılır?',
   3,'yes_no_partial_na',false,'["no"]',
   'Log retention siyasəti müəyyən edin; ən azı 90 gün saxlama (illik compliance tələb edirsə 1 il).',true),

  ('it-20','it_cybersecurity','İT və Kibertəhlükəsizlik','Məlumat Qorunması',
   'Həssas məlumatlar həm saxlandıqda, həm də ötürüldükdə şifrələnir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'AES-256 şifrələmə tətbiq edin; nəqliyyat qatında TLS 1.2+ istifadə edin; DLP həllinə baxın.',true),

  ('it-21','it_cybersecurity','İT və Kibertəhlükəsizlik','Məlumat Qorunması',
   'Məlumat itkisi qarşısının alınması (DLP) həlləri mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'DLP həlləri (Microsoft Purview, Symantec, Forcepoint) quraşdırın; həssas məlumat nümunələrini konfiqurasiya edin.',true),

  ('it-22','it_cybersecurity','İT və Kibertəhlükəsizlik','Maarifləndirmə',
   'İşçilər müntəzəm kibertəhlükəsizlik maarifləndirmə təlimlərindən keçirlər?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İllik kibertəhlükəsizlik təlimi keçirin; phishing simulasiyaları aparın; iştirakı qeydə alın.',true),

  ('it-23','it_cybersecurity','İT və Kibertəhlükəsizlik','Aktiv İdarəetmə',
   'IT aktivlərinin (hardware/software) inventarı müntəzəm yenilənir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'CMDB (Configuration Management Database) tətbiq edin; aktiv kəşfi avtomatlaşdırın.',true),

  ('it-24','it_cybersecurity','İT və Kibertəhlükəsizlik','Endpoint Qorunma',
   'Endpoint qorunma proqramı (antivirus/EDR) bütün cihazlara quraşdırılıb?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Bütün endpoint-lərdə EDR/antivirus tətbiq edin; mərkəzi idarə konsolundan izləyin.',true),

  ('it-25','it_cybersecurity','İT və Kibertəhlükəsizlik','Zəiflik İdarəsi',
   'Müntəzəm zəiflik skanlaması (vulnerability scanning) aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Nessus, Qualys ya da oxşar aləti tətbiq edin; aylıq skan aparın; kritik zəiflikləri prioritetlə bağlayın.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE & REGULATORY (20 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('comp-01','compliance','Uyğunluq və Tənzimləmə','Uyğunluq İdarəetmə',
   'Uyğunluq məsul şəxsi (Compliance Officer/Manager) təyin edilmişdir?',
   5,'yes_no_partial_na',true,'["no"]',
   'Uyğunluq məsul şəxsi vəzifəsini yaradın; məsuliyyət sahələrini rəsmiləşdirin.',true),

  ('comp-02','compliance','Uyğunluq və Tənzimləmə','Tənzimləyici Tələblər',
   'Tənzimləyici tələblər (qanunlar, standartlar) xəritəyə alınmış və izlənilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Tənzimləyici tələblər reyestri yaradın; dəyişikliklər üzrə izləmə mexanizmi qurun.',true),

  ('comp-03','compliance','Uyğunluq və Tənzimləmə','Daxili Siyasətlər',
   'Daxili siyasətlər ildə bir dəfə nəzərdən keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Siyasət nəzərdən keçirmə təqvimi hazırlayın; cavabdeh şəxslər müəyyən edin.',true),

  ('comp-04','compliance','Uyğunluq və Tənzimləmə','Uyğunsuzluq',
   'Uyğunsuzluq halları qeydə alınır və korrektiv tədbirlər görülür?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Uyğunsuzluq reyestri yaradın; hər hadisə üçün kök səbəb analizi və düzəldici tədbirləri sənədləşdirin.',true),

  ('comp-05','compliance','Uyğunluq və Tənzimləmə','Maarifləndirmə',
   'İşçilər uyğunluq tələbləri üzrə müntəzəm maarifləndirmədən keçirlər?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İllik uyğunluq təlimi proqramı hazırlayın; iştirak sertifikatlarını saxlayın.',true),

  ('comp-06','compliance','Uyğunluq və Tənzimləmə','Lisenziya/İcazə',
   'Lisenziya və icazə tələbləri vaxtında yerinə yetirilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Lisenziya/icazə son tarix izləmə reyestri qurun; 60/30/14 gün öncə xəbərdarlıq sistemi tətbiq edin.',true),

  ('comp-07','compliance','Uyğunluq və Tənzimləmə','Müqavilə Uyğunluğu',
   'Müqavilələr uyğunluq nöqteyi-nəzərindən nəzərdən keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Hüquq departamenti ilə müqavilə nəzərdən keçirmə proseduru yaradın; uyğunluq yoxlama siyahısı hazırlayın.',true),

  ('comp-08','compliance','Uyğunluq və Tənzimləmə','Audit',
   'Daxili uyğunluq auditi müntəzəm aparılır?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'İllik daxili uyğunluq audit planı hazırlayın; müstəqil audit qrupu qurun ya da kənar audiitordan istifadə edin.',true),

  ('comp-09','compliance','Uyğunluq və Tənzimləmə','Şikayət İdarəetmə',
   'Rəsmi şikayət idarəetmə prosesi mövcuddur?',
   3,'yes_no_partial_na',false,'["no"]',
   'Şikayət qəbul, araşdırma və cavab vermə üçün rəsmi proses sənədləşdirin; KPI müəyyən edin.',true),

  ('comp-10','compliance','Uyğunluq və Tənzimləmə','Sanksiya Uyğunluğu',
   'Müştəri/tərəfdaş sanksiya siyahısı yoxlaması aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Sanksiya siyahısı yoxlama alətlərini (OFAC, UN, EU) inteqrasiya edin; onboarding prosesində avtomatlaşdırın.',true),

  ('comp-11','compliance','Uyğunluq və Tənzimləmə','Daxili Nəzarət',
   'Proseslər üzrə daxili nəzarət mexanizmləri (key controls) müəyyən edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Əsas riskli prosesler üçün nəzarət tədbirləri xəritəsini (RACI) hazırlayın; nəzarətin effektivliyini sınaqdan keçirin.',true),

  ('comp-12','compliance','Uyğunluq və Tənzimləmə','Etika',
   'İşçilərin etika qaydalarına uyğunluğu izlənilir?',
   3,'yes_no_partial_na',false,'["no"]',
   'Davranış kodeksi hazırlayın; etika xətti (ethics hotline) qurun; şikayətlərə konfidensial cavab proseduru tətbiq edin.',true),

  ('comp-13','compliance','Uyğunluq və Tənzimləmə','Risk Qiymətləndirmə',
   'Uyğunluq risklərinin qiymətləndirilməsi müntəzəm aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İllik uyğunluq risk qiymətləndirməsi keçirin; yüksək riskli saheler üçün korrektiv plan hazırlayın.',true),

  ('comp-14','compliance','Uyğunluq və Tənzimləmə','Hesabat',
   'Tənzimləyici hesabat öhdəlikləri vaxtında yerinə yetirilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Hesabat təqvimi yaradın; cavabdeh şəxslər və ehtiyat şəxslər müəyyən edin; son tarixi xatırladan sistem qurun.',true),

  ('comp-15','compliance','Uyğunluq və Tənzimləmə','Qanunvericilik İzləmə',
   'Qanunvericilik dəyişikliklərini izləyən sistem mövcuddur?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Hüquq məsləhətçisi ilə qanunvericilik izləmə mexanizmi qurun; rüblük dəyişiklik nəzərdən keçirmə keçirin.',true),

  ('comp-16','compliance','Uyğunluq və Tənzimləmə','Üçüncü Tərəf',
   'Üçüncü tərəflərin uyğunluq statusu yoxlanılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Üçüncü tərəf uyğunluq anketi hazırlayın; uyğunsuzluq halları üçün müqavilə şərtlərini müəyyən edin.',true),

  ('comp-17','compliance','Uyğunluq və Tənzimləmə','Sənəd İdarəetmə',
   'Sənəd idarəetmə sistemi (versiyalandırma, arxivləmə) mövcuddur?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Sənəd idarəetmə sistemi (SharePoint, Confluence, ya da oxşar) tətbiq edin; saxlama müddəti siyasəti müəyyən edin.',true),

  ('comp-18','compliance','Uyğunluq və Tənzimləmə','Korporativ İdarəetmə',
   'Korporativ idarəetmə (governance) strukturu mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İdarə heyəti komitəsi, vəzifəli şəxslərin məsuliyyəti və hesabatlılıq çərçivəsini rəsmiləşdirin.',true),

  ('comp-19','compliance','Uyğunluq və Tənzimləmə','Uğursuzluq Bildirişi',
   'Uyğunluq uğursuzluqları üst rəhbərliyə vaxtında bildirilir?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Eskalasiya matrisası hazırlayın; kritik uyğunsuzluqlar üçün bildiriş müddəti müəyyən edin.',true),

  ('comp-20','compliance','Uyğunluq və Tənzimləmə','Kənar Audit',
   'Müstəqil (kənar) uyğunluq auditi keçirilir?',
   4,'yes_no_partial_na',true,'["no"]',
   'Mütəxəssis kənar audit şirkəti ilə razılaşın; ildə bir dəfə müstəqil qiymətləndirmə keçirin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- DATA PRIVACY (20 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('priv-01','data_privacy','Məlumatların Məxfiliyi','Hüquqi Əsas',
   'Şəxsi məlumatların emalının hüquqi əsası (razılıq, müqavilə, qanun və s.) sənədləşdirilib?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Hər emal fəaliyyəti üçün hüquqi əsasları müəyyən edin; ROPA (Record of Processing Activities) hazırlayın.',true),

  ('priv-02','data_privacy','Məlumatların Məxfiliyi','Saxlama Siyasəti',
   'Məlumat saxlama siyasəti mövcuddur və tətbiq olunur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Məlumat kateqoriyaları üzrə saxlama müddəti cədvəli hazırlayın; avtomatik silmə mexanizmi qurun.',true),

  ('priv-03','data_privacy','Məlumatların Məxfiliyi','İnsident Bildirişi',
   'Məxfilik insidenti bildiriş proseduru mövcuddur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Məxfilik insidenti cavab planı hazırlayın; tənzimləyici orqana bildiriş müddəti (72 saat GDPR) müəyyən edin.',true),

  ('priv-04','data_privacy','Məlumatların Məxfiliyi','Subyekt Hüquqları',
   'Data subyektlərinin hüquqlarını (silinmə, portabillik, düzəliş) yerinə yetirmək üçün proses var?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'DSR (Data Subject Request) proseduru hazırlayın; 30 günlük cavab vermə müddəti üçün axın qurun.',true),

  ('priv-05','data_privacy','Məlumatların Məxfiliyi','Giriş Nəzarəti',
   'Şəxsi məlumatlara giriş hüquqları müntəzəm nəzərdən keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Hər rübdə giriş hüquqları auditi keçirin; lazımsız girişi dərhal ləğv edin.',true),

  ('priv-06','data_privacy','Məlumatların Məxfiliyi','Şifrələmə',
   'Şəxsi məlumatlar saxlandıqda və ötürüldükdə şifrələnir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Verilənlər bazasına (TDE) və nəqliyyat qatına (TLS) şifrələmə tətbiq edin.',true),

  ('priv-07','data_privacy','Məlumatların Məxfiliyi','DPIA',
   'Yeni proseslər üçün Məxfilik Təsir Qiymətləndirməsi (DPIA/PIA) keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Yüksək risk emalı üçün DPIA metodologiyası hazırlayın; nəticələri layihə sənədlərinə daxil edin.',true),

  ('priv-08','data_privacy','Məlumatların Məxfiliyi','Maarifləndirmə',
   'İşçilər məxfilik tələbləri üzrə maarifləndirmə alırlar?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Məxfilik maarifləndirmə modulunu işçi onboarding prosesinə əlavə edin; illik xatırlatma keçirin.',true),

  ('priv-09','data_privacy','Məlumatların Məxfiliyi','Fiziki İmha',
   'Həssas sənəd/medianın fiziki imhası üçün prosedur var?',
   3,'yes_no_partial_na',false,'["no"]',
   'Çap materiallar üçün shredding, məlumat daşıyıcıları üçün degaussing/zədələmə proseduru tətbiq edin.',true),

  ('priv-10','data_privacy','Məlumatların Məxfiliyi','Məlumat Xəritəsi',
   'Şəxsi məlumat axın sxemi/məlumat xəritəsi (data map) mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Bütün məlumat mənbələrini, emal addımlarını və xarici paylaşım nöqtələrini xəritəyə alın.',true),

  ('priv-11','data_privacy','Məlumatların Məxfiliyi','Beynəlxalq Ötürmə',
   'Şəxsi məlumatların xarici ölkələrə ötürülməsi qaydaları müəyyən edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'SCCs (Standart Müqavilə Maddələri) ya da adekvatlıq qərarı əsasında xarici ötürmə çərçivəsi qurun.',true),

  ('priv-12','data_privacy','Məlumatların Məxfiliyi','Uşaq Məlumatları',
   'Uşaq məlumatlarının qorunması üçün xüsusi tədbirlər var?',
   3,'yes_no_partial_na',false,'["no"]',
   '18 yaşdan kiçiklər üçün yaşı doğrulama və valideyn razılığı mexanizmi tətbiq edin.',true),

  ('priv-13','data_privacy','Məlumatların Məxfiliyi','Məxfilik Bildirişi',
   'İstifadəçilər məlumatlarının emalı barədə açıq şəkildə məlumatlandırılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Gizlilik Siyasəti (Privacy Notice) sənədi hazırlayın; əlçatan formada yerləşdirin; müntəzəm yeniləyin.',true),

  ('priv-14','data_privacy','Məlumatların Məxfiliyi','Pozuntu Aşkarlanma',
   'Məlumat pozuntusunun aşkarlanması üçün texniki mexanizm var?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'DLP, SIEM, anomaliya aşkarlama sistemlərini inteqrasiya edin; alert qaydaları konfigurasiya edin.',true),

  ('priv-15','data_privacy','Məlumatların Məxfiliyi','DPO',
   'Məlumat Qorunması Məsul Şəxsi (DPO) təyin edilmişdir?',
   3,'yes_no_partial_na',false,'["no"]',
   'DPO vəzifəsini yaradın (xüsusən GDPR tətbiq olunan hallarda məcburidir); fəaliyyət çərçivəsini rəsmiləşdirin.',true),

  ('priv-16','data_privacy','Məlumatların Məxfiliyi','Minimum Toplama',
   'Şəxsi məlumatlar yalnız lazımi həddə (data minimisation) toplanır?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Toplanılan məlumat sahələrini nəzərdən keçirin; lazımsız sahələri silin; toplama üçün hüquqi əsas təmin edin.',true),

  ('priv-17','data_privacy','Məlumatların Məxfiliyi','Audit Jurnalı',
   'Verilənlər bazasına giriş audit jurnalı (audit log) saxlanılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'DB audit logging (Postgres audit, Oracle Audit Vault) aktivləşdirin; 12 ay saxlayın.',true),

  ('priv-18','data_privacy','Məlumatların Məxfiliyi','Üçüncü Tərəf Emalı',
   'Üçüncü tərəf məlumat emal edənlərlə DPA (Məlumat Emal Müqaviləsi) imzalanmışdır?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Bütün məlumat emal edənlərlə DPA bağlayın; GDPR Art. 28 tələblərinə uyğunluğu yoxlayın.',true),

  ('priv-19','data_privacy','Məlumatların Məxfiliyi','Pseudonimləşdirmə',
   'Analitik məqsədlər üçün məlumatlar anonimləşdirilir/pseudonimləşdirilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Analitik verilənlər bazaları üçün PII maskası/tokenizasiyası tətbiq edin.',true),

  ('priv-20','data_privacy','Məlumatların Məxfiliyi','Tənzimləyici Uyğunluq İzləmə',
   'Məxfilik tənzimləyici tələblərindəki dəyişikliklər izlənilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Məxfilik hüququ izləmə xidmətindən (IAPP, TrustArc) istifadə edin; rüblük nəzərdən keçirmə keçirin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- PHYSICAL SECURITY (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('phys-01','physical_security','Fiziki Təhlükəsizlik','Giriş Nəzarəti',
   'Binaya fiziki giriş nəzarət sistemi (kart, pin, biometrik) ilə idarə olunur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Elektron giriş nəzarət sistemi quraşdırın; bütün giriş/çıxışları qeydə alın.',true),

  ('phys-02','physical_security','Fiziki Təhlükəsizlik','Monitorinq',
   'CCTV kamera sistemi quraşdırılmış və qeydlər mühafizə olunur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Bütün kritik sahələri (giriş, server otağı, anbarlıq) CCTV ilə əhatə edin; qeydləri 30 gün saxlayın.',true),

  ('phys-03','physical_security','Fiziki Təhlükəsizlik','Ziyarətçi İdarəetmə',
   'Ziyarətçi girişi qeydiyyata alınır və ziyarətçilər müşayiət edilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Ziyarətçi qeydiyyat proseduru hazırlayın; ziyarətçi nişanlarından istifadə edin; müşayiət etmə tələb edin.',true),

  ('phys-04','physical_security','Fiziki Təhlükəsizlik','Server Otağı',
   'Server otağı kilidli saxlanılır və yalnız səlahiyyətli şəxslər girişə icazəlidir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Server otağına giriş siyahısını kiçildin; biyometrik kilit tətbiq edin; giriş loglarını nəzərdən keçirin.',true),

  ('phys-05','physical_security','Fiziki Təhlükəsizlik','Server Otağı',
   'Server otağında temperatur/nəmişlik monitorinqi aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Mühit monitorinq sensoru quraşdırın; temperatur həddi keçildikdə avtomatik xəbərdarlıq qurun.',true),

  ('phys-06','physical_security','Fiziki Təhlükəsizlik','Giriş Nəzarəti',
   'İş saatlarından kənar ofis girişi ayrıca nəzarət altındadır?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'İş saatlarından sonra giriş üçün ayrıca icazə sistemi tətbiq edin; girişlər barədə bildiriş göndərin.',true),

  ('phys-07','physical_security','Fiziki Təhlükəsizlik','Yanğın Təhlükəsizliyi',
   'Yanğın söndürücülər quraşdırılmış, sertifikatlaşdırılmış və müntəzəm yoxlanılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Yanğın söndürücüləri sertifikatlaşdırılmış xidmət şirkəti tərəfindən illik texniki xidmətdən keçirin.',true),

  ('phys-08','physical_security','Fiziki Təhlükəsizlik','Elektrik Təminatı',
   'Kritik sistemlər üçün fasiləsiz elektrik təchizatı (UPS/generator) mövcuddur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Server infrastrukturu üçün UPS quraşdırın; generator test cədvəli hazırlayın; yük hesablamasını yeniləyin.',true),

  ('phys-09','physical_security','Fiziki Təhlükəsizlik','Məlumat Daşıyıcısı',
   'Çıxarıla bilən məlumat daşıyıcıları (USB, DVD) istifadəsi idarə olunur?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Endpoint idarəetmə ilə icazəsiz USB bloklaması tətbiq edin; korporativ şifrəli USB-lərdən istifadə edin.',true),

  ('phys-10','physical_security','Fiziki Təhlükəsizlik','Çap Materialları',
   'Həssas çap materialları idarə edilir (təhlükəsiz çap, anında götürmə)?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Pull-printing tətbiq edin; həssas sənədlər üçün şifrəli çap funksiyasından istifadə edin.',true),

  ('phys-11','physical_security','Fiziki Təhlükəsizlik','Şəbəkə İnfrastrukturu',
   'Şəbəkə texniki avadanlığı (patch panel, şalter) kilidli kabinetlərdə saxlanılır?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Bütün şəbəkə avadanlığını kilidli 19" rəflərdə yerləşdirin; port istifadəsini sənədləşdirin.',true),

  ('phys-12','physical_security','Fiziki Təhlükəsizlik','Kompüter Kilidi',
   'İşçilər masa başından ayrıldıqda kompüter avtomatik kilidlənir (5-15 dəq)?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'GPO/MDM ilə ekran kilidi politikası tətbiq edin; 10 dəqiqəlik fasilə sonra kilidlənməni məcburi edin.',true),

  ('phys-13','physical_security','Fiziki Təhlükəsizlik','Clean Desk',
   'Həssas sənəd və məlumatların masa üzərindən gizlədilməsi siyasəti (clean desk) tətbiq olunur?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Clean desk siyasəti hazırlayın; müntəzəm ofis yoxlamasi aparın; qeydlər saxlayın.',true),

  ('phys-14','physical_security','Fiziki Təhlükəsizlik','Çox Faktorlu Fiziki Giriş',
   'Yüksək risk zonalarına (server otağı, maliyyə bölməsi) çox faktorlu fiziki giriş tətbiq edilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Kritik zonalar üçün kart + PIN və ya biometrik giriş tətbiq edin.',true),

  ('phys-15','physical_security','Fiziki Təhlükəsizlik','Bina Girişi Məhdudiyyəti',
   'İşçilərin binadaxili hərəkət icazələri (area access) rollarına görə məhdudlaşdırılır?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Sahə əsaslı giriş nəzarəti həyata keçirin; işçilərin giriş siyahısını rollarla sinxronizə edin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- OPERATIONAL RISK (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('op-01','operational','Əməliyyat Riski','Proses Sənədləşdirmə',
   'Kritik əməliyyat prosesləri sənədləşdirilmişdir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Kritik proses siyahısı hazırlayın; hər birini sənədləşdirin; mütəmadi yeniləyin.',true),

  ('op-02','operational','Əməliyyat Riski','İnsident İzləmə',
   'Əməliyyat insidentləri qeydə alınır, araşdırılır və bağlanır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İnsident idarəetmə sistemi (ITSM/helpdesk) tətbiq edin; kök səbəb analizi proseduru qurun.',true),

  ('op-03','operational','Əməliyyat Riski','Risk Sahibliyi',
   'Hər risk üçün aydın risk sahibi (risk owner) müəyyən edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Risk reyestrindəki hər riskə sahib atayın; risk sahiblərinin məsuliyyət çərçivəsini sənədləşdirin.',true),

  ('op-04','operational','Əməliyyat Riski','Dəyişiklik İdarəetmə',
   'İT və əməliyyat dəyişiklikləri üçün rəsmi dəyişiklik idarəetmə prosesi var?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'CAB (Change Advisory Board) qurun; dəyişiklik növlərini (standard, normal, emergency) müəyyən edin.',true),

  ('op-05','operational','Əməliyyat Riski','Satıcı Riski',
   'Kritik satıcı/tədarükçü risklərini idarə etmək üçün proses var?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Kritik satıcı siyahısı hazırlayın; hər biri üçün risk qiymətləndirməsi keçirin.',true),

  ('op-06','operational','Əməliyyat Riski','SLA İzləmə',
   'Daxili və xarici SLA-ların yerinə yetirilməsi izlənilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'SLA dashboard hazırlayın; pozulmalar üçün eskalasiya proseduru müəyyən edin.',true),

  ('op-07','operational','Əməliyyat Riski','Daxili Qaydalar',
   'Əməliyyat daxili qaydalar rəsmi şəkildə razılaşdırılmış və kommunikasiya edilmişdir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'İşçi əlçatanlığı olan qaydalar portalı qurun; yeniləmələr barədə işçiləri məlumatlandırın.',true),

  ('op-08','operational','Əməliyyat Riski','Budcə Hesabatı',
   'Əməliyyat xərcləri budcəyə uyğun izlənilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Aylıq büdcə-faktiki müqayisə hesabatları hazırlayın; kənarlaşmalar üçün eskalasiya proseduru qurun.',true),

  ('op-09','operational','Əməliyyat Riski','Əvəzetmə Planı',
   'Əsas funksional vəzifələr üçün əvəzetmə (backup person) planları mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Kritik rollar üçün əvəzetmə matrisi hazırlayın; cross-training proqramı tətbiq edin.',true),

  ('op-10','operational','Əməliyyat Riski','KPI İzləmə',
   'Proseslərin effektivliyini ölçən KPI-lar müəyyən edilmişdir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'SMART KPI-lar müəyyən edin; aylıq/rüblük hesabat çərçivəsi qurun.',true),

  ('op-11','operational','Əməliyyat Riski','Müştəri Şikayəti',
   'Müştəri şikayətlərini idarə etmə prosesi var?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Şikayət qeydiyyat sistemi tətbiq edin; cavab vermə müddəti müəyyən edin; kök səbəb analizi keçirin.',true),

  ('op-12','operational','Əməliyyat Riski','Proses Standartlaşdırma',
   'Əsas əməliyyat prosesləri standartlaşdırılmış metodologiyaya (ISO, ITIL, LEAN) uyğundur?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Uyğun metodologiya seçin; prosesləri standart çərçivəyə uyğun sənədləşdirin.',true),

  ('op-13','operational','Əməliyyat Riski','Təkmilləşdirmə',
   'Proses təkmilləşdirmə üçün daimi mexanizm (retrospektiv, kaizen) var?',
   3,'yes_no_partial_na',false,'["no"]',
   'Aylıq prosesi nəzərdən keçirmə məşqləri/retrospektivlər keçirin; cavab vermə əməliyyatları sənədləşdirin.',true),

  ('op-14','operational','Əməliyyat Riski','Risk Qiymətləndirmə',
   'Əməliyyat risklərinin qiymətləndirilməsi müntəzəm aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Rüblük əməliyyat risk qiymətləndirməsi keçirin; nəticələri risk reyestrində yeniləyin.',true),

  ('op-15','operational','Əməliyyat Riski','İnsan Səhvi Azaldılması',
   'Əməliyyatlarda insan səhvini azaltmaq üçün avtomatlaşdırma/kontrol tədbirləri var?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Yüksək risk əməliyyatları üçün checklist/automation tətbiq edin; düz-yanlış yoxlama mexanizmləri qurun.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- FINANCIAL RISK (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('fin-01','financial','Maliyyə Riski','Maliyyə Nəzarəti',
   'Maliyyə nəzarət mexanizmləri (internal controls) rəsmi sənədləşdirilib?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Maliyyə nəzarət matrisi hazırlayın; hər nəzarət üçün sahibi, tezliyi və sənəd növünü müəyyən edin.',true),

  ('fin-02','financial','Maliyyə Riski','Maliyyə Hesabatı',
   'Maliyyə hesabatları müntəzəm (aylıq/rüblük) hazırlanır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Aylıq maliyyə hesabat cədvəli müəyyən edin; komitə iclaslarda nəzərdən keçirin.',true),

  ('fin-03','financial','Maliyyə Riski','Vəzifə Ayrılığı',
   'Maliyyə əməliyyatlarında vəzifə ayrılığı (segregation of duties) prinsipinə əməl edilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Təsdiqləmə, icra, qeydiyyat funksiyalarını müxtəlif şəxslər arasında bölüşdürün.',true),

  ('fin-04','financial','Maliyyə Riski','Daxili Audit',
   'Maliyyə əməliyyatları üzrə daxili audit müntəzəm keçirilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'İllik daxili audit planı hazırlayın; müstəqil daxili audit departamenti qurun ya da kənar auditoru təyin edin.',true),

  ('fin-05','financial','Maliyyə Riski','Büdcə Planlaması',
   'İllik büdcə formal proseslə planlanır və təsdiq olunur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Rəsmi büdcə planlaması proseduru hazırlayın; rəhbərliyin/İdarə heyətinin təsdiq sənədi saxlayın.',true),

  ('fin-06','financial','Maliyyə Riski','Fırıldaqçılıq',
   'Maliyyə fırıldaqçılığının aşkarlanması mexanizmləri (fraud detection) mövcuddur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Anomaliya aşkarlama sistemi tətbiq edin; fırıldaqçılığa dair davranış limitləri müəyyən edin; bildiriş kanalı qurun.',true),

  ('fin-07','financial','Maliyyə Riski','Maliyyə Limitləri',
   'Əməliyyat səviyyəsinə görə maliyyə təsdiqləmə limitləri müəyyən edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Müxtəlif məbləğlər üçün imza səlahiyyətləri matrisi hazırlayın; limiti keçən əməliyyatlar üçün ikiqat imza tələb edin.',true),

  ('fin-08','financial','Maliyyə Riski','Maliyyə Risk Qiymətləndirməsi',
   'Maliyyə riskləri (likvidlik, kredit, valyuta) müntəzəm qiymətləndirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Maliyyə risk qiymətləndirmə metodologiyası hazırlayın; rüblük nəzərdən keçirmə keçirin.',true),

  ('fin-09','financial','Maliyyə Riski','İkiqat İmza',
   'Müəyyən həcmdən artıq ödəniş əməliyyatları ikiqat imza (dual authorization) tələb edir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Bankla dual-authorization limiti razılaşdırın; internet banking sistemlərindəki 4-eye prinsipi aktivləşdirin.',true),

  ('fin-10','financial','Maliyyə Riski','Kassa',
   'Kassa əməliyyatları (nağd pul) qeydə alınır və müntəzəm yoxlanılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Gündəlik kassa bağlanışı tətbiq edin; müstəqil kassa yoxlaması keçirin; nağd əməliyyatları minimuma enirin.',true),

  ('fin-11','financial','Maliyyə Riski','Aktiv İnventar',
   'Şirkətin maliyyə aktivlərinin inventarı aparılır?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'ERP sistemindəki aktiv modulunu aktivləşdirin; illik fiziki inventar sayımı keçirin.',true),

  ('fin-12','financial','Maliyyə Riski','Mühasibat Standartları',
   'Mühasibat uçotu müvafiq standartlara (IFRS/MUTS) uyğun aparılır?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Mühasibat uçotu siyasəti hazırlayın; dövri müstəqil yoxlamadan keçirin.',true),

  ('fin-13','financial','Maliyyə Riski','Kənar Audit',
   'Müstəqil (kənar) maliyyə auditi keçirilir?',
   5,'yes_no_partial_na',true,'["no"]',
   'İldə bir dəfə lisenziyalı audit şirkəti ilə maliyyə auditini keçirin; hesabatı İdarə heyətinə təqdim edin.',true),

  ('fin-14','financial','Maliyyə Riski','Korrupsiya Qarşısının Alınması',
   'Rüşvətxorluq/korrupsiya qarşısının alınması tədbirləri (AML/ABC) tətbiq olunur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'AML/ABC siyasəti hazırlayın; riskli əməliyyatlar üçün due diligence proseduru qurun; KYC tətbiq edin.',true),

  ('fin-15','financial','Maliyyə Riski','İnvestisiya Qərarları',
   'İnvestisiya qərarları rəsmi qiymətləndirmə proseduruna (NPV, ROI, risk analizi) əsasən qəbul edilir?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'İnvestisiya komitəsi qurun; qiymətləndirmə metodologiyası müəyyən edin; qərar sənədlərini arxivləyin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- VENDOR / THIRD-PARTY (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('vend-01','vendor','Satıcı/Üçüncü Tərəf','Satıcı Siyahısı',
   'Kritik satıcıların reyestri saxlanılır?',
   4,'yes_no_partial_na',true,'["no"]',
   'Satıcı reyestri yaradın; kritiklik dərəcəsinə görə kateqoriyalaşdırın (kritik, vacib, standart).',true),

  ('vend-02','vendor','Satıcı/Üçüncü Tərəf','Müqavilə Öncəsi',
   'Yeni satıcılar müqavilə bağlanmadan əvvəl risk qiymətləndirməsindən keçirilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Satıcı due diligence anketi hazırlayın; maliyyə, texniki, uyğunluq yoxlamasını əhatə edin.',true),

  ('vend-03','vendor','Satıcı/Üçüncü Tərəf','Müqavilə Şərtləri',
   'Satıcı müqavilələrinə məlumat qorunması, uyğunluq və SLA maddələri daxil edilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Müqavilə şablon yoxlama siyahısı hazırlayın; standart məxfilik, SLA, ayrılma maddələrini şablona daxil edin.',true),

  ('vend-04','vendor','Satıcı/Üçüncü Tərəf','SLA İzləmə',
   'Satıcıların SLA icrasını izləmək üçün formalaşdırılmış proses var?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Satıcı SLA izləmə dashboard hazırlayın; aylıq hesabat formatı müəyyən edin.',true),

  ('vend-05','vendor','Satıcı/Üçüncü Tərəf','Dövri Nəzərdən Keçirmə',
   'Kritik satıcılar ildə bir dəfə formal nəzərdən keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İllik satıcı qiymətləndirmə proqramı hazırlayın; nəticələri satıcı ilə paylaşın.',true),

  ('vend-06','vendor','Satıcı/Üçüncü Tərəf','Alternativ Satıcılar',
   'Kritik satıcılar üçün alternativ (backup) satıcılar müəyyən edilmişdir?',
   4,'yes_no_partial_na',false,'["no"]',
   'Hər kritik satıcı üçün alternativ satıcı siyahısı hazırlayın; alternativ aktivasiya planı qurun.',true),

  ('vend-07','vendor','Satıcı/Üçüncü Tərəf','Məlumat Qorunması',
   'Satıcıların məxfilik/məlumat qorunması uyğunluğu yoxlanılır?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Satıcı uyğunluq yoxlama anketi hazırlayın; sertifikat tələb edin (ISO 27001, SOC2).',true),

  ('vend-08','vendor','Satıcı/Üçüncü Tərəf','İnsident Bildirişi',
   'Satıcı insidentlərinin bildirişi üçün müqavilə maddəsi var?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Satıcı müqavilələrinə 48/72 saatlıq insident bildiriş maddəsi daxil edin.',true),

  ('vend-09','vendor','Satıcı/Üçüncü Tərəf','Konsantrasiya Riski',
   'Satıcı konsantrasiya riski (bir satıcıya həddindən artıq asılılıq) idarə edilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Satıcı konsantrasiya analizi keçirin; bir satıcıya asılılıq həddini müəyyən edin.',true),

  ('vend-10','vendor','Satıcı/Üçüncü Tərəf','Proqram Kodu Təhlükəsizliyi',
   'Üçüncü tərəf proqram/kod komponentlərinin təhlükəsizliyi yoxlanılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'SCA (Software Composition Analysis) aləti tətbiq edin; SBOM (Software Bill of Materials) hazırlayın.',true),

  ('vend-11','vendor','Satıcı/Üçüncü Tərəf','Onboarding',
   'Satıcı onboarding proseduru rəsmiləşdirilib?',
   3,'yes_no_partial_na',false,'["no"]',
   'Satıcı onboarding yoxlama siyahısı hazırlayın; müqavilə, yoxlama, sistemə giriş addımlarını müəyyən edin.',true),

  ('vend-12','vendor','Satıcı/Üçüncü Tərəf','Ayrılma Proseduru',
   'Satıcı əlaqəsinin bitirilməsi üçün rəsmi çıxış (offboarding) proseduru var?',
   3,'yes_no_partial_na',false,'["no"]',
   'Satıcı offboarding proseduru hazırlayın; sistemlərə girişin ləğvini, məlumat geri alınmasını əhatə edin.',true),

  ('vend-13','vendor','Satıcı/Üçüncü Tərəf','Fövqəladə Plan',
   'Kritik satıcıların hər biri üçün fövqəladə/fasilə planı (contingency) mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Kritik satıcı fasilə ssenarisi hazırlayın; aktivasiya şərtlərini müəyyən edin.',true),

  ('vend-14','vendor','Satıcı/Üçüncü Tərəf','Performans Göstəriciləri',
   'Satıcı performans göstəriciləri (KPI) müəyyən edilib izlənilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Satıcı scorecard hazırlayın; rüblük performans nəzərdən keçirmə görüşü keçirin.',true),

  ('vend-15','vendor','Satıcı/Üçüncü Tərəf','Məlumat Paylaşımı',
   'Satıcılarla məlumat paylaşımı idarə olunur (NDA, DPA)?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Hər satıcı ilə NDA/DPA imzalayın; paylaşılan məlumat növlərini sənədləşdirin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- HUMAN RESOURCES (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('hr-01','hr','İnsan Resursları','İşçi Qəbulu',
   'İşçi qəbulu zamanı keçmiş/arxa plan yoxlaması (background check) aparılır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Vəzifə növünə uyğun background check siyasəti hazırlayın; həssas vəzifələr üçün genişləndirilmiş yoxlama tətbiq edin.',true),

  ('hr-02','hr','İnsan Resursları','HR Siyasətləri',
   'HR siyasətləri (davranış, iştirak, məzuniyyət, intizam) işçilərə çatdırılmışdır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İşçi el kitabı (employee handbook) hazırlayın; işçilər imzalayaraq tanışlıq təsdiq etsin.',true),

  ('hr-03','hr','İnsan Resursları','Maarifləndirmə',
   'İşçilər daxili qaydalar, məxfilik və etika barədə maarifləndirildiyini imzalayaraq təsdiqləyirlər?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İllik maarifləndirmə-imza proseduru tətbiq edin; iştirak jurnalı saxlayın.',true),

  ('hr-04','hr','İnsan Resursları','İşdən Ayrılma',
   'İşdən ayrılma (offboarding) proseduru mövcuddur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Offboarding yoxlama siyahısı hazırlayın: giriş ləğvi, avadanlıq geri alması, hesab bağlanması.',true),

  ('hr-05','hr','İnsan Resursları','Performans',
   'Müntəzəm performans qiymətləndirməsi (ildə ən az bir dəfə) keçirilir?',
   3,'yes_no_partial_na',false,'["no"]',
   'Formal performans qiymətləndirmə proseduru hazırlayın; nəticələri HR sistemdə qeydə alın.',true),

  ('hr-06','hr','İnsan Resursları','Münaqişə İdarəetmə',
   'İş münasibətlərindəki münaqişələr formal proses ilə idarə edilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Münaqişə həll etmə proseduru hazırlayın; mediasiya mexanizmi qurun.',true),

  ('hr-07','hr','İnsan Resursları','Giriş Ləğvi',
   'İşdən ayrılan işçilərin bütün sistemlərə girişi dərhal (24 saat ərzində) ləğv edilir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'HR sistemi ilə IAM inteqrasiyası qurun; ayrılma bildirişi gəldikdə avtomatik deprovisioning aktiv olsun.',true),

  ('hr-08','hr','İnsan Resursları','Gizlilik Razılaşması',
   'Həssas vəzifələrdə çalışanlarla NDA (məxfilik razılaşması) imzalanır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'NDA şablonu hüquq bölməsi ilə hazırlayın; onboarding prosesinin bir hissəsi edin.',true),

  ('hr-09','hr','İnsan Resursları','Şikayət Mexanizmi',
   'İşçilər üçün anonim şikayət bildirişi kanalı (hotline, e-poçt) mövcuddur?',
   3,'yes_no_partial_na',false,'["no"]',
   'Anonim şikayət kanalı qurun; şikayət prosedurunu işçilərə çatdırın; cavab müddəti müəyyən edin.',true),

  ('hr-10','hr','İnsan Resursları','İşçi Sayı',
   'Rəsmi işçi siyahısı (headcount register) müntəzəm yenilənir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'HR sistemi ilə əlaqəli işçi siyahısını müntəzəm senkronizə edin; aylıq yoxlama keçirin.',true),

  ('hr-11','hr','İnsan Resursları','Müvəqqəti İşçilər',
   'Müvəqqəti/podratçı işçilərin giriş hüquqları müntəzəm nəzərdən keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Kontraktor giriş siyasəti müəyyən edin; müqavilə bitdikdə avtomatik giriş ləğvi tətbiq edin.',true),

  ('hr-12','hr','İnsan Resursları','Rotasiya',
   'Kritik vəzifələrdə müntəzəm iş rotasiyası planlanmışdır?',
   3,'yes_no_partial_na',false,'["no"]',
   'Kritik funksiyalar üçün rotasiya cədvəli hazırlayın; knowledge transfer proseduru tətbiq edin.',true),

  ('hr-13','hr','İnsan Resursları','Əvəzetmə Planlaması',
   'Əsas işçilərin gedişi halında kadr əvəzetmə planı (succession plan) mövcuddur?',
   4,'yes_no_partial_na',true,'["no"]',
   'Kritik rollar üçün succession plan hazırlayın; potensial varisləri identifikasiya edin; inkişaf planı qurun.',true),

  ('hr-14','hr','İnsan Resursları','Uzaqdan İş',
   'Uzaqdan çalışma üçün kibertəhlükəsizlik qaydaları müəyyən edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Uzaqdan iş siyasəti hazırlayın: VPN tələbi, cihaz şifrələmə, icazəsiz şəbəkə yasağı.',true),

  ('hr-15','hr','İnsan Resursları','Dövri Təlimlər',
   'İşçilər üçün müntəzəm professional inkişaf/maarifləndirmə təlimləri keçirilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'İllik təlim planı hazırlayın; iştirakı sənədləşdirin; effektivliyini qiymətləndirin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- BUSINESS CONTINUITY (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('bc-01','business_continuity','Biznesin Davamlılığı','BCP',
   'Biznes davamlılığı planı (BCP) rəsmi sənədləşdirilib?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'BCP sənədini ISO 22301 çərçivəsinə uyğun hazırlayın; bütün kritik prosesləri əhatə edin.',true),

  ('bc-02','business_continuity','Biznesin Davamlılığı','BCP Testi',
   'BCP son 12 ayda tabletop/tam sınaqdan keçirilmişdir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'İllik BCP test proqramı hazırlayın; test nəticələri və dərslər çıxarılan hesabat hazırlayın.',true),

  ('bc-03','business_continuity','Biznesin Davamlılığı','Yedəkli İnfrastruktur',
   'Kritik sistemlər üçün yedəkli infrastruktur (redundancy) mövcuddur?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Kritik sistemlər üçün failover/HA konfiqurasiyası qurun; yedəkli komponentləri sınaqdan keçirin.',true),

  ('bc-04','business_continuity','Biznesin Davamlılığı','Alternativ İş Yeri',
   'Fövqəladə vəziyyətlər üçün alternativ iş yeri (remote/warm site) planlanmışdır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Alternativ iş yeri müqaviləsi bağlayın ya da uzaqdan iş strategiyasını sənədləşdirin.',true),

  ('bc-05','business_continuity','Biznesin Davamlılığı','RTO/RPO',
   'Kritik proseslər üçün bərpa müddəti (RTO) və məlumat itki həddi (RPO) müəyyən edilmişdir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'BIA (Business Impact Analysis) keçirin; hər kritik proses üçün RTO/RPO müəyyən edin; texniki həllər qurun.',true),

  ('bc-06','business_continuity','Biznesin Davamlılığı','BCP Məsul Şəxsi',
   'BCP məsul şəxsi (Business Continuity Manager) təyin edilmişdir?',
   4,'yes_no_partial_na',false,'["no"]',
   'BCP məsul şəxsi vəzifəsini müəyyən edin; məsuliyyət sahəsini sənədləşdirin.',true),

  ('bc-07','business_continuity','Biznesin Davamlılığı','Maarifləndirmə',
   'Bütün kritik işçilər BCP prosedurlarını bilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'BCP maarifləndirmə təlimi keçirin; kritik işçilər üçün rol kart hazırlayın.',true),

  ('bc-08','business_continuity','Biznesin Davamlılığı','Xarici Kommunikasiya',
   'Fövqəladə vəziyyətdə müştəri/tərəfdaşlarla xarici kommunikasiya proseduru var?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Xarici kommunikasiya planı hazırlayın; sözcü, mesaj şablonları, media cavab proseduru müəyyən edin.',true),

  ('bc-09','business_continuity','Biznesin Davamlılığı','Kritik Sistemlər',
   'Kritik sistemlər (IT, əməliyyat, kommunikasiya) identifikasiya edilib prioritetləndirilmişdir?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'BIA əsasında kritik sistem reyestri hazırlayın; bərpa prioritet sırasını müəyyən edin.',true),

  ('bc-10','business_continuity','Biznesin Davamlılığı','Avadanlıq Ehtiyatı',
   'Fövqəladə vəziyyət üçün ehtiyat avadanlıq (notebook, server, şəbəkə) hazır saxlanılır?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Ehtiyat avadanlıq inventarı hazırlayın; müntəzəm yoxlama keçirin; nəqliyyat planı hazırlayın.',true),

  ('bc-11','business_continuity','Biznesin Davamlılığı','Komponent Uğursuzluğu',
   'İnfrastruktur komponentlərinin uğursuzluğu ssenarilərinin planlaması aparılmışdır?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Uğursuzluq modu analizi (FMEA) keçirin; bərpa ssenarilərini sənədləşdirin.',true),

  ('bc-12','business_continuity','Biznesin Davamlılığı','Fövqəladə Məşqlər',
   'İllik fövqəladə vəziyyət məşqləri (emergency drills) keçirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'İllik fövqəladə məşq planı hazırlayın; yanğın, IT, BC fövqəladə ssenarilərini əhatə edin.',true),

  ('bc-13','business_continuity','Biznesin Davamlılığı','Bərpa Müddəti',
   'Hər kritik proses üçün maksimal məqbul fasilə müddəti müəyyən edilmişdir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'MTPD (Maximum Tolerable Period of Disruption) BIA əsasında müəyyən edin; RTO-nun MTPD-dən kiçik olmasını təmin edin.',true),

  ('bc-14','business_continuity','Biznesin Davamlılığı','Uzaq Məlumat Ehtiyatı',
   'Kritik məlumatlar coğrafi olaraq ayrı yerdə (geo-redundant) ehtiyat nüsxəsini saxlanılır?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Müxtəlif coğrafi məkanda yedəkləmə qurun; RPO tələbinə uyğun sinxronizasiya tezliyi seçin.',true),

  ('bc-15','business_continuity','Biznesin Davamlılığı','Əlaqə Sxemi',
   'Fövqəladə vəziyyət üçün əlaqə sxemi (call tree/escalation) mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Fövqəladə vəziyyət əlaqə sxemi hazırlayın; illik aktual yoxlama keçirin; hər işçiyə çatdırın.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;

-- ──────────────────────────────────────────────────────────────────────────────
-- REPUTATIONAL RISK (15 questions)
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO assessment_questions
  (id, category_key, category, section, text, weight, answer_type, evidence_required, risky_answers, suggested_mitigation, active)
VALUES
  ('rep-01','reputational','Reputasiya Riski','Böhran Kommunikasiyası',
   'Böhran kommunikasiya planı (Crisis Communication Plan) hazırlanmışdır?',
   5,'yes_no_partial_na',true,'["no","partial"]',
   'Böhran kommunikasiya planı hazırlayın; sözcü, mesaj kanalları, cavab müddəti müəyyən edin.',true),

  ('rep-02','reputational','Reputasiya Riski','Media İzləmə',
   'Şirkətin adının sosial media və mətbuatda izlənməsi sistemi var?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Media izləmə aləti (Google Alerts, Mention, Brandwatch) tətbiq edin; gündəlik monitorinq qurun.',true),

  ('rep-03','reputational','Reputasiya Riski','PR Strategiyası',
   'PR (ictimaiyyətlə əlaqə) strategiyası mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'PR strategiyası sənədi hazırlayın; media münasibətləri, sponsorluq, ictimai görünüş çərçivəsini müəyyən edin.',true),

  ('rep-04','reputational','Reputasiya Riski','Müştəri Şikayəti',
   'Müştəri şikayətlərinin idarəetmə prosesi mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Müştəri şikayət idarəetmə sistemi qurun; cavab müddəti, eskalasiya və bağlanma prosedurunu müəyyən edin.',true),

  ('rep-05','reputational','Reputasiya Riski','İctimai Mövqe',
   'Şirkətin ictimai mövqeyini müəyyən edən kommunikasiya siyasəti var?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Korporativ kommunikasiya siyasəti hazırlayın; həssas mövzular üçün cavab protokolunu müəyyən edin.',true),

  ('rep-06','reputational','Reputasiya Riski','Media Nümayəndəsi',
   'Media ilə əlaqə üçün rəsmi sözcü (spokesperson) təyin edilmişdir?',
   4,'yes_no_partial_na',false,'["no"]',
   'Sözcü vəzifəsini müəyyən edin; media məzuniyyəti (media training) keçirin; əvəzetmə planı hazırlayın.',true),

  ('rep-07','reputational','Reputasiya Riski','Sosial Media Siyasəti',
   'İşçilər üçün sosial media istifadə qaydaları (siyasəti) müəyyən edilmişdir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Sosial media siyasəti hazırlayın; icazəsiz korporativ məlumat paylaşımının nəticələrini göstərin.',true),

  ('rep-08','reputational','Reputasiya Riski','Onlayn Reytinq',
   'Şirkətin onlayn reytinqi (Google, platformalar) izlənilir?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'Reytinq izləmə prosesi qurun; neqativ rəylərə cavab vermə proseduru hazırlayın.',true),

  ('rep-09','reputational','Reputasiya Riski','Daxili Kommunikasiya',
   'Böhran zamanı işçilər üçün daxili kommunikasiya planı mövcuddur?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Daxili böhran kommunikasiya planı hazırlayın; işçilərə müntəzəm məlumat vermə proseduru müəyyən edin.',true),

  ('rep-10','reputational','Reputasiya Riski','Müştəri Məmnuniyyəti',
   'Müştəri məmnuniyyəti müntəzəm ölçülür?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'NPS/CSAT sorğu sistemi qurun; nəticələri rüblük nəzərdən keçirin; zəif sahələr üçün fəaliyyət planı hazırlayın.',true),

  ('rep-11','reputational','Reputasiya Riski','İşçi Davranışı',
   'İşçilərin şirkəti kənarda (konfrans, sosial media) müvafiq şəkildə təmsil etməsi üçün qaydalar var?',
   3,'yes_no_partial_na',false,'["no","partial"]',
   'İşçi səlahiyyət çərçivəsi hazırlayın; korporativ nümayəndəlik qaydalarını davranış kodeksinə daxil edin.',true),

  ('rep-12','reputational','Reputasiya Riski','Marka Dəyəri',
   'Şirkətin marka dəyərini ölçmə mexanizmi mövcuddur?',
   3,'yes_no_partial_na',false,'["no"]',
   'Marka ölçümü çərçivəsi hazırlayın; illik marka sorğusu keçirin; nəticələri strategiyaya daxil edin.',true),

  ('rep-13','reputational','Reputasiya Riski','Maraqlı Tərəflər',
   'Maraqlı tərəflər (investor, tərəfdaş, icma) ilə kommunikasiya planlaşdırılmışdır?',
   4,'yes_no_partial_na',false,'["no","partial"]',
   'Maraqlı tərəflər kommunikasiya matrisası hazırlayın; müntəzəm əlaqə cədvəli qurun.',true),

  ('rep-14','reputational','Reputasiya Riski','Reputasiya Risk Qiymətləndirilməsi',
   'Reputasiya riskləri müntəzəm qiymətləndirilir?',
   4,'yes_no_partial_na',true,'["no","partial"]',
   'Reputasiya risk qiymətləndirməsi metodologiyası hazırlayın; rüblük nəzərdən keçirmə keçirin.',true),

  ('rep-15','reputational','Reputasiya Riski','Böhran Məşqləri',
   'Böhran idarəetmə məşqləri müntəzəm keçirilir?',
   3,'yes_no_partial_na',false,'["no"]',
   'İllik böhran idarəetmə məşqi planı hazırlayın; tabletop ssenarilərini əhatə edin; nəticələri sənədləşdirin.',true)

ON CONFLICT (id) DO UPDATE SET
  category_key         = EXCLUDED.category_key,
  category             = EXCLUDED.category,
  section              = EXCLUDED.section,
  text                 = EXCLUDED.text,
  weight               = EXCLUDED.weight,
  answer_type          = EXCLUDED.answer_type,
  evidence_required    = EXCLUDED.evidence_required,
  risky_answers        = EXCLUDED.risky_answers,
  suggested_mitigation = EXCLUDED.suggested_mitigation,
  active               = EXCLUDED.active;
