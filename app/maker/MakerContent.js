'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider.js';
import { BoltIcon, WaveIcon, FileAudioIcon, LayersIcon, GlobeIcon, SparkIcon } from '@/components/Icons.js';

const CONTACT = {
  whatsapp: 'https://wa.me/201092500454',
  email: 'mailto:m1aboalazm@gmail.com',
  linkedin: 'https://www.linkedin.com/in/aboalazm',
  behance: 'https://www.behance.net/aboalazm',
};

const COPY = {
  en: {
    eyebrow: 'THE PERSON BEHIND THE PRODUCT',
    lead: 'I don’t design brands.',
    accent: 'I build systems.',
    intro: 'I connect brand thinking, product design, and engineering to turn complicated ideas into clear, useful experiences — from the first sketch to a working product.',
    contact: 'Let’s build something',
    os: 'Explore Aboalazm OS',
    years: 'years in design',
    clients: 'clients & teams',
    process: 'one connected process',
    roles: ['Brand identity & systems', 'Product design & UX', 'Web engineering & automation'],
    workEyebrow: 'SELECTED WORK',
    workTitle: 'A few things I’ve helped bring to life.',
    workBody: 'Different problems, same instinct: make the complex feel clear, coherent, and ready to use.',
    projects: [
      { n: '01', icon: 'layers', group: 'brand', type: 'BRAND IDENTITY · HEALTHCARE', title: 'GAD Heart & Lungs Institute', body: 'A bilingual identity system built from strategy through guidelines, designed to keep a specialist healthcare brand coherent across touchpoints.', action: 'Explore brand work', href: 'https://aboalazm-os.vercel.app/work/gad-institute' },
      { n: '02', icon: 'spark', group: 'brand', type: 'BRAND SYSTEM · PHARMA', title: 'Nile Pharma Food', body: 'A brand system spanning identity, packaging, and campaign governance for a healthcare and supplements business.', action: 'Explore brand work', href: 'https://aboalazm-os.vercel.app/work/nile-pharma' },
      { n: '03', icon: 'layers', group: 'brand', type: 'STUDIO IDENTITY · SYSTEM', title: 'Code & Canvas', body: 'A studio identity and design infrastructure connecting the brand, guidelines, and digital presence into one system.', action: 'Explore brand work', href: 'https://aboalazm-os.vercel.app/work/code-canvas' },
      { n: '04', icon: 'audio', group: 'development', type: 'PRODUCT · AI', title: 'Speech to Text Studio', body: 'A bilingual transcription workspace with four speech engines, automatic failover, editable transcripts, and a privacy-minded architecture.', action: 'Explore the product', href: '/studio', internal: true },
      { n: '05', icon: 'layers', group: 'development', type: 'PERSONAL SYSTEM · WEB APP', title: 'Aboalazm OS', body: 'A personal operating system for work, projects, and the way ideas move from intention to execution.', action: 'Open the OS', href: 'https://aboalazm-os.vercel.app/' },
      { n: '06', icon: 'globe', group: 'development', type: 'ERP · DIGITAL OPERATIONS', title: 'Nile Pharma ERP', body: 'A connected operations platform shaped around real workflows, traceability, and clearer decisions.', action: 'View the repository', href: 'https://github.com/3boalazm/nile-pharma-erp' },
    ],
    approachEyebrow: 'HOW I THINK',
    approachTitle: 'Not decoration. Not code for code’s sake.',
    approachBody: 'The strongest work happens when strategy, identity, experience, and implementation are considered together — not handed off as disconnected pieces.',
    principles: [
      ['01', 'Start with the real problem', 'Understand the people, constraints, and business behind the brief before reaching for a visual.'],
      ['02', 'Build systems, not isolated screens', 'Create a consistent logic people can recognise, use, and grow with.'],
      ['03', 'Make the idea real', 'Bring design and engineering closer, so good thinking survives contact with the product.'],
    ],
    ctaEyebrow: 'HAVE A GOOD PROBLEM?',
    ctaTitle: 'Let’s make the next thing matter.',
    ctaBody: 'Building a brand, shaping a digital product, or untangling a workflow? Tell me what you’re trying to change.',
    start: 'Start a conversation',
    email: 'Email me',
    socials: 'Find me elsewhere',
    available: 'Open to thoughtful collaborations',
    back: 'Back to the studio',
  },
  ar: {
    eyebrow: 'الشخص اللي ورا المنتج',
    lead: 'أنا مش بصمّم براندات وبس.',
    accent: 'أنا ببني أنظمة.',
    intro: 'بجمع بين التفكير في الهوية، وتصميم المنتجات، والهندسة علشان أحوّل الأفكار المعقدة لتجارب واضحة ومفيدة — من أول اسكتش لحد منتج شغال.',
    contact: 'خلينا نبني حاجة',
    os: 'استكشف Aboalazm OS',
    years: 'سنوات في التصميم',
    clients: 'عميل وفريق',
    process: 'رحلة واحدة متصلة',
    roles: ['هوية وأنظمة العلامات التجارية', 'تصميم المنتجات وتجربة المستخدم', 'هندسة الويب والأتمتة'],
    workEyebrow: 'أعمال مختارة',
    workTitle: 'نماذج لحاجات ساهمت في بنائها.',
    workBody: 'مشاكل مختلفة، لكن بنفس الفكرة: نخلي المعقد واضح ومترابط وجاهز للاستخدام.',
    projects: [
      { n: '01', icon: 'layers', group: 'brand', type: 'هوية بصرية · رعاية صحية', title: 'GAD Heart & Lungs Institute', body: 'نظام هوية ثنائي اللغة يبدأ من الاستراتيجية وينتهي بدليل استخدام يحافظ على اتساق العلامة في كل نقاط التواصل.', action: 'استكشف شغل الهوية', href: 'https://aboalazm-os.vercel.app/work/gad-institute' },
      { n: '02', icon: 'spark', group: 'brand', type: 'نظام علامة · فارما', title: 'Nile Pharma Food', body: 'نظام علامة يشمل الهوية والتغليف وتنظيم الحملات لشركة في مجال الرعاية الصحية والمكملات.', action: 'استكشف شغل الهوية', href: 'https://aboalazm-os.vercel.app/work/nile-pharma' },
      { n: '03', icon: 'layers', group: 'brand', type: 'هوية استوديو · نظام متكامل', title: 'Code & Canvas', body: 'هوية وبنية تصميمية للاستوديو تربط العلامة والدليل والحضور الرقمي في نظام واحد.', action: 'استكشف شغل الهوية', href: 'https://aboalazm-os.vercel.app/work/code-canvas' },
      { n: '04', icon: 'audio', group: 'development', type: 'منتج رقمي · ذكاء اصطناعي', title: 'Speech to Text Studio', body: 'مساحة تفريغ صوتي ثنائية اللغة بأربعة محرّكات، وتحويل تلقائي عند الفشل، ونص قابل للتحرير، وبنية تراعي الخصوصية.', action: 'استكشف المنتج', href: '/studio', internal: true },
      { n: '05', icon: 'layers', group: 'development', type: 'نظام شخصي · تطبيق ويب', title: 'Aboalazm OS', body: 'نظام شخصي لتنظيم الشغل والمشاريع وتحويل الأفكار من نية إلى تنفيذ.', action: 'افتح الـ OS', href: 'https://aboalazm-os.vercel.app/' },
      { n: '06', icon: 'globe', group: 'development', type: 'ERP · عمليات رقمية', title: 'Nile Pharma ERP', body: 'منصة عمليات مترابطة مبنية حول سير الشغل الحقيقي، والتتبّع، وقرارات أوضح.', action: 'شوف الريبو', href: 'https://github.com/3boalazm/nile-pharma-erp' },
    ],
    approachEyebrow: 'طريقة تفكيري',
    approachTitle: 'مش مجرد شكل. ومش كود لمجرد الكود.',
    approachBody: 'أقوى شغل بيحصل لما الاستراتيجية والهوية والتجربة والتنفيذ يتفكر فيهم مع بعض، مش كأجزاء منفصلة بتتسلّم من فريق لفريق.',
    principles: [
      ['01', 'ابدأ بالمشكلة الحقيقية', 'افهم الناس والقيود والبيزنس اللي ورا الطلب قبل ما تختار شكل بصري.'],
      ['02', 'ابنِ نظام، مش شاشات منفصلة', 'اعمل منطق متماسك الناس تقدر تتعرف عليه وتستخدمه وتكبر معاه.'],
      ['03', 'حوّل الفكرة لحاجة شغالة', 'قرّب التصميم من الهندسة علشان الفكرة الجيدة تعيش فعلًا جوه المنتج.'],
    ],
    ctaEyebrow: 'عندك مشكلة تستاهل تتحل؟',
    ctaTitle: 'خلينا نعمل حاجة تفرق.',
    ctaBody: 'بتبني براند، أو بتشكّل منتج رقمي، أو بتحاول ترتّب workflow معقد؟ احكيلي إيه اللي عاوز تغيّره.',
    start: 'ابدأ محادثة',
    email: 'ابعت إيميل',
    socials: 'تلاقيني هنا كمان',
    available: 'متاح لتعاونات مختارة بعناية',
    back: 'ارجع للاستوديو',
  },
};

export default function MakerContent() {
  const { locale } = useI18n();
  const c = COPY[locale === 'ar' ? 'ar' : 'en'];

  return (
    <main data-maker-page className="maker-os-skin relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px]">
        <div className="absolute -top-40 start-[8%] size-[460px] rounded-full bg-[#FF6B47]/[0.12] blur-[110px]" />
        <div className="absolute top-24 end-[4%] size-[360px] rounded-full bg-[#51E9F5]/[0.07] blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:px-8">
        <section className="grid items-center gap-12 pb-14 pt-5 md:grid-cols-[1.2fr_0.8fr] md:gap-14 md:pb-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#FF6B47]/30 bg-[#FF6B47]/[0.08] px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-[#FF8A6D]"><span className="size-1.5 rounded-full bg-[#FF6B47] shadow-[0_0_12px_#FF6B4770]" />{c.eyebrow}</p>
            <h1 className="text-balance-tight mt-7 max-w-3xl text-4xl font-medium leading-[1.13] tracking-tight text-ink-100 sm:text-5xl lg:text-7xl">{c.lead}{' '}<span className="bg-gradient-to-r from-[#FF8A6D] via-[#FF6B47] to-[#FFA98F] bg-clip-text text-transparent">{c.accent}</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink-300 sm:text-lg">{c.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer noopener" className="maker-primary-button shine hover-lift press-scale inline-flex items-center gap-2 rounded-full bg-[#FF6B47] px-5 py-3 text-sm font-semibold text-[#170B08] transition hover:bg-[#FF8A6D]">{c.contact} ↗</a>
              <a href="https://aboalazm-os.vercel.app/" target="_blank" rel="noreferrer noopener" className="maker-glass hover-lift inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-semibold text-ink-100 backdrop-blur-xl transition hover:border-[#FF6B47]/45 hover:bg-white/[0.06]"><WaveIcon className="size-4 text-[#FF8A6D]" />{c.os} ↗</a>
            </div>
            <div className="maker-glass mt-10 grid max-w-2xl grid-cols-3 rounded-2xl border border-white/[0.09] bg-white/[0.025] py-5 backdrop-blur-xl">
              {[['09+','years'],['20+','clients'],['Design × Build','process']].map(([value,key],i)=>(
                <div key={key} className={i===1?'border-x border-white/[0.09] px-4 sm:px-6':i===2?'ps-4 sm:ps-6':'pe-4 sm:pe-6'}>
                  <p className="text-lg font-semibold tracking-tight text-ink-100 sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[10px] leading-5 text-ink-500 sm:text-xs">{key==='years'?c.years:key==='clients'?c.clients:c.process}</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="relative">
            <div className="absolute -inset-3 rounded-[2rem] border border-white/[0.07]" />
            <div className="maker-glass relative overflow-hidden rounded-[1.6rem] border border-white/[0.12] bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[0.18em] text-[#FF8A6D]">M / A — DESIGN × ENGINEERING</p><h2 className="mt-3 font-display text-3xl leading-tight text-ink-100 sm:text-4xl">Mustafa<br />Aboalazm</h2></div><span className="grid size-12 place-items-center rounded-2xl border border-[#FF6B47]/25 bg-[#FF6B47]/[0.09] text-[#FF8A6D]"><BoltIcon className="size-5" /></span></div>
              <div className="mt-8 space-y-3">{c.roles.map((label,i)=><div key={label} className="flex items-center gap-3 border-t border-white/[0.09] pt-3"><span className="font-mono text-[10px] text-[#FF8A6D]">0{i+1}</span><span className="text-sm text-ink-200">{label}</span></div>)}</div>
              <div className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3"><span className="text-xs text-ink-300">{c.available}</span><span className="size-2 shrink-0 rounded-full bg-[#FF6B47] shadow-[0_0_14px_#FF6B4770]" /></div>
            </div>
          </aside>
        </section>

        <section className="border-t border-white/[0.09] pt-12 sm:pt-16" aria-labelledby="maker-work-title">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] tracking-[0.18em] text-[#FF8A6D]">{c.workEyebrow}</p><h2 id="maker-work-title" className="mt-3 max-w-2xl text-3xl font-medium tracking-tight text-ink-100 sm:text-4xl">{c.workTitle}</h2></div><p className="max-w-md text-sm leading-7 text-ink-400">{c.workBody}</p></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {c.projects.filter((p) => p.group === 'brand').map((p)=><article key={p.n} className="maker-glass group relative flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-[#FF6B47]/35 hover:bg-white/[0.055] sm:p-7">
              <div className="flex items-center justify-between gap-4"><span className="font-mono text-xs text-[#FF8A6D]">{p.n}</span><span className="text-end font-mono text-[9px] uppercase tracking-[0.13em] text-ink-500 sm:text-[10px]">{p.type}</span></div><div className="mt-5 grid size-11 place-items-center rounded-2xl border border-[#FF6B47]/25 bg-[#FF6B47]/[0.08] text-[#FF8A6D]">{p.icon === "audio" ? <FileAudioIcon className="size-5" /> : p.icon === "layers" ? <LayersIcon className="size-5" /> : p.icon === "globe" ? <GlobeIcon className="size-5" /> : <SparkIcon className="size-5" />}</div>
              <h3 className="mt-7 text-2xl font-medium tracking-tight text-ink-100 sm:text-3xl">{p.title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-ink-400">{p.body}</p>
              <div className="mt-auto pt-6">{p.internal?<Link href={p.href} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-200 transition group-hover:text-[#FF8A6D]">{p.action} ↗</Link>:<a href={p.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-200 transition group-hover:text-[#FF8A6D]">{p.action} ↗</a>}</div>
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -end-10 size-36 rounded-full border border-white/[0.07] transition group-hover:border-[#FF6B47]/25" />
            </article>)}
          </div>
          <div className="mt-14 flex items-end justify-between gap-4 border-t border-white/[0.09] pt-8">
            <div><p className="font-mono text-[10px] tracking-[0.18em] text-[#FF8A6D]">PRODUCTS / ENGINEERING</p><h3 className="mt-3 text-2xl font-medium text-ink-100">{locale === 'ar' ? 'مشاريع الديف والمنتجات الرقمية' : 'Development & digital products'}</h3></div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {c.projects.filter((p) => p.group === 'development').map((p)=><article key={p.n} className="maker-glass group relative flex min-h-[280px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-white/[0.025] p-6 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-[#FF6B47]/35 hover:bg-white/[0.055] sm:p-7">
              <div className="flex items-center justify-between gap-4"><span className="font-mono text-xs text-[#FF8A6D]">{p.n}</span><span className="text-end font-mono text-[9px] uppercase tracking-[0.13em] text-ink-500 sm:text-[10px]">{p.type}</span></div><div className="mt-5 grid size-11 place-items-center rounded-2xl border border-[#FF6B47]/25 bg-[#FF6B47]/[0.08] text-[#FF8A6D]">{p.icon === "audio" ? <FileAudioIcon className="size-5" /> : p.icon === "layers" ? <LayersIcon className="size-5" /> : p.icon === "globe" ? <GlobeIcon className="size-5" /> : <SparkIcon className="size-5" />}</div>
              <h3 className="mt-7 text-2xl font-medium tracking-tight text-ink-100 sm:text-3xl">{p.title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-ink-400">{p.body}</p>
              <div className="mt-auto pt-6">{p.internal?<Link href={p.href} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-200 transition group-hover:text-[#FF8A6D]">{p.action} ↗</Link>:<a href={p.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-200 transition group-hover:text-[#FF8A6D]">{p.action} ↗</a>}</div>
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -end-10 size-36 rounded-full border border-white/[0.07] transition group-hover:border-[#FF6B47]/25" />
            </article>)}
          </div>
        </section>

        <section className="mt-20 border-t border-white/[0.09] pt-12 sm:pt-16" aria-labelledby="maker-approach-title">
          <p className="font-mono text-[10px] tracking-[0.18em] text-[#FF8A6D]">{c.approachEyebrow}</p><h2 id="maker-approach-title" className="mt-3 max-w-3xl text-3xl font-medium tracking-tight text-ink-100 sm:text-4xl">{c.approachTitle}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-ink-400">{c.approachBody}</p>
          <div className="mt-8 grid gap-0 md:grid-cols-3">{c.principles.map(([n,title,body],i)=><article key={n} className={`py-5 md:pe-7 ${i===1?'border-y border-white/[0.09] md:border-x md:border-y-0 md:px-7':i===2?'border-t border-white/[0.09] md:border-0 md:ps-7':''}`}><span className="font-mono text-xs text-[#FF8A6D]">{n}</span><h3 className="mt-4 text-lg font-semibold text-ink-100">{title}</h3><p className="mt-2 text-sm leading-7 text-ink-400">{body}</p></article>)}</div>
        </section>

        <section className="maker-glass relative mt-20 overflow-hidden rounded-[2rem] border border-white/[0.10] bg-white/[0.035] p-7 backdrop-blur-2xl sm:p-10 lg:p-14">
          <div aria-hidden="true" className="absolute -end-20 -top-24 size-72 rounded-full bg-[#FF6B47]/[0.12] blur-[90px]" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end"><div><p className="font-mono text-[10px] tracking-[0.18em] text-[#FF8A6D]">{c.ctaEyebrow}</p><h2 className="mt-3 max-w-3xl text-3xl font-medium tracking-tight text-ink-100 sm:text-5xl">{c.ctaTitle}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-ink-400 sm:text-base">{c.ctaBody}</p></div><div className="flex flex-wrap gap-3 md:flex-col"><a href={CONTACT.whatsapp} target="_blank" rel="noreferrer noopener" className="maker-primary-button shine inline-flex items-center justify-center gap-2 rounded-full bg-[#FF6B47] px-5 py-3 text-sm font-semibold text-[#170B08] transition hover:bg-[#FF8A6D]">{c.start} ↗</a><a href={CONTACT.email} className="maker-glass inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-5 py-3 text-sm font-semibold text-ink-100 transition hover:border-[#FF6B47]/35">{c.email}</a></div></div>
          <div className="relative mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.09] pt-5"><span className="text-xs text-ink-500">{c.socials}</span><div className="flex flex-wrap gap-5"><a href={CONTACT.linkedin} target="_blank" rel="noreferrer noopener" className="text-xs text-ink-300 transition hover:text-[#FF8A6D]">LinkedIn ↗</a><a href={CONTACT.behance} target="_blank" rel="noreferrer noopener" className="text-xs text-ink-300 transition hover:text-[#FF8A6D]">Behance ↗</a><Link href="/" className="text-xs text-ink-300 transition hover:text-[#FF8A6D]">{c.back}</Link></div></div>
        </section>
      </div>
    </main>
  );
}
