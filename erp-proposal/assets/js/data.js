/* ==========================================================================
   CanvasOne ERP — Proposal content (single source of truth)
   --------------------------------------------------------------------------
   Every piece of copy on the page lives here, in Arabic + English.
   Edit text here — the layout in index.html / app.js renders it automatically.

   ⚠️  Before publishing, review the items marked  // VERIFY
       (contact details + compliance claims must match the licensed product).
   ========================================================================== */

window.PROPOSAL = {
  /* ------------------------------------------------------------------ */
  /*  Brand & contact                                                    */
  /* ------------------------------------------------------------------ */
  brand: {
    company: 'Code & Canvas',
    product: 'CanvasOne',
    productAr: 'كانفاس ون',
    website: 'codeandcanvas.net',
    websiteUrl: 'https://codeandcanvas.net',
    email: 'hello@codeandcanvas.net', // VERIFY — replace with the real sales inbox
    whatsapp: '', // VERIFY — international format without "+", e.g. "9665XXXXXXXX". Empty = hidden
    bookingUrl: '', // optional Cal.com / Calendly link. Empty = falls back to email
    year: 2026,
  },

  /* ------------------------------------------------------------------ */
  /*  UI strings                                                         */
  /* ------------------------------------------------------------------ */
  ui: {
    nav: {
      platform: { ar: 'المنصة', en: 'Platform' },
      modules: { ar: 'الوحدات', en: 'Modules' },
      sectors: { ar: 'القطاعات', en: 'Industries' },
      compliance: { ar: 'الامتثال', en: 'Compliance' },
      journey: { ar: 'التنفيذ', en: 'Delivery' },
      why: { ar: 'لماذا نحن', en: 'Why us' },
      faq: { ar: 'الأسئلة', en: 'FAQ' },
    },
    cta: { ar: 'احجز عرضًا تجريبيًا', en: 'Book a demo' },
    langSwitch: { ar: 'EN', en: 'ع' },
    langLabel: { ar: 'Switch to English', en: 'التبديل إلى العربية' },
    print: { ar: 'حفظ كـ PDF', en: 'Save as PDF' },
    top: { ar: 'للأعلى', en: 'Back to top' },
    loading: { ar: 'جارٍ تجهيز العرض…', en: 'Preparing your proposal…' },
  },

  /* ------------------------------------------------------------------ */
  /*  Hero                                                               */
  /* ------------------------------------------------------------------ */
  hero: {
    eyebrow: { ar: 'عرض تقديمي · CanvasOne ERP · إصدار ٢٠٢٦', en: 'Proposal · CanvasOne ERP · 2026 Edition' },
    titleA: { ar: 'أدِر شركتك كلها', en: 'Run your entire business' },
    titleB: { ar: 'من لوحة واحدة.', en: 'on one canvas.' },
    lead: {
      ar: 'CanvasOne نظام متكامل لتخطيط موارد المؤسسات، صُمّم خصيصًا لسوقَي السعودية ومصر. المالية والمبيعات والمخازن والموارد البشرية والفوترة الإلكترونية في منصة واحدة، بواجهة عربية أنيقة، وتنفيذ واضح النطاق ومحدد المدة، وفريق يرافقك من اليوم الأول.',
      en: 'CanvasOne is a complete ERP platform built for the Saudi and Egyptian markets. Finance, sales, inventory, HR and e-invoicing live on one platform, with a refined bilingual interface, fixed-scope implementation and a team that stays with you from day one.',
    },
    primary: { ar: 'احجز مكالمة مجانية · ٣٠ دقيقة', en: 'Book a free 30-min call' },
    secondary: { ar: 'استكشف الوحدات', en: 'Explore the modules' },
    chips: [
      { ar: 'فوترة إلكترونية ZATCA', en: 'ZATCA e-invoicing' },
      { ar: 'منظومة ETA المصرية', en: 'Egypt ETA ready' },
      { ar: 'عربي · English', en: 'Arabic · English' },
    ],
    dash: {
      title: { ar: 'لوحة القيادة · اليوم', en: 'Command center · Today' },
      kpis: [
        { label: { ar: 'إيرادات الشهر', en: 'Monthly revenue' }, value: 1284500, suffix: '', trend: 18.4 },
        { label: { ar: 'طلبات مفتوحة', en: 'Open orders' }, value: 342, suffix: '', trend: 6.1 },
        { label: { ar: 'قيمة المخزون', en: 'Stock value' }, value: 4.7, suffix: { ar: ' مليون', en: 'M' }, trend: -2.3 },
      ],
      chart: { ar: 'المبيعات مقابل المستهدف', en: 'Sales vs. target' },
      invoices: { ar: 'الفواتير الإلكترونية', en: 'E-invoices' },
      cleared: { ar: 'معتمدة', en: 'Cleared' },
      float1: { ar: 'تم اعتماد الفاتورة INV-2041', en: 'Invoice INV-2041 cleared' },
      float2: { ar: 'تنبيه: ٣ أصناف تحت حد الطلب', en: 'Alert: 3 items below reorder point' },
      float3: { ar: 'مسير رواتب الشهر جاهز للاعتماد', en: 'This month’s payroll is ready to approve' },
    },
  },

  /* ------------------------------------------------------------------ */
  /*  Key facts band (product facts only — no client claims)             */
  /* ------------------------------------------------------------------ */
  stats: [
    { value: 12, suffix: '', label: { ar: 'وحدة متكاملة', en: 'Integrated modules' } },
    { value: 6, suffix: '', label: { ar: 'قطاعات بحلول جاهزة', en: 'Industry blueprints' } },
    { value: 2, suffix: '', label: { ar: 'سوقان: السعودية ومصر', en: 'Markets: KSA & Egypt' } },
    { value: 12, prefix: '6–', suffix: '', label: { ar: 'أسبوعًا مدة تنفيذ نموذجية', en: 'Weeks typical go-live' } },
  ],

  /* ------------------------------------------------------------------ */
  /*  The challenge                                                      */
  /* ------------------------------------------------------------------ */
  challenge: {
    kicker: { ar: 'التحدي', en: 'The challenge' },
    title: { ar: 'النمو يكشف كل فجوة في طريقة إدارتك', en: 'Growth exposes every gap in how you operate' },
    lead: {
      ar: 'كلما كبرت الشركة، تضاعفت الجداول والأنظمة المنفصلة، وتأخرت المعلومة التي يُبنى عليها القرار. هذه أكثر أربع مشكلات نراها في السوق:',
      en: 'As a company scales, spreadsheets and disconnected systems multiply, and the numbers that drive decisions arrive late. These are the four problems we see most often:',
    },
    pains: [
      {
        icon: 'layers',
        title: { ar: 'بيانات مبعثرة', en: 'Scattered data' },
        text: { ar: 'ملفات Excel وبرامج متفرقة لا تتحدث مع بعضها، وكل قسم يعمل بنسخته الخاصة من الحقيقة.', en: 'Spreadsheets and point tools that don’t talk to each other, so every department works from its own version of the truth.' },
      },
      {
        icon: 'clock',
        title: { ar: 'قرارات متأخرة', en: 'Late decisions' },
        text: { ar: 'التقارير تُجمع يدويًا في نهاية الشهر، فتصل الإدارة إلى الأرقام بعد فوات وقت التصرف.', en: 'Reports are compiled by hand at month-end, so leadership sees the numbers after the moment to act has passed.' },
      },
      {
        icon: 'shield',
        title: { ar: 'ضغط الامتثال', en: 'Compliance pressure' },
        text: { ar: 'متطلبات الفوترة الإلكترونية والضرائب تتطور باستمرار، وأي خطأ يعني غرامات وتعطّل في العمليات.', en: 'E-invoicing and tax rules keep evolving, and every mistake risks penalties and disrupted operations.' },
      },
      {
        icon: 'globe',
        title: { ar: 'أنظمة لا تفهم السوق', en: 'Systems that don’t fit' },
        text: { ar: 'حلول مستوردة باهظة التكلفة وطويلة التنفيذ، لا تتقن العربية ولا تعرف قوانين السوق المحلي.', en: 'Imported suites that are expensive, slow to deploy, weak in Arabic and unaware of local regulations.' },
      },
    ],
    compare: {
      before: { ar: 'قبل CanvasOne', en: 'Before CanvasOne' },
      after: { ar: 'مع CanvasOne', en: 'With CanvasOne' },
      rows: [
        { before: { ar: 'إقفال الشهر يستغرق أيامًا من التسويات اليدوية', en: 'Month-end close takes days of manual reconciliation' }, after: { ar: 'قيود آلية وتسويات بنكية لحظية، وإقفال أسرع بخطوات أقل', en: 'Automated postings and live bank reconciliation make the close faster and simpler' } },
        { before: { ar: 'المخزون الفعلي يختلف عن الدفاتر', en: 'Physical stock never matches the books' }, after: { ar: 'حركة مخزون لحظية بالباركود عبر كل الفروع والمستودعات', en: 'Real-time, barcode-driven stock across every branch and warehouse' } },
        { before: { ar: 'فواتير تُرفع يدويًا إلى المنصات الحكومية', en: 'Invoices uploaded to tax portals by hand' }, after: { ar: 'ربط مباشر مع ZATCA وETA، وتُعتمد كل فاتورة لحظة إصدارها', en: 'Direct ZATCA & ETA integration, so every invoice is cleared the moment it’s issued' } },
        { before: { ar: 'الرواتب في جداول منفصلة عن الحضور والإجازات', en: 'Payroll kept apart from attendance and leave' }, after: { ar: 'مسير رواتب مرتبط بالحضور والتأمينات وحماية الأجور', en: 'Payroll linked to attendance, social insurance and wage protection' } },
        { before: { ar: 'تقارير الإدارة تصل متأخرة وغير موحدة', en: 'Management reports arrive late and inconsistent' }, after: { ar: 'لوحات مؤشرات حية على الجوال لكل مدير', en: 'Live dashboards on every manager’s phone' } },
      ],
    },
  },

  /* ------------------------------------------------------------------ */
  /*  Platform overview (orbit)                                          */
  /* ------------------------------------------------------------------ */
  platform: {
    kicker: { ar: 'المنصة', en: 'The platform' },
    title: { ar: 'منصة واحدة. مصدر واحد للحقيقة.', en: 'One platform. One source of truth.' },
    lead: {
      ar: 'كل وحدة في CanvasOne تتغذى من قاعدة بيانات واحدة. عملية البيع تحرّك المخزون، وتنشئ القيد المحاسبي، وتصدر الفاتورة الإلكترونية، وتحدّث لوحة المؤشرات في اللحظة نفسها.',
      en: 'Every CanvasOne module runs on a single database. One sale moves stock, posts the journal entry, issues the e-invoice and updates the dashboard, all at the same moment.',
    },
    points: [
      { ar: 'لا إدخال مزدوج للبيانات', en: 'Zero double entry' },
      { ar: 'صلاحيات دقيقة لكل مستخدم', en: 'Granular, role-based access' },
      { ar: 'تعدد الشركات والفروع والعملات', en: 'Multi-company, multi-branch, multi-currency' },
      { ar: 'سجل تدقيق كامل لكل حركة', en: 'Full audit trail on every transaction' },
    ],
    core: { ar: 'نواة موحدة', en: 'Unified core' },
  },

  /* ------------------------------------------------------------------ */
  /*  Modules                                                            */
  /* ------------------------------------------------------------------ */
  modulesSection: {
    kicker: { ar: 'الوحدات', en: 'Modules' },
    title: { ar: '١٢ وحدة تعمل كفريق واحد', en: 'Twelve modules, working as one team' },
    lead: { ar: 'ابدأ بما تحتاجه اليوم، وأضف الوحدات مع نموك دون إعادة تنفيذ. اختر وحدة لاستعراض تفاصيلها.', en: 'Start with what you need today and add modules as you grow, with no re-implementation. Pick a module to see the details.' },
    outcomeLabel: { ar: 'الأثر المتوقع', en: 'What you gain' },
  },
  modules: [
    {
      id: 'finance', icon: 'wallet',
      name: { ar: 'المالية والمحاسبة', en: 'Finance & Accounting' },
      desc: { ar: 'دفتر أستاذ عام متكامل بمعايير IFRS، مع مراكز تكلفة وموازنات وتقارير مالية فورية.', en: 'An IFRS-ready general ledger with cost centers, budgets and instant financial statements.' },
      features: [
        { ar: 'دليل حسابات مرن ومتعدد المستويات', en: 'Flexible multi-level chart of accounts' },
        { ar: 'الذمم المدينة والدائنة وأعمار الديون', en: 'Receivables, payables and aging' },
        { ar: 'تسويات بنكية وإدارة الشيكات', en: 'Bank reconciliation and cheque management' },
        { ar: 'موازنات تقديرية ومقارنة بالفعلي', en: 'Budgets with budget-vs-actual tracking' },
        { ar: 'تعدد العملات وفروق إعادة التقييم', en: 'Multi-currency with revaluation' },
      ],
      outcome: { ar: 'إقفال شهري أسرع ورؤية مالية لحظية', en: 'Faster month-end close and real-time financial visibility' },
    },
    {
      id: 'sales', icon: 'trend',
      name: { ar: 'المبيعات وإدارة العملاء', en: 'Sales & CRM' },
      desc: { ar: 'من أول تواصل مع العميل حتى التحصيل: فرص بيع وعروض أسعار وطلبات وعقود في مسار واحد.', en: 'From first contact to cash collected: leads, quotations, orders and contracts in one pipeline.' },
      features: [
        { ar: 'مسار مبيعات مرئي ومراحل قابلة للتخصيص', en: 'Visual pipeline with custom stages' },
        { ar: 'عروض أسعار احترافية بهويتك', en: 'Branded, professional quotations' },
        { ar: 'قوائم أسعار وخصومات وعروض', en: 'Price lists, discounts and promotions' },
        { ar: 'حدود ائتمان وتنبيهات تحصيل', en: 'Credit limits and collection alerts' },
        { ar: 'عمولات المندوبين وأهدافهم', en: 'Sales-rep targets and commissions' },
      ],
      outcome: { ar: 'نسب إغلاق أعلى ودورة تحصيل أقصر', en: 'Higher win rates and a shorter cash cycle' },
    },
    {
      id: 'procurement', icon: 'cart',
      name: { ar: 'المشتريات', en: 'Procurement' },
      desc: { ar: 'دورة شراء منضبطة من طلب الشراء حتى سداد المورد، مع موافقات متعددة المستويات.', en: 'A disciplined purchase-to-pay cycle with multi-level approvals.' },
      features: [
        { ar: 'طلبات شراء وطلبات عروض أسعار', en: 'Purchase requests and RFQs' },
        { ar: 'مقارنة عروض الموردين', en: 'Supplier bid comparison' },
        { ar: 'مطابقة ثلاثية: أمر الشراء والاستلام والفاتورة', en: 'Three-way match: PO, receipt and invoice' },
        { ar: 'تقييم أداء الموردين', en: 'Supplier performance scoring' },
        { ar: 'تكاليف الاستيراد والشحن', en: 'Landed cost and import expenses' },
      ],
      outcome: { ar: 'إنفاق تحت السيطرة وموردون أفضل', en: 'Controlled spend and stronger supplier terms' },
    },
    {
      id: 'inventory', icon: 'box',
      name: { ar: 'المخازن والمستودعات', en: 'Inventory & Warehousing' },
      desc: { ar: 'تحكم كامل في المخزون عبر مستودعات وفروع متعددة، بالباركود والأرقام التسلسلية وتواريخ الصلاحية.', en: 'Full stock control across warehouses and branches, with barcodes, serials and expiry dates.' },
      features: [
        { ar: 'مستودعات ومواقع تخزين متعددة', en: 'Multiple warehouses and bin locations' },
        { ar: 'تتبع الدفعات والأرقام التسلسلية والصلاحية', en: 'Batch, serial and expiry tracking' },
        { ar: 'حد إعادة الطلب واقتراحات الشراء', en: 'Reorder points and purchase suggestions' },
        { ar: 'جرد دوري ولحظي بالجوال', en: 'Cycle and live counts on mobile' },
        { ar: 'طرق تقييم: متوسط مرجح وFIFO', en: 'Weighted-average and FIFO valuation' },
      ],
      outcome: { ar: 'هدر أقل ومخزون يطابق الدفاتر', en: 'Less waste and stock that matches the books' },
    },
    {
      id: 'manufacturing', icon: 'factory',
      name: { ar: 'التصنيع', en: 'Manufacturing' },
      desc: { ar: 'تخطيط وتنفيذ الإنتاج بقوائم المواد ومراحل التشغيل، مع احتساب دقيق لتكلفة المنتج.', en: 'Plan and run production with bills of materials and routings, plus accurate product costing.' },
      features: [
        { ar: 'قوائم مواد متعددة المستويات', en: 'Multi-level bills of materials' },
        { ar: 'أوامر تشغيل ومراكز عمل', en: 'Work orders and work centers' },
        { ar: 'تخطيط احتياجات المواد MRP', en: 'Material requirements planning (MRP)' },
        { ar: 'مراقبة الجودة والهالك', en: 'Quality control and scrap tracking' },
        { ar: 'تكلفة فعلية ومعيارية', en: 'Actual and standard costing' },
      ],
      outcome: { ar: 'إنتاج في موعده وتكلفة معروفة لكل وحدة', en: 'On-time production with a known cost per unit' },
    },
    {
      id: 'hr', icon: 'users',
      name: { ar: 'الموارد البشرية والرواتب', en: 'HR & Payroll' },
      desc: { ar: 'دورة الموظف كاملة من التعيين حتى نهاية الخدمة، ومسير رواتب متوافق مع أنظمة العمل المحلية.', en: 'The full employee lifecycle from hiring to end of service, with payroll aligned to local labor law.' },
      features: [
        { ar: 'ملفات الموظفين والعقود والوثائق', en: 'Employee files, contracts and documents' },
        { ar: 'الحضور والانصراف والورديات', en: 'Attendance, shifts and timesheets' },
        { ar: 'الإجازات والسلف والجزاءات', en: 'Leave, loans and deductions' },
        { ar: 'التأمينات الاجتماعية وحماية الأجور', en: 'Social insurance and wage-protection files' },
        { ar: 'مكافأة نهاية الخدمة والخدمة الذاتية', en: 'End-of-service benefits and self-service' },
      ],
      outcome: { ar: 'رواتب دقيقة في موعدها، وموظفون أكثر رضا', en: 'Accurate, on-time payroll and happier employees' },
    },
    {
      id: 'pos', icon: 'store',
      name: { ar: 'نقاط البيع', en: 'Point of Sale' },
      desc: { ar: 'نقطة بيع سريعة تعمل حتى دون إنترنت، ومتصلة لحظيًا بالمخزون والحسابات.', en: 'A fast POS that keeps selling offline and syncs live with inventory and accounting.' },
      features: [
        { ar: 'واجهة لمس سريعة بالعربية', en: 'Fast, touch-first Arabic UI' },
        { ar: 'العمل دون اتصال ومزامنة تلقائية', en: 'Offline mode with automatic sync' },
        { ar: 'فاتورة مبسطة برمز QR', en: 'Simplified tax invoice with QR code' },
        { ar: 'ورديات الكاشير وإقفال الصندوق', en: 'Cashier shifts and till closing' },
        { ar: 'برامج ولاء وكوبونات', en: 'Loyalty programs and coupons' },
      ],
      outcome: { ar: 'خدمة أسرع للعميل وصندوق مضبوط', en: 'Faster checkout and a balanced till' },
    },
    {
      id: 'projects', icon: 'kanban',
      name: { ar: 'المشاريع والخدمات', en: 'Projects & Services' },
      desc: { ar: 'إدارة المشاريع والعقود بالمراحل والمستخلصات، مع ربحية لحظية لكل مشروع.', en: 'Manage projects and contracts by milestone and progress billing, with live profitability per project.' },
      features: [
        { ar: 'مراحل ومهام ومخطط زمني', en: 'Phases, tasks and Gantt timeline' },
        { ar: 'مستخلصات ودفعات مقدمة', en: 'Progress billing and advance payments' },
        { ar: 'تكاليف العمالة والمواد لكل مشروع', en: 'Labor and material cost per project' },
        { ar: 'تسجيل ساعات العمل', en: 'Timesheet tracking' },
        { ar: 'ربحية المشروع مقابل الموازنة', en: 'Project profit vs. budget' },
      ],
      outcome: { ar: 'مشاريع تُسلَّم في الموعد وضمن الموازنة', en: 'Projects delivered on time and on budget' },
    },
    {
      id: 'assets', icon: 'building',
      name: { ar: 'الأصول الثابتة', en: 'Fixed Assets' },
      desc: { ar: 'سجل أصول كامل بالإهلاك الآلي والصيانة والنقل بين الفروع.', en: 'A complete asset register with automatic depreciation, maintenance and transfers.' },
      features: [
        { ar: 'سجل أصول بالباركود', en: 'Barcode-tagged asset register' },
        { ar: 'طرق إهلاك متعددة وآلية', en: 'Automatic, multi-method depreciation' },
        { ar: 'جداول الصيانة الدورية', en: 'Preventive maintenance schedules' },
        { ar: 'النقل والاستبعاد وإعادة التقييم', en: 'Transfers, disposals and revaluation' },
      ],
      outcome: { ar: 'أصول محمية وقيم دفترية دقيقة', en: 'Protected assets and accurate book values' },
    },
    {
      id: 'einvoice', icon: 'receipt',
      name: { ar: 'الفوترة الإلكترونية والضرائب', en: 'E-Invoicing & Tax' },
      desc: { ar: 'ربط مباشر مع منصة «فاتورة» في السعودية ومنظومة الفاتورة والإيصال الإلكتروني في مصر.', en: 'Direct integration with Saudi Arabia’s FATOORA platform and Egypt’s e-invoice & e-receipt systems.' },
      features: [
        { ar: 'إصدار واعتماد الفواتير لحظيًا', en: 'Real-time issuing and clearance' },
        { ar: 'إقرارات ضريبة القيمة المضافة', en: 'VAT return preparation' },
        { ar: 'ضريبة الخصم والاستقطاع', en: 'Withholding tax handling' },
        { ar: 'إشعارات دائنة ومدينة إلكترونية', en: 'Electronic credit and debit notes' },
        { ar: 'أرشيف آمن وقابل للتدقيق', en: 'Secure, audit-ready archive' },
      ],
      outcome: { ar: 'امتثال كامل دون جهد يدوي', en: 'Full compliance with zero manual effort' },
    },
    {
      id: 'bi', icon: 'chart',
      name: { ar: 'التقارير وذكاء الأعمال', en: 'Reports & BI' },
      desc: { ar: 'لوحات مؤشرات تفاعلية وتقارير جاهزة وأداة لبناء تقاريرك الخاصة دون برمجة.', en: 'Interactive dashboards, ready-made reports and a no-code report builder.' },
      features: [
        { ar: 'أكثر من ١٥٠ تقريرًا جاهزًا', en: '150+ ready-made reports' },
        { ar: 'لوحات مؤشرات لكل دور وظيفي', en: 'Role-based KPI dashboards' },
        { ar: 'منشئ تقارير بالسحب والإفلات', en: 'Drag-and-drop report builder' },
        { ar: 'جدولة التقارير وإرسالها بالبريد', en: 'Scheduled reports by email' },
        { ar: 'تصدير إلى Excel وPDF', en: 'Export to Excel and PDF' },
      ],
      outcome: { ar: 'قرارات مبنية على أرقام اللحظة', en: 'Decisions based on live numbers' },
    },
    {
      id: 'mobile', icon: 'phone',
      name: { ar: 'البوابات وتطبيق الجوال', en: 'Portals & Mobile' },
      desc: { ar: 'تطبيق جوال للإدارة والمندوبين، وبوابات خدمة ذاتية للموظفين والعملاء والموردين.', en: 'A mobile app for managers and field reps, plus self-service portals for employees, customers and suppliers.' },
      features: [
        { ar: 'اعتمادات فورية من الجوال', en: 'Instant approvals on mobile' },
        { ar: 'تطبيق مندوب المبيعات الميداني', en: 'Field sales app' },
        { ar: 'بوابة الموظف: إجازات ومسيرات', en: 'Employee portal: leave and payslips' },
        { ar: 'بوابة العميل: كشوف حساب وطلبات', en: 'Customer portal: statements and orders' },
      ],
      outcome: { ar: 'عملك معك أينما كنت', en: 'Your business, wherever you are' },
    },
  ],

  /* ------------------------------------------------------------------ */
  /*  Industries                                                         */
  /* ------------------------------------------------------------------ */
  sectorsSection: {
    kicker: { ar: 'القطاعات', en: 'Industries' },
    title: { ar: 'حلول جاهزة لقطاعك، لا قوالب عامة', en: 'Built for your industry, not a generic template' },
    lead: { ar: 'لكل قطاع إعدادات وتقارير ومسارات عمل مجهزة مسبقًا، فتبدأ من ٧٠٪ بدل الصفر.', en: 'Each industry comes with pre-configured workflows, reports and settings, so you start at 70% instead of zero.' },
    painLabel: { ar: 'التحدي', en: 'The challenge' },
    fixLabel: { ar: 'كيف يحله CanvasOne', en: 'How CanvasOne solves it' },
    modulesLabel: { ar: 'الوحدات الأساسية', en: 'Core modules' },
  },
  sectors: [
    {
      id: 'retail', icon: 'store',
      name: { ar: 'التجزئة والتوزيع', en: 'Retail & Distribution' },
      pain: { ar: 'فروع ومستودعات ومندوبون، والمخزون والأسعار لا يتطابقان أبدًا.', en: 'Branches, warehouses and field reps, with stock and prices that never line up.' },
      fix: { ar: 'نقاط بيع متصلة لحظيًا، وتحويلات بين الفروع، وتطبيق للمندوب الميداني، وتسعير مركزي.', en: 'Live-connected POS, inter-branch transfers, a field-sales app and central pricing.' },
      modules: ['pos', 'inventory', 'sales', 'einvoice'],
    },
    {
      id: 'manufacturing', icon: 'factory',
      name: { ar: 'التصنيع', en: 'Manufacturing' },
      pain: { ar: 'تكلفة المنتج تقديرية، والإنتاج يتأخر بسبب نقص المواد.', en: 'Product costs are guesswork, and production stalls on missing materials.' },
      fix: { ar: 'قوائم مواد وتخطيط احتياجات، وتكلفة فعلية لكل أمر تشغيل، ومراقبة للجودة.', en: 'BOMs and MRP, actual cost per work order, and built-in quality control.' },
      modules: ['manufacturing', 'inventory', 'procurement', 'finance'],
    },
    {
      id: 'healthcare', icon: 'heart',
      name: { ar: 'الرعاية الصحية والعيادات', en: 'Healthcare & Clinics' },
      pain: { ar: 'مستلزمات طبية بتواريخ صلاحية، ومطالبات تأمين، وفروع متعددة.', en: 'Medical supplies with expiry dates, insurance claims and multiple branches.' },
      fix: { ar: 'تتبع الدفعات والصلاحية، ومحاسبة متعددة الفروع، وتكامل مع أنظمة المعلومات الصحية (HIS).', en: 'Batch and expiry tracking, multi-branch accounting and integration with hospital information systems (HIS).' },
      modules: ['inventory', 'finance', 'hr', 'procurement'],
    },
    {
      id: 'contracting', icon: 'crane',
      name: { ar: 'المقاولات والعقارات', en: 'Contracting & Real Estate' },
      pain: { ar: 'مستخلصات معقدة، وتكاليف مواقع متفرقة، وربحية غير واضحة لكل مشروع.', en: 'Complex progress billing, scattered site costs and unclear profit per project.' },
      fix: { ar: 'إدارة مشاريع بالمستخلصات، وتحميل التكاليف على المواقع، وإدارة الأصول والمعدات.', en: 'Project management with progress billing, site cost allocation, and equipment and asset tracking.' },
      modules: ['projects', 'assets', 'procurement', 'finance'],
    },
    {
      id: 'services', icon: 'briefcase',
      name: { ar: 'الخدمات والاستشارات', en: 'Services & Consulting' },
      pain: { ar: 'ساعات عمل غير مفوترة، وعقود متكررة تُتابَع يدويًا.', en: 'Unbilled hours and recurring contracts tracked by hand.' },
      fix: { ar: 'تسجيل الساعات والفوترة على أساسها، وعقود اشتراك بفواتير متكررة آلية.', en: 'Timesheet-based billing and subscription contracts with automatic recurring invoices.' },
      modules: ['projects', 'sales', 'hr', 'bi'],
    },
    {
      id: 'fnb', icon: 'cup',
      name: { ar: 'المطاعم والمقاهي', en: 'Food & Beverage' },
      pain: { ar: 'هدر في المواد الخام، ووصفات بلا تكلفة واضحة، وفروع كثيرة.', en: 'Raw-material waste, recipes without clear costs and many outlets.' },
      fix: { ar: 'تكلفة الوصفات، وصرف آلي للمكونات مع كل عملية بيع، ونقاط بيع سريعة لكل فرع.', en: 'Recipe costing, automatic ingredient consumption on every sale, and fast POS per outlet.' },
      modules: ['pos', 'inventory', 'manufacturing', 'bi'],
    },
  ],

  /* ------------------------------------------------------------------ */
  /*  Compliance (KSA / Egypt)                                           */
  /*  VERIFY each line against the licensed product’s certifications.    */
  /* ------------------------------------------------------------------ */
  compliance: {
    kicker: { ar: 'الامتثال المحلي', en: 'Local compliance' },
    title: { ar: 'مصمم لقوانين السوق الذي تعمل فيه', en: 'Designed for the rules of your market' },
    lead: { ar: 'اختر السوق لاستعراض ما يغطيه CanvasOne من متطلبات تنظيمية.', en: 'Pick a market to see the regulatory requirements CanvasOne covers.' },
    markets: [
      {
        id: 'ksa',
        name: { ar: 'المملكة العربية السعودية', en: 'Saudi Arabia' },
        flag: 'KSA',
        headline: { ar: 'جاهز لمتطلبات هيئة الزكاة والضريبة والجمارك', en: 'Ready for ZATCA requirements' },
        items: [
          { title: { ar: 'الفوترة الإلكترونية · المرحلة الثانية', en: 'E-invoicing · Phase 2' }, text: { ar: 'ربط وتكامل مع منصة «فاتورة»، واعتماد فوري لفواتير B2B، ورمز QR للفواتير المبسطة.', en: 'Integration with FATOORA, real-time clearance for B2B invoices and QR codes on simplified invoices.' } },
          { title: { ar: 'ضريبة القيمة المضافة ١٥٪', en: '15% VAT' }, text: { ar: 'احتساب آلي وإقرارات ضريبية جاهزة للتقديم.', en: 'Automatic calculation and ready-to-file VAT returns.' } },
          { title: { ar: 'التأمينات وحماية الأجور', en: 'GOSI & WPS' }, text: { ar: 'احتساب اشتراكات التأمينات الاجتماعية وتصدير ملفات حماية الأجور.', en: 'GOSI contribution calculation and wage-protection (WPS) export files.' } },
          { title: { ar: 'التقويم الهجري', en: 'Hijri calendar' }, text: { ar: 'عرض التواريخ بالهجري والميلادي في المستندات والتقارير.', en: 'Hijri and Gregorian dates across documents and reports.' } },
        ],
      },
      {
        id: 'eg',
        name: { ar: 'جمهورية مصر العربية', en: 'Egypt' },
        flag: 'EG',
        headline: { ar: 'جاهز لمنظومة مصلحة الضرائب المصرية', en: 'Ready for the Egyptian Tax Authority (ETA)' },
        items: [
          { title: { ar: 'الفاتورة الإلكترونية', en: 'E-invoice' }, text: { ar: 'إرسال الفواتير إلى منظومة ETA بالتوقيع الإلكتروني ومتابعة حالتها لحظيًا.', en: 'Submit signed invoices to the ETA system and track their status in real time.' } },
          { title: { ar: 'الإيصال الإلكتروني', en: 'E-receipt' }, text: { ar: 'إيصالات نقاط البيع متصلة بمنظومة الإيصال الإلكتروني.', en: 'POS receipts connected to the e-receipt system.' } },
          { title: { ar: 'ضريبة القيمة المضافة ١٤٪ والخصم', en: '14% VAT & withholding' }, text: { ar: 'احتساب ضريبة القيمة المضافة وضريبة الخصم والتحصيل تحت حساب الضريبة.', en: 'VAT and withholding tax handled automatically.' } },
          { title: { ar: 'التأمينات الاجتماعية', en: 'Social insurance' }, text: { ar: 'احتساب الاشتراكات وفق قانون التأمينات الاجتماعية والمعاشات.', en: 'Contributions calculated under Egypt’s social insurance law.' } },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Technology & security                                              */
  /* ------------------------------------------------------------------ */
  tech: {
    kicker: { ar: 'التقنية والأمان', en: 'Technology & security' },
    title: { ar: 'بنية مؤسسية تنمو معك', en: 'Enterprise architecture that grows with you' },
    items: [
      { icon: 'cloud', title: { ar: 'سحابي أو محلي', en: 'Cloud or on-premise' }, text: { ar: 'اختر الاستضافة السحابية أو التشغيل على خوادمك.', en: 'Run it in the cloud or on your own servers.' } },
      { icon: 'lock', title: { ar: 'تشفير وصلاحيات', en: 'Encryption & roles' }, text: { ar: 'تشفير للبيانات وصلاحيات دقيقة حتى مستوى الحقل.', en: 'Encrypted data and permissions down to the field level.' } },
      { icon: 'history', title: { ar: 'سجل تدقيق كامل', en: 'Full audit trail' }, text: { ar: 'كل تعديل مسجل: من فعله، ومتى، وما الذي تغيّر.', en: 'Every change logged: who did it, when and what changed.' } },
      { icon: 'database', title: { ar: 'نسخ احتياطي يومي', en: 'Daily backups' }, text: { ar: 'نسخ احتياطية آلية وخطة استعادة عند الطوارئ.', en: 'Automatic backups and a disaster-recovery plan.' } },
      { icon: 'plug', title: { ar: 'تكامل مفتوح', en: 'Open integration' }, text: { ar: 'واجهات برمجية للربط مع المتاجر والبنوك وشركات الشحن والأنظمة الأخرى.', en: 'APIs for e-commerce, banks, logistics and other systems.' } },
      { icon: 'languages', title: { ar: 'عربي أولًا', en: 'Arabic-first' }, text: { ar: 'واجهة ومستندات بالعربية والإنجليزية، مع دعم كامل للاتجاه من اليمين.', en: 'Interface and documents in Arabic and English, with full right-to-left support.' } },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Implementation journey                                             */
  /* ------------------------------------------------------------------ */
  journey: {
    kicker: { ar: 'رحلة التنفيذ', en: 'Delivery journey' },
    title: { ar: 'نطاق واضح، ومدة محددة، ولا مفاجآت', en: 'Clear scope, fixed timeline, no surprises' },
    lead: { ar: 'منهجية من خمس مراحل، تبدأ بفهم عملك وتنتهي بفريق يعمل على النظام بثقة. المدد تقديرية وتتحدد بعد جلسة الاكتشاف.', en: 'A five-phase method that starts by understanding your business and ends with a team using the system confidently. Durations are indicative and confirmed after discovery.' },
    steps: [
      { title: { ar: 'الاكتشاف', en: 'Discover' }, time: { ar: '١–٢ أسبوع', en: '1–2 weeks' }, text: { ar: 'ورش عمل مع فرقك لرسم العمليات الحالية وتحديد النطاق والأولويات.', en: 'Workshops with your teams to map current processes and agree scope and priorities.' }, deliverable: { ar: 'وثيقة نطاق معتمدة', en: 'Signed-off scope document' } },
      { title: { ar: 'التصميم والإعداد', en: 'Design & configure' }, time: { ar: '٢–٤ أسابيع', en: '2–4 weeks' }, text: { ar: 'إعداد النظام على مقاس عملياتك: الهيكل والصلاحيات والمستندات بهويتك.', en: 'Configure the system around your operations: structure, permissions and branded documents.' }, deliverable: { ar: 'بيئة اختبار جاهزة', en: 'Ready test environment' } },
      { title: { ar: 'نقل البيانات والتكامل', en: 'Migrate & integrate' }, time: { ar: '٢–٣ أسابيع', en: '2–3 weeks' }, text: { ar: 'نقل الأرصدة والبيانات الأساسية من أنظمتك الحالية، وربط المنصات الحكومية والخارجية.', en: 'Move balances and master data from your current systems, and connect government and third-party platforms.' }, deliverable: { ar: 'بيانات مُراجَعة ومطابقة', en: 'Reconciled, validated data' } },
      { title: { ar: 'التدريب والاختبار', en: 'Train & test' }, time: { ar: '١–٢ أسبوع', en: '1–2 weeks' }, text: { ar: 'تدريب عملي لكل دور وظيفي، واختبار قبول على سيناريوهات حقيقية من عملك.', en: 'Hands-on training for every role and acceptance testing on real scenarios from your business.' }, deliverable: { ar: 'فريق معتمد على النظام', en: 'A certified in-house team' } },
      { title: { ar: 'الإطلاق والمتابعة', en: 'Go-live & hypercare' }, time: { ar: '٤ أسابيع دعم مكثف', en: '4 weeks hypercare' }, text: { ar: 'تشغيل فعلي بمرافقة فريقنا، ثم دعم مستمر وتحديثات دورية.', en: 'Go live with our team beside you, followed by ongoing support and regular updates.' }, deliverable: { ar: 'تشغيل مستقر ودعم مستمر', en: 'Stable operations and ongoing support' } },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Why Code & Canvas                                                  */
  /* ------------------------------------------------------------------ */
  why: {
    kicker: { ar: 'لماذا Code & Canvas', en: 'Why Code & Canvas' },
    title: { ar: 'حيث يلتقي الإبداع بالتقنية', en: 'Where creativity meets technology' },
    lead: { ar: 'لسنا موزعًا يبيع رخصة ويختفي. نحن شريك يجمع خبرة البنية التقنية للمؤسسات مع حس التصميم، لنقدم نظامًا يعمل بكفاءة ويحب فريقك استخدامه.', en: 'We’re not a reseller who sells a license and disappears. We combine enterprise architecture expertise with a designer’s eye to deliver a system that works hard and that your team actually enjoys using.' },
    pillars: [
      { icon: 'target', title: { ar: 'متخصصون', en: 'Specialized' }, text: { ar: 'نعرف أنظمة السوقين السعودي والمصري، ونبني على خبرة عميقة في تقنية المؤسسات والقطاع الصحي.', en: 'We know the Saudi and Egyptian markets inside out, backed by deep enterprise and healthcare IT experience.' } },
      { icon: 'package', title: { ar: 'منهجية واضحة', en: 'Productized' }, text: { ar: 'باقات تنفيذ بنطاق محدد ومدة معروفة ومخرجات مكتوبة، بلا ساعات مفتوحة ولا غموض.', en: 'Implementation packages with defined scope, known timelines and written deliverables. No open-ended hours, no ambiguity.' } },
      { icon: 'sparkles', title: { ar: 'متكاملون', en: 'Integrated' }, text: { ar: 'نجمع التقنية والتصميم تحت سقف واحد: مستندات بهويتك، وتجربة استخدام راقية، وتحول رقمي متكامل.', en: 'Tech and design under one roof: branded documents, a refined user experience and end-to-end digital transformation.' } },
    ],
    promises: [
      { ar: 'مدير مشروع مخصص من أول يوم', en: 'A dedicated project manager from day one' },
      { ar: 'دعم فني بالعربية في السعودية ومصر', en: 'Arabic-speaking support in KSA and Egypt' },
      { ar: 'بياناتك ملكك بالكامل وقابلة للتصدير', en: 'Your data stays yours, fully exportable' },
      { ar: 'تحديثات مستمرة تواكب الأنظمة الجديدة', en: 'Continuous updates as regulations evolve' },
    ],
  },

  /* ------------------------------------------------------------------ */
  /*  Solution builder (no prices — generates a quote request)           */
  /* ------------------------------------------------------------------ */
  builder: {
    kicker: { ar: 'صمّم حلّك', en: 'Build your solution' },
    title: { ar: 'ثلاث دقائق تفصلك عن عرض مُفصّل لشركتك', en: 'Three minutes to a proposal tailored to you' },
    lead: { ar: 'اختر ما يناسبك، وسنعود إليك بعرض سعر ومدة تنفيذ خلال يوم عمل واحد.', en: 'Choose what fits, and we’ll come back with a quote and timeline within one business day.' },
    marketQ: { ar: 'السوق', en: 'Market' },
    marketOpts: [
      { id: 'ksa', label: { ar: 'السعودية', en: 'Saudi Arabia' } },
      { id: 'eg', label: { ar: 'مصر', en: 'Egypt' } },
      { id: 'both', label: { ar: 'كلاهما', en: 'Both' } },
    ],
    sizeQ: { ar: 'عدد المستخدمين', en: 'Number of users' },
    sizeOpts: [
      { id: 's', label: { ar: 'حتى ٢٠', en: 'Up to 20' } },
      { id: 'm', label: { ar: '٢١–١٠٠', en: '21–100' } },
      { id: 'l', label: { ar: '١٠١–٥٠٠', en: '101–500' } },
      { id: 'xl', label: { ar: '+٥٠٠', en: '500+' } },
    ],
    deployQ: { ar: 'طريقة التشغيل', en: 'Deployment' },
    deployOpts: [
      { id: 'cloud', label: { ar: 'سحابي', en: 'Cloud' } },
      { id: 'onprem', label: { ar: 'على خوادمنا', en: 'On-premise' } },
    ],
    sectorQ: { ar: 'القطاع', en: 'Industry' },
    modulesQ: { ar: 'الوحدات المطلوبة', en: 'Modules you need' },
    summaryTitle: { ar: 'ملخص طلبك', en: 'Your request' },
    selected: { ar: 'وحدة مختارة', en: 'modules selected' },
    selectedFew: { ar: 'وحدات مختارة', en: 'modules selected' },
    selectedOne: { ar: 'وحدة مختارة', en: 'module selected' },
    timeline: { ar: 'مدة تنفيذ تقديرية', en: 'Indicative timeline' },
    weeks: { ar: 'أسبوعًا', en: 'weeks' },
    weeksFew: { ar: 'أسابيع', en: 'weeks' },
    send: { ar: 'أرسل الطلب بالبريد', en: 'Send request by email' },
    whatsapp: { ar: 'تواصل عبر واتساب', en: 'Chat on WhatsApp' },
    copy: { ar: 'نسخ الملخص', en: 'Copy summary' },
    copied: { ar: 'تم النسخ ✓', en: 'Copied ✓' },
    note: { ar: 'لا أسعار عامة. كل عرض يُبنى على احتياجك الفعلي.', en: 'No list prices. Every quote is built around your actual needs.' },
    mailSubject: { ar: 'طلب عرض سعر · CanvasOne ERP', en: 'Quote request · CanvasOne ERP' },
  },

  /* ------------------------------------------------------------------ */
  /*  FAQ                                                                */
  /* ------------------------------------------------------------------ */
  faqSection: { kicker: { ar: 'أسئلة شائعة', en: 'FAQ' }, title: { ar: 'إجابات واضحة قبل أن تسأل', en: 'Straight answers, up front' } },
  faq: [
    { q: { ar: 'كم يستغرق تنفيذ النظام؟', en: 'How long does implementation take?' }, a: { ar: 'تتراوح المدة عادةً بين ٦ و١٢ أسبوعًا حسب عدد الوحدات والفروع وحجم البيانات. نحدد المدة الدقيقة كتابيًا بعد جلسة الاكتشاف، ونلتزم بها.', en: 'Typically 6–12 weeks, depending on modules, branches and data volume. We confirm the exact timeline in writing after discovery, and we stick to it.' } },
    { q: { ar: 'هل يمكن نقل بياناتنا من النظام الحالي؟', en: 'Can we migrate from our current system?' }, a: { ar: 'نعم. ننقل الأرصدة الافتتاحية والعملاء والموردين والأصناف والموظفين من Excel أو من أي نظام سابق، ونطابقها معكم قبل الإطلاق.', en: 'Yes. We migrate opening balances, customers, suppliers, items and employees from Excel or any previous system, and reconcile everything with you before go-live.' } },
    { q: { ar: 'هل يدعم النظام أكثر من شركة وفرع وعملة؟', en: 'Does it handle multiple companies, branches and currencies?' }, a: { ar: 'نعم، مع تقارير موحدة على مستوى المجموعة، وتقارير مستقلة لكل شركة وفرع.', en: 'Yes, with consolidated group reporting plus separate reports for each company and branch.' } },
    { q: { ar: 'هل يمكن تخصيص النظام لعملياتنا؟', en: 'Can it be customized to our processes?' }, a: { ar: 'نبدأ بالإعداد قبل البرمجة: الحقول ومسارات الاعتماد والمستندات والتقارير قابلة للتخصيص. وعند الحاجة نطوّر إضافات خاصة بنطاق وسعر محددين.', en: 'We configure before we code: fields, approval flows, documents and reports are all adjustable. When needed, we build custom extensions with a fixed scope and price.' } },
    { q: { ar: 'من يملك البيانات؟', en: 'Who owns the data?' }, a: { ar: 'أنتم، بالكامل. يمكنكم تصدير بياناتكم في أي وقت، وفي التشغيل المحلي تبقى البيانات على خوادمكم.', en: 'You do, completely. You can export your data at any time, and with on-premise deployment it never leaves your servers.' } },
    { q: { ar: 'ماذا بعد الإطلاق؟', en: 'What happens after go-live?' }, a: { ar: 'أربعة أسابيع من الدعم المكثف، ثم عقد دعم سنوي يشمل الدعم الفني والتحديثات وجلسات تدريب للموظفين الجدد.', en: 'Four weeks of hypercare, then an annual support plan covering helpdesk, updates and training sessions for new staff.' } },
  ],

  /* ------------------------------------------------------------------ */
  /*  Closing                                                            */
  /* ------------------------------------------------------------------ */
  closing: {
    title: { ar: 'جاهز لترى شركتك كاملة', en: 'Ready to see your whole business' },
    titleB: { ar: 'على لوحة واحدة؟', en: 'on one canvas?' },
    text: { ar: 'احجز مكالمة مجانية مدتها ٣٠ دقيقة. نفهم فيها عملك، ونعرض لك النظام على سيناريوهات من واقعك، دون أي التزام.', en: 'Book a free 30-minute call. We’ll learn how you work and walk you through the system using scenarios from your own business, with no commitment.' },
    primary: { ar: 'احجز مكالمتك الآن', en: 'Book your call' },
    secondary: { ar: 'صمّم حلّك أولًا', en: 'Build your solution first' },
  },
  footer: {
    tagline: { ar: 'حيث يلتقي الإبداع بالتقنية.', en: 'Where creativity meets technology.' },
    rights: { ar: 'جميع الحقوق محفوظة.', en: 'All rights reserved.' },
    product: { ar: 'CanvasOne ERP منتج مقدم من Code & Canvas.', en: 'CanvasOne ERP is offered by Code & Canvas.' },
    confidential: { ar: 'وثيقة عرض تجاري · للاستخدام التسويقي', en: 'Commercial proposal · for marketing use' },
  },
};
