# Requested development
- [ ] Add file/tab selection to the live presentation; apply it to slides, details, summaries and copied figures, and verify with real data without changing Sheets.
- [x] Add source column selection, start/end timestamp mappings and inclusive date windows; real Sheets duration preview and volunteer hours/review filters verified, 35 tests passed. No source data was changed.
- [x] Match the uploaded activities presentation style and labels, use live Sheets aggregates, auto-include new activity types, preserve goals/centers/photos/navigation/summary/fullscreen/autoplay; 14 tests passed and live totals, center filtering, desktop/mobile and playback verified.
- [ ] Fix ordinary Google/email login to open the homepage, verify public homepage and signed-in destination, and explain Google consent branding requirements.
- [x] Continue the re-uploaded additional brief on the existing application; preserve real data and existing pages.
- [x] Repair login UI, public Google callback, password recovery page and session-aware account controls; invalid credentials, signed-in account and sign-out verified.
- [ ] Complete Google sign-in and email recovery end-to-end with provider interaction and a real recovery email.
- [x] Source wizard: live Sheets preview, explicit mapping/classification, local CSV/Excel snapshots and source settings; live preview verified without changing original Sheets.
- [x] Volunteer master records, safe identity matching, national-ID demographics, search and WhatsApp; private profile verified signed in.
- [x] Real participation records, explicit approved-hour totals, hours leaderboard and date/center/project/approval filters.
- [ ] Administrator-only volunteer/placement/participation writes with immutable audit history.
- [x] Data quality review and external-change observation; editor identity is unavailable from Sheets reads.
- [x] Master Plan all-years/annual/Q1–Q4 controls without invented quarterly allocations.
- [x] Verify public and signed-in flows, tests and metadata; 30 tests passed and signed-in Sheets preview/profile/quality/plan flows verified.
- [ ] Full membership/placement editing, approval workflows, source-conflict resolution and expanded leaderboard modes remain future phases, not delivered by the current read-only views.

Constraint: direct Sheets writes are authorized only for administrators. Google Apps Script deployment requires the owner's Google authorization; do not claim it is connected without a deployed endpoint.
## جديد
- [x] مركز المتابعة من البيانات العامة، بحث القائمة والأنشطة، وطي القائمة؛ تم اختبار البحث ومسح التصفية والطي والهاتف دون أخطاء. البيانات من النسخة المحفوظة؛ القراءة الحية تنتظر ربط Google Sheets في المساحة الحالية.
- [x] إعادة ربط Google Sheets بعد نقل المشروع لمساحة عمل جديدة
- [x] تطوير التصميم: حركات دخول متدرجة، عدادات متحركة، بطاقات تفاعلية، تحسين القائمة والعناوين

## طلب ١٤ أكتوبر
- [x] صور خلفية مستقلة لكل بند في العرض الحي، اختيار وتغيير الصور مع الاحتفاظ بالمميزات الحالية؛ رفع/استعادة/إزالة الصورة اختُبرت على الجهاز والهاتف.
- [x] إعادة تنظيم الشريط الجانبي: دمج الصفحات المتقاربة تحت مجموعة/أيقونة واحدة، وجعل التنقل سلسلة.
- [x] إضافة صفحات جديدة مفيدة (تقارير/أثر/تقويم) مبنية على البيانات الموجودة.
- [x] تطوير صفحة العرض: ميزات إضافية (تنقل أسرع، overview، شريط تقدم، اختصارات).
- [x] صور الخلفية في التقويم والعرض الحي والرئيسية + صور ملف الأنشطة + ربط مجلدات Google Drive بتحديث كل ٥ دقائق
