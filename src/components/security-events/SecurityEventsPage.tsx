import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Key,
  Lock,
  Unlock,
  Cpu,
  Calendar,
  Network,
  FileSearch,
  Flame,
  ChevronRight,
  ChevronLeft,
  X,
  Info,
  AlertTriangle,
  AlertOctagon,
  Filter,
  BookOpen,
} from 'lucide-react';
import { Badge, Card, PageHeader } from '../common';

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = 'info' | 'warning' | 'critical';

interface SecurityEvent {
  id: number;
  name: string;
  description: string;
  riskMeaning: string;
  recommendedAction: string;
  severity: Severity;
  category: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: 4624,
    name: 'Uğurlu Giriş',
    description: 'İstifadəçi hesabı sisteminə uğurla daxil oldu. Bu hadisə hər uğurlu autentifikasiya cəhdini qeydə alır.',
    riskMeaning: 'Normal iş fəaliyyətidir, lakin qeyri-adi vaxtlarda və ya yerdən giriş lateral hərəkət və ya hesab ele keçirməni göstərə bilər.',
    recommendedAction: 'Giriş vaxtını, IP ünvanını və istifadəçi adını yoxlayın. Qeyri-adi coğrafi yerlərdən və ya saatlardan olan girişlərə xüsusi diqqət yetirin.',
    severity: 'info',
    category: 'Giriş/Çıxış',
  },
  {
    id: 4625,
    name: 'Uğursuz Giriş Cəhdi',
    description: 'İstifadəçi hesabına giriş cəhdi uğursuz oldu. Yanlış parol, kilidlənmiş hesab və ya digər autentifikasiya xətası baş verdi.',
    riskMeaning: 'Çoxsaylı uğursuz giriş cəhdləri brute-force hücumu, sızdırılmış etimadnamələr və ya icazəsiz giriş cəhdini göstərə bilər.',
    recommendedAction: 'Eyni hesaba qarşı bir neçə 4625 hadisəsini izləyin. Qısa müddət ərzində çoxlu uğursuz giriş varsa, hesabı müvəqqəti kilidləyin.',
    severity: 'warning',
    category: 'Giriş/Çıxış',
  },
  {
    id: 4634,
    name: 'Hesabdan Çıxış',
    description: 'İstifadəçi sessiyası başa çatdı və ya hesab sistemdən çıxış etdi. Sessiya sonlanmasını qeydə alır.',
    riskMeaning: 'Tez-tez baş verən qısa müddətli sessiyalar avtomatlaşdırılmış alətlərə işarə edə bilər. Gözlənilməyən çıxışlar zorla sessiyanı dayandırmanı göstərə bilər.',
    recommendedAction: '4624 ilə birlikdə seans müddətini təhlil edin. Qeyri-adi qısa sessiyaları araşdırın.',
    severity: 'info',
    category: 'Giriş/Çıxış',
  },
  {
    id: 4647,
    name: 'İstifadəçi tərəfindən Çıxış',
    description: 'İstifadəçi interaktiv şəkildə sistemdən çıxış etdi. Bu hadisə iş stansiyalarında və server masaüstü sessiyalarında qeydə alınır.',
    riskMeaning: 'Ümumiyyətlə normal iş fəaliyyətidir. Lakin gözlənilməz çıxışlar zorla sonlandırmanı və ya şübhəli davranışı göstərə bilər.',
    recommendedAction: 'Çalışma saatlarından kənar çıxışları izləyin. Kritik iş əməliyyatları zamanı baş verən çıxışlar xüsusən diqqəti çəkməlidir.',
    severity: 'info',
    category: 'Giriş/Çıxış',
  },
  {
    id: 4648,
    name: 'Açıq Etimadnamə ilə Giriş',
    description: 'Proses açıq etimadnamə göstərərək giriş cəhdi etdi. Bu, RunAs əmri ilə başladılan proses və ya alternativ etimadnamə istifadəsini göstərir.',
    riskMeaning: 'Kənar hücumçular tərəfindən lateral hərəkət üçün istifadə olunan əsas texnikadır. Sızdırılmış etimadnamə istifadəsini göstərə bilər.',
    recommendedAction: 'Açıq etimadnamə istifadəsini minimal saxlayın. Bu hadisənin baş verdiyi proses və etimadnamə mənşəyini araşdırın.',
    severity: 'warning',
    category: 'Giriş/Çıxış',
  },
  {
    id: 4672,
    name: 'Xüsusi İmtiyazlar Verildi',
    description: 'Yüksək səviyyəli imtiyazlar (SeDebugPrivilege, SeTcbPrivilege və s.) yeni giriş sessiyasına verildi.',
    riskMeaning: 'İmtiyaz yüksəltmə hücumlarını, şübhəli inzibatçı fəaliyyətini və ya zərərli proqram tərəfindən imtiyaz istifadəsini göstərə bilər.',
    recommendedAction: 'Yalnız təsdiqlənmiş administrator hesablarının bu hadisəni yaratdığını yoxlayın. Qeyri-adi imtiyaz istifadəsini dərhal araşdırın.',
    severity: 'warning',
    category: 'Giriş/Çıxış',
  },
  {
    id: 4688,
    name: 'Yeni Proses Yaradıldı',
    description: 'Sistemdə yeni bir proses başladıldı. Prosesi başladan proses, hədəf proses yolu və komanda sətiri arqumentləri qeydə alınır.',
    riskMeaning: 'Zərərli proqram, ransomware, kəşfiyyat skriptləri və ya istismar sonrası fəaliyyətlər bu hadisəni yaradır.',
    recommendedAction: 'PowerShell, cmd, wscript, cscript kimi interpretatorların həssas prosesləri işə salıb-salmadığını izləyin. Komanda sətiri arqumentlərini analiz edin.',
    severity: 'info',
    category: 'Proses',
  },
  {
    id: 4689,
    name: 'Proses Sonlandırıldı',
    description: 'Əvvəllər başladılmış proses normal şəkildə və ya zorla sonlandırıldı.',
    riskMeaning: 'Təhlükəsizlik alətlərinin (antivirus, EDR agentləri) zorla dayandırılması kritik xəbərdarlıqdır.',
    recommendedAction: '4688 ilə əlaqəli prosesin ömür müddətini izləyin. Qısa ömürlü proseslər əmr icrasına işarə edə bilər.',
    severity: 'info',
    category: 'Proses',
  },
  {
    id: 4698,
    name: 'Planlaşdırılmış Tapşırıq Yaradıldı',
    description: 'Windows Task Scheduler vasitəsilə yeni bir tapşırıq yaradıldı. Tapşırıq adı, icra yolu və tetikləyici məlumatları qeydə alınır.',
    riskMeaning: 'Zərərli proqramın davamlılıq mexanizmi olaraq çox istifadə olunan bir texnikadır. İcazəsiz planlaşdırılmış tapşırıqlar ciddi risk yaradır.',
    recommendedAction: 'Yaradılan tapşırığın yolunu, tetikləyicisini və yaradan hesabı yoxlayın. Şübhəli yollara (Temp, AppData) işarə edən tapşırıqları dərhal araşdırın.',
    severity: 'critical',
    category: 'Siyasət',
  },
  {
    id: 4702,
    name: 'Planlaşdırılmış Tapşırıq Yeniləndi',
    description: 'Mövcud planlaşdırılmış tapşırığın konfiqurasiyası dəyişdirildi.',
    riskMeaning: 'Mövcud tapşırığın dəyişdirilməsi, hücumçunun sistemi saxlamaq üçün artıq mövcud tapşırıqdan istifadə etdiyini göstərə bilər.',
    recommendedAction: 'Dəyişiklikləri edən hesabı və dəyişdirilən tapşırığın məzmununu yoxlayın. Əsas sistem tapşırıqlarında edilən dəyişiklikləri dərhal araşdırın.',
    severity: 'warning',
    category: 'Siyasət',
  },
  {
    id: 4720,
    name: 'İstifadəçi Hesabı Yaradıldı',
    description: 'Sistemdə yeni bir istifadəçi hesabı yaradıldı. Yeni hesabın adı və yaradan şəxsin məlumatları qeydə alınır.',
    riskMeaning: 'İcazəsiz hesab yaratma, arxa qapı hesabları və ya zərərli proqram tərəfindən gizli hesab yaratma bu hadisəni yaradır.',
    recommendedAction: 'Hesabı yaradan şəxsin səlahiyyətini yoxlayın. HR prosesi xaricindən yaradılan hesabları dərhal araşdırın.',
    severity: 'warning',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4722,
    name: 'İstifadəçi Hesabı Aktivləşdirildi',
    description: 'Əvvəllər deaktivləşdirilmiş istifadəçi hesabı yenidən aktivləşdirildi.',
    riskMeaning: 'Köhnə hesabların yenidən aktivləşdirilməsi keçmiş işçi hesablarından istifadə yolu ilə hücuma imkan yarada bilər.',
    recommendedAction: 'İT departamentinin aktivləşdirməni təsdiqləyib-etmədiyini yoxlayın. Uzun müddət istifadə olunmamış hesabların aktivləşdirilməsinə xüsusi diqqət yetirin.',
    severity: 'warning',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4723,
    name: 'Şifrə Dəyişdirmə Cəhdi',
    description: 'İstifadəçi öz parolunu dəyişdirməyə cəhd etdi. Cəhdin uğurlu və ya uğursuz olduğu qeydə alınır.',
    riskMeaning: 'Uğursuz dəyişdirmə cəhdləri brute-force hücumunu, uğurlu isə hesabın ele keçirildikdən sonra parolu dəyişdirməni göstərə bilər.',
    recommendedAction: 'Ardıcıl uğursuz cəhdlər var isə hesabı kilidləyin. Qeyri-adi vaxtlarda baş verən uğurlu dəyişiklikləri araşdırın.',
    severity: 'info',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4724,
    name: 'Şifrə Sıfırlama Cəhdi',
    description: 'Administrator başqa istifadəçinin parolunu sıfırlamağa cəhd etdi.',
    riskMeaning: 'İcazəsiz parol sıfırlama, hesabın ele keçirilməsi üçün ən asan üsullardan biridir.',
    recommendedAction: 'Sıfırlama edən şəxsin administrator səlahiyyətini təsdiqləyin. İT departamentindən kənar parol sıfırlamalarını dərhal araşdırın.',
    severity: 'warning',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4725,
    name: 'İstifadəçi Hesabı Deaktivləşdirildi',
    description: 'İstifadəçi hesabı deaktivləşdirildi və sistemə daxil ola bilməyəcək.',
    riskMeaning: 'Ümumiyyətlə normal IT prosesinin bir hissəsidir. Lakin özbaşına deaktivləşdirmə xidmət reddini (DoS) hücumunu göstərə bilər.',
    recommendedAction: 'Dəyişikliyin yetkili IT prosesi çərçivəsində edilib-edilmədiyini yoxlayın. Xüsusilə kritik xidmət hesablarında baş verən deaktivləşdirmələri araşdırın.',
    severity: 'info',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4726,
    name: 'İstifadəçi Hesabı Silindi',
    description: 'Sistemdən istifadəçi hesabı tamamilə silindi.',
    riskMeaning: 'Audit izlərini məhv etmək üçün hesabın silinməsi bir taktika ola bilər. İcazəsiz silinmə məlumat itkisinə yol aça bilər.',
    recommendedAction: 'Silmə əməliyyatını yerinə yetirən şəxsi müəyyən edin. HR offboarding prosesi xaricindən edilən silinmələri dərhal araşdırın.',
    severity: 'warning',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4728,
    name: 'Qlobal Qrupa Üzv Əlavə Edildi',
    description: 'İstifadəçi və ya kompüter domeninin qlobal qrupuna əlavə edildi.',
    riskMeaning: 'İcazəsiz qrup üzvlüyü əlavəsi imtiyaz yüksəltməyə yol aça bilər. Xüsusilə Domain Admins qrupuna əlavələr kritik riskdir.',
    recommendedAction: 'Qruba kim əlavə edildi və kim etdi suallarını yoxlayın. Yüksək imtiyazlı qruplara əlavələri dərhal araşdırın.',
    severity: 'critical',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4732,
    name: 'Lokal Qrupa Üzv Əlavə Edildi',
    description: 'Lokal təhlükəsizlik qrupuna yeni üzv əlavə edildi. Administrators, Remote Desktop Users kimi qruplar bu hadisəni yaradır.',
    riskMeaning: 'Lokal Administrators qrupuna edilən əlavələr hücumçuya o kompüterdə tam nəzarət verir.',
    recommendedAction: 'Yerli administrator qruplarına edilən bütün əlavələri araşdırın. Yalnız icazəli hesablar bu qruplarda olmalıdır.',
    severity: 'critical',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4740,
    name: 'İstifadəçi Hesabı Kilidləndi',
    description: 'Ardıcıl uğursuz giriş cəhdləri nəticəsində istifadəçi hesabı avtomatik kilidləndi.',
    riskMeaning: 'Çox sayda kilidlənmə brute-force hücumunu, parol spraying hücumunu və ya daxili zərərli fəaliyyəti göstərə bilər.',
    recommendedAction: 'Kilidlənmənin mənbəyini (workstation adı) müəyyən edin. Eyni anda bir neçə hesabın kilidlənməsi koordinasiyalı hücumu göstərə bilər.',
    severity: 'critical',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4756,
    name: 'Universal Qrupa Üzv Əlavə Edildi',
    description: 'Universal təhlükəsizlik qrupuna yeni üzv əlavə edildi. Bu qruplar bütün domen və güvən sahələrindən istifadəçiləri əhatə edə bilər.',
    riskMeaning: 'Universal qruplara əlavə edilmiş icazəsiz hesablar bir neçə domenə geniş giriş əldə edə bilər.',
    recommendedAction: 'Əlavənin icazəli IT dəyişiklik idarəetmə prosesi əsasında edilib-edilmədiyini yoxlayın.',
    severity: 'warning',
    category: 'Hesab İdarəetməsi',
  },
  {
    id: 4768,
    name: 'Kerberos Bilet Sorğusu (TGT)',
    description: 'Kerberos Authentication Ticket (TGT) sorğusu Domain Controller tərəfindən işləndi.',
    riskMeaning: 'Kerberoasting, AS-REP Roasting kimi hücumlar bu hadisəni yaradır. Qeyri-adi hesab adları (bilgisayar, xidmət hesabları) üçün TGT sorğuları şübhəlidir.',
    recommendedAction: 'İstifadəçi adlarını yoxlayın (mövcud olmayan hesablar üçün sorğular kəşfiyyata işarədir). Çox sayda TGT sorğusunu password spraying kimi dəyərləndirin.',
    severity: 'warning',
    category: 'Autentifikasiya',
  },
  {
    id: 4771,
    name: 'Kerberos Ön Autentifikasiya Uğursuz Oldu',
    description: 'Kerberos ön autentifikasiyası uğursuz oldu. Yanlış parol, vaxt uyğunsuzluğu və ya deaktivləşdirilmiş hesab bu hadisəni yaradır.',
    riskMeaning: 'Ardıcıl 4771 hadisələri parol brute-force cəhdini göstərir. AS-REP Roasting hücumlarında da istifadə olunur.',
    recommendedAction: 'Uğursuz sorğuların mənbə IP-sini müəyyən edin. Kısa müddətdə çoxlu 4771 hadisəsi varsa dərhal araşdırın.',
    severity: 'warning',
    category: 'Autentifikasiya',
  },
  {
    id: 4776,
    name: 'NTLM Autentifikasiya Cəhdi',
    description: 'Domain Controller NTLM protokolu ilə istifadəçi autentifikasiyasını yoxladı.',
    riskMeaning: 'NTLM köhnə və zəif bir protokoldur. Pass-the-Hash, NTLM Relay hücumları bu hadisəni yaradır.',
    recommendedAction: 'Mümkün olduqda NTLM-i deaktivləşdirin və Kerberos-a keçin. NTLM istifadəsini izləyin, xüsusilə admin hesabları üçün.',
    severity: 'warning',
    category: 'Autentifikasiya',
  },
  {
    id: 7045,
    name: 'Yeni Xidmət Quraşdırıldı',
    description: 'Sistemdə yeni bir Windows xidməti qeydiyyata alındı. Xidmət adı, ikili fayl yolu və başlanğıc növü qeydə alınır.',
    riskMeaning: 'Zərərli proqram, rootkit və hücumçular davamlılıq üçün xidmət olaraq qeydiyyata alınmaqdan geniş istifadə edirlər.',
    recommendedAction: 'Xidmətin ikili fayl yolunu və imzasını yoxlayın. Temp, AppData kimi müvəqqəti qovluqlarda yerləşən xidmətlər kritik risklər yaradır.',
    severity: 'critical',
    category: 'Sistem',
  },
  {
    id: 4663,
    name: 'Obyektə Daxil Olmaq Cəhdi',
    description: 'Fayl, qovluq, reyestr açarı və ya printer kimi obyektə daxil olmaq cəhdi baş verdi.',
    riskMeaning: 'Həssas məlumatlara icazəsiz giriş, məlumat oğurluğu cəhdləri və ya daxili təhdid fəaliyyəti bu hadisəni yaradır.',
    recommendedAction: 'Hansı resursa giriş əldə edilib, kim tərəfindən olduğunu müəyyən edin. Həssas məlumatlara olan girişlər üçün audit siyasəti aktivləşdirin.',
    severity: 'warning',
    category: 'Obyekt Girişi',
  },
  {
    id: 4670,
    name: 'Obyekt İcazələri Dəyişdirildi',
    description: 'Faylın, qovluğun və ya digər məlumat obyektinin giriş nəzarət siyahısı (ACL) dəyişdirildi.',
    riskMeaning: 'İcazəlrin dəyişdirilməsi hücumçunun giriş nəzarətini zəiflətmək üçün istifadə etdiyi bir üsuldur.',
    recommendedAction: 'Dəyişikliyin yetkili şəxs tərəfindən edilib-edilmədiyini yoxlayın. Kritik sistem fayllarında ACL dəyişikliklərini dərhal araşdırın.',
    severity: 'warning',
    category: 'Obyekt Girişi',
  },
  {
    id: 4946,
    name: 'Firewall İstisna Qaydası Əlavə Edildi',
    description: 'Windows Firewall-a yeni bir istisna qaydası əlavə edildi. Bu, müəyyən portlar üçün trafiki icazə verə bilər.',
    riskMeaning: 'Zərərli proqram öz C2 kommunikasiyası üçün Firewall-da deşik açmaq məqsədi ilə bu hadisəni yaradır.',
    recommendedAction: 'Yeni Firewall qaydasının detallarını (icazə verilən port, protokol, proqram) yoxlayın. İcazəsiz dəyişikliklər üçün şəbəkə izləmə sistemini aktivləşdirin.',
    severity: 'critical',
    category: 'Şəbəkə',
  },
  {
    id: 5140,
    name: 'Şəbəkə Paylaşımına Daxil Olundu',
    description: 'Şəbəkə paylaşım qovluğuna uzaqdan giriş baş verdi. Hansı paylaşıma kim tərəfindən daxil olunduğu qeydə alınır.',
    riskMeaning: 'Lateral hərəkət, məlumat oğurluğu, ransomware yayılması üçün şəbəkə paylaşımlarından geniş istifadə olunur.',
    recommendedAction: 'Həssas paylaşımlara giriş siyahısını minimuma endirin. IPC$ və ADMIN$ kimi inzibati paylaşımlara girişi ciddi şəkildə izləyin.',
    severity: 'warning',
    category: 'Şəbəkə',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORIES = Array.from(new Set(SECURITY_EVENTS.map(e => e.category))).sort();

const SEVERITY_LABELS: Record<Severity, string> = {
  info: 'Məlumat',
  warning: 'Xəbərdarlıq',
  critical: 'Kritik',
};

const SEVERITY_BADGE_COLORS: Record<Severity, string> = {
  info: 'blue',
  warning: 'yellow',
  critical: 'red',
};

const SEVERITY_BG: Record<Severity, string> = {
  info: 'bg-blue-50 border-blue-100',
  warning: 'bg-amber-50 border-amber-100',
  critical: 'bg-rose-50 border-rose-100',
};

const SEVERITY_ICON_COLOR: Record<Severity, string> = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  critical: 'text-rose-600',
};

const SEVERITY_TITLE_COLOR: Record<Severity, string> = {
  info: 'text-blue-700',
  warning: 'text-amber-700',
  critical: 'text-rose-700',
};

const CATEGORY_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'Giriş/Çıxış': LogIn,
  'Hesab İdarəetməsi': UserCheck,
  'Proses': Cpu,
  'Siyasət': Calendar,
  'Autentifikasiya': Key,
  'Sistem': Shield,
  'Obyekt Girişi': FileSearch,
  'Şəbəkə': Network,
};

function SeverityIcon({ severity, size = 16 }: { severity: Severity; size?: number }) {
  const cls = SEVERITY_ICON_COLOR[severity];
  if (severity === 'critical') return <AlertOctagon size={size} className={cls} />;
  if (severity === 'warning') return <AlertTriangle size={size} className={cls} />;
  return <Info size={size} className={cls} />;
}

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || BookOpen;
}

// ── EventCard ──────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: SecurityEvent;
  isSelected: boolean;
  onClick: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, isSelected, onClick }) => {
  const CategoryIcon = getCategoryIcon(event.category);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border transition-all duration-200 p-5 group hover:shadow-saas-md focus:outline-none focus:ring-2 focus:ring-accent/30
        ${isSelected
          ? 'border-accent bg-accent/5 shadow-saas-md ring-2 ring-accent/20'
          : 'border-slate-100 bg-white hover:border-accent/30'
        }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all
          ${isSelected ? 'bg-accent text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent'}`}>
          <CategoryIcon size={18} />
        </div>
        <SeverityIcon severity={event.severity} size={14} />
      </div>

      <div className="mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest
          ${isSelected ? 'text-accent' : 'text-slate-400 group-hover:text-accent/70'}`}>
          ID {event.id}
        </span>
        <h3 className={`text-sm font-black leading-tight mt-0.5 transition-colors
          ${isSelected ? 'text-accent' : 'text-slate-900 group-hover:text-accent'}`}>
          {event.name}
        </h3>
      </div>

      <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 mb-3">
        {event.description}
      </p>

      <div className="flex items-center justify-between">
        <Badge color={SEVERITY_BADGE_COLORS[event.severity] as any}>
          {SEVERITY_LABELS[event.severity]}
        </Badge>
        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
          {event.category}
        </span>
      </div>
    </button>
  );
};

// ── DetailPanel ────────────────────────────────────────────────────────────────

interface DetailPanelProps {
  event: SecurityEvent;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ event, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const CategoryIcon = getCategoryIcon(event.category);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [event.id]);

  return (
    <div
      ref={panelRef}
      className={`w-full rounded-[2rem] border shadow-saas-lg overflow-hidden ${SEVERITY_BG[event.severity]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-8 pb-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
            ${event.severity === 'critical' ? 'bg-rose-100 text-rose-600'
              : event.severity === 'warning' ? 'bg-amber-100 text-amber-600'
              : 'bg-blue-100 text-blue-600'}`}>
            <CategoryIcon size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-black uppercase tracking-widest ${SEVERITY_TITLE_COLOR[event.severity]}`}>
                Windows Hadisə ID: {event.id}
              </span>
              <Badge color={SEVERITY_BADGE_COLORS[event.severity] as any}>
                {SEVERITY_LABELS[event.severity]}
              </Badge>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{event.name}</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 inline-block">
              {event.category}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white/60 hover:text-slate-700 transition-all shrink-0"
          aria-label="Bağla"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="px-8 pb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Description */}
        <div className="lg:col-span-3 bg-white/70 rounded-2xl p-5 border border-white/80">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hadisənin Təsviri</p>
          <p className="text-sm text-slate-700 font-medium leading-relaxed">{event.description}</p>
        </div>

        {/* Risk Meaning */}
        <div className="lg:col-span-1 bg-white/70 rounded-2xl p-5 border border-white/80">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={14} className="text-rose-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Təhlükəsizlik Mənası</p>
          </div>
          <p className="text-sm text-slate-700 font-medium leading-relaxed">{event.riskMeaning}</p>
        </div>

        {/* Recommended Action */}
        <div className="lg:col-span-2 bg-white/70 rounded-2xl p-5 border border-white/80">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-emerald-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tövsiyə Olunan Tədbirlər</p>
          </div>
          <p className="text-sm text-slate-700 font-medium leading-relaxed">{event.recommendedAction}</p>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export const SecurityEventsPage: React.FC = () => {
  const { eventId: routeEventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();

  // Support legacy URL: ?eventid=4624
  const legacyEventId = searchParams.get('eventid') ?? searchParams.get('eventId');
  const initialId = routeEventId ?? legacyEventId;

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Hamısı');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    initialId ? Number(initialId) : null
  );

  // When URL param changes (e.g. navigation), sync selection
  useEffect(() => {
    if (initialId) {
      setSelectedEventId(Number(initialId));
    }
  }, [initialId]);

  const selectedEvent = selectedEventId != null
    ? SECURITY_EVENTS.find(e => e.id === selectedEventId) ?? null
    : null;

  const filtered = SECURITY_EVENTS.filter(e => {
    const matchSearch =
      String(e.id).includes(search.trim()) ||
      e.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchCategory = filterCategory === 'Hamısı' || e.category === filterCategory;
    const matchSeverity = filterSeverity === 'all' || e.severity === filterSeverity;
    return matchSearch && matchCategory && matchSeverity;
  });

  const handleSelect = useCallback((id: number) => {
    setSelectedEventId(prev => prev === id ? null : id);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const severityCounts = {
    info: SECURITY_EVENTS.filter(e => e.severity === 'info').length,
    warning: SECURITY_EVENTS.filter(e => e.severity === 'warning').length,
    critical: SECURITY_EVENTS.filter(e => e.severity === 'critical').length,
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <span className="hover:text-accent transition-colors cursor-default">Ev</span>
        <ChevronRight size={10} className="text-slate-300" />
        {selectedEvent ? (
          <>
            <button
              type="button"
              className="hover:text-accent transition-colors"
              onClick={handleDeselect}
            >
              Bütün Hadisələr
            </button>
            <ChevronRight size={10} className="text-slate-300" />
            <span className="text-slate-700">
              {selectedEvent.id} — {selectedEvent.name}
            </span>
          </>
        ) : (
          <span className="text-slate-700">Bütün Hadisələr</span>
        )}
      </nav>

      {/* Page Header */}
      <PageHeader
        title="Təhlükəsizlik Hadisələri Ensiklopediyası"
        subtitle="Windows Təhlükəsizlik Hadisə ID-ləri, təsviri, risk mənası və tövsiyə olunan tədbirlər"
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(
          [
            { label: 'Məlumat', count: severityCounts.info, severity: 'info' as Severity, icon: Info, bg: 'bg-blue-50', iconColor: 'text-blue-500' },
            { label: 'Xəbərdarlıq', count: severityCounts.warning, severity: 'warning' as Severity, icon: AlertTriangle, bg: 'bg-amber-50', iconColor: 'text-amber-500' },
            { label: 'Kritik', count: severityCounts.critical, severity: 'critical' as Severity, icon: AlertOctagon, bg: 'bg-rose-50', iconColor: 'text-rose-600' },
          ] as const
        ).map(stat => (
          <button
            key={stat.severity}
            type="button"
            onClick={() => setFilterSeverity(prev => prev === stat.severity ? 'all' : stat.severity)}
            className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:shadow-saas
              ${filterSeverity === stat.severity
                ? 'border-accent bg-accent/5 shadow-saas ring-1 ring-accent/20'
                : 'bg-white border-slate-100 hover:border-slate-200'}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
              <stat.icon size={20} className={stat.iconColor} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-900">{stat.count}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} strokeWidth={3} />
          <input
            type="text"
            placeholder="Hadisə ID və ya adı ilə axtarın..."
            className="w-full bg-white border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-4 focus:ring-accent/10 outline-none shadow-sm transition-all placeholder:text-slate-300"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={14} className="text-slate-400 ml-1" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-accent/10 cursor-pointer"
          >
            <option value="Hamısı">Bütün Kateqoriyalar</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result count */}
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-4">
        {filtered.length} hadisə tapıldı
        {filterSeverity !== 'all' && ` · Filtr: ${SEVERITY_LABELS[filterSeverity]}`}
        {filterCategory !== 'Hamısı' && ` · ${filterCategory}`}
      </p>

      {/* Event grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(event => (
            <EventCard
              key={event.id}
              event={event}
              isSelected={selectedEventId === event.id}
              onClick={() => handleSelect(event.id)}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-100 mb-6">
            <Shield size={40} />
          </div>
          <h4 className="text-xl font-bold text-slate-900 tracking-tight">Hadisə Tapılmadı</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-sm font-medium leading-relaxed">
            Axtarış meyarlarınıza uyğun hadisə yoxdur. Filtrləri sıfırlayın.
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterCategory('Hamısı'); setFilterSeverity('all'); }}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={14} />
            Filtrləri Sıfırla
          </button>
        </div>
      )}

      {/* Detail panel */}
      {selectedEvent && (
        <DetailPanel event={selectedEvent} onClose={handleDeselect} />
      )}
    </div>
  );
};
