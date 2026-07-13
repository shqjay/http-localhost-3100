"use client";

import Image from "next/image";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from "react";
import { gsap } from "gsap";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Command,
  Crown,
  Gauge,
  Layers3,
  LineChart,
  LockKeyhole,
  Menu,
  MessageCircle,
  Play,
  Quote,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Workflow,
  X,
  Zap
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue
} from "framer-motion";
import { cn } from "@/lib/cn";

const assetPrefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const registerUrl = assetPrefix + "/register/";

const navItems = ["Features", "Showcase", "Timeline", "Pricing", "FAQ"];
const navLabels: Record<string, string> = {
  Features: "功能",
  Showcase: "产品",
  Timeline: "上线流程",
  Pricing: "价格",
  FAQ: "常见问题"
};

const features = [
  {
    icon: Brain,
    title: "预测信号图谱",
    body: "AstraOS 将产品、销售管道与客户意向汇入一张实时图谱，在传统看板察觉之前预判业务动向。",
    accent: "from-violet-400 to-cyan-300"
  },
  {
    icon: Workflow,
    title: "自主工作流",
    body: "启动决策流程，自动分派审批、生成简报、更新 CRM，并向管理者同步进展。",
    accent: "from-blue-400 to-violet-300"
  },
  {
    icon: ShieldCheck,
    title: "企业级治理",
    body: "策略感知自动化通过权限、脱敏、回滚和人工检查点，让敏感操作始终可审计。",
    accent: "from-cyan-300 to-emerald-300"
  },
  {
    icon: Gauge,
    title: "即时指挥",
    body: "面向高压运营场景，以即时搜索、键盘优先导航和克制的信息层级加速行动。",
    accent: "from-fuchsia-300 to-blue-300"
  },
  {
    icon: Layers3,
    title: "上下文记忆",
    body: "为每项计划建立持久记忆层，持续记录假设、依赖、负责人和决策历史。",
    accent: "from-indigo-300 to-sky-300"
  },
  {
    icon: LockKeyhole,
    title: "私有 AI 架构",
    body: "通过租户隔离、角色级上下文和按风险分层的模型路由，让智能安全地贴近业务。",
    accent: "from-slate-100 to-cyan-300"
  }
];

const benefits = [
  "把每周业务复盘变成实时运营指挥室。",
  "在仍有行动窗口时识别流失、增长和管道风险。",
  "用一个清晰统一的指挥界面取代分散的运营流程。",
  "为每个团队配备真正理解公司运作方式的 AI 参谋。"
];

const timeline = [
  {
    phase: "01",
    title: "连接业务神经系统",
    body: "安全接入 CRM、客户支持、产品分析、文档与数据仓库中的事件流。"
  },
  {
    phase: "02",
    title: "建模运营节奏",
    body: "梳理周期流程、升级路径、决策负责人和影响收入的关键例外。"
  },
  {
    phase: "03",
    title: "启动自主任务",
    body: "部署可总结、排序、分派和执行的 AI 工作流，全程可追溯。"
  },
  {
    phase: "04",
    title: "沉淀组织记忆",
    body: "每次行动都会强化知识图谱，让下一周更快、更准、更主动。"
  }
];

const stats = [
  { value: "42%", label: "管理决策周期提速" },
  { value: "3.8 倍", label: "信号覆盖提升" },
  { value: "18 分钟", label: "洞察中位用时" },
  { value: "99.98%", label: "平台可用性" }
];

const testimonials = [
  {
    name: "Maya Rios",
    role: "首席营收官，Northstar Labs",
    body: "AstraOS 让我们的预测会议像提前进入了下一个十年。团队准备汇报之前，系统已经找到了真正的风险。",
    initials: "MR",
    avatar: `${assetPrefix}/avatars/maya.png`
  },
  {
    name: "Elliot Chen",
    role: "产品副总裁，Lumina Cloud",
    body: "它不像一套普通软件，更像一位沉着的运营伙伴。每个界面都兼具品味、速度与克制。",
    initials: "EC",
    avatar: `${assetPrefix}/avatars/elliot.png`
  },
  {
    name: "Sofia Hart",
    role: "首席运营官，Meridian AI",
    body: "我们用一个实时指挥中心取代了四套割裂的汇报流程。清晰度真正改变了管理团队的工作方式。",
    initials: "SH",
    avatar: `${assetPrefix}/avatars/sofia.png`
  }
];

const pricing = [
  {
    name: "信号版",
    price: "$89",
    caption: "适合开始试点自主运营的精干团队。",
    features: ["连接 3 个系统", "AI 简报室", "信号提醒", "核心分析"],
    cta: "开始使用"
  },
  {
    name: "指挥版",
    price: "$249",
    caption: "适合需要治理能力的成长型团队。",
    features: ["不限工作流数量", "策略护栏", "管理驾驶舱", "优先支持"],
    cta: "选择指挥版",
    popular: true
  },
  {
    name: "主权版",
    price: "定制",
    caption: "适合需要私有 AI 与复杂管控的企业。",
    features: ["专属租户", "自定义模型路由", "SAML 与 SCIM", "安全评审"],
    cta: "联系销售"
  }
];

const faqs = [
  {
    q: "AstraOS 多久可以上线？",
    a: "大多数团队可在两周内上线首个管理指挥室，随后随着数据质量和治理能力成熟，按职能逐步扩展工作流。"
  },
  {
    q: "这个平台会替代现有工具吗？",
    a: "不会。AstraOS 位于现有技术栈之上，把各类系统连接成具备上下文、记忆与行动引导的协同运营层。"
  },
  {
    q: "自动化流程可以设置审批吗？",
    a: "可以。每项任务都能加入人工审批、风险分级、审计记录、回滚说明和角色级权限。"
  },
  {
    q: "这套产品只适合技术团队吗？",
    a: "不是。它面向管理者、运营人员、产品负责人和分析师，以清晰体验取代无休止的看板堆叠。"
  }
];

export function LandingPage() {
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;

    const handleMove = (event: globalThis.MouseEvent) => {
      spotlightX.set(event.clientX);
      spotlightY.set(event.clientY);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [reduceMotion, spotlightX, spotlightY]);

  useGsapAtmosphere(reduceMotion);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-void text-white">
      {!reduceMotion && <MouseSpotlight x={spotlightX} y={spotlightY} />}
      <ParticleField />
      <AuroraBackdrops />
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <BenefitsSection />
      <TimelineSection />
      <StatsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}

function MouseSpotlight({ x, y }: { x: MotionValue<number>; y: MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 hidden opacity-70 mix-blend-screen md:block"
      style={{
        background: useMotionTemplate(x, y)
      }}
    />
  );
}

function useMotionTemplate(x: MotionValue<number>, y: MotionValue<number>) {
  const smoothX = useSpring(x, { stiffness: 90, damping: 24, mass: 0.4 });
  const smoothY = useSpring(y, { stiffness: 90, damping: 24, mass: 0.4 });
  return useTransform(
    [smoothX, smoothY],
    ([latestX, latestY]) =>
      `radial-gradient(420px circle at ${latestX}px ${latestY}px, rgba(124,58,237,.22), rgba(6,182,212,.10) 32%, transparent 68%)`
  );
}

function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 right-0 top-3 z-40 sm:top-4"
    >
      <nav className="section-shell glass gradient-border flex h-16 items-center justify-between rounded-2xl px-3 pl-4 sm:px-4 sm:pl-5">
        <a
          href="#top"
          onClick={() => setOpen(false)}
          className="focus-ring flex items-center gap-3 rounded-xl"
          aria-label="AstraOS 首页"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-white text-void shadow-cyan">
            <Command className="size-4" />
          </span>
          <span className="text-sm font-semibold">AstraOS</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item}
              href={"#" + item.toLowerCase()}
              className="focus-ring rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              {navLabels[item]}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <MagneticButton
            href={registerUrl}
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex"
          >
            <span>申请体验</span>
            <ArrowRight className="size-4" />
          </MagneticButton>
          <button
            type="button"
            className="focus-ring grid size-11 place-items-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-white md:hidden"
            aria-label={open ? "关闭导航" : "打开导航"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="section-shell glass mt-2 overflow-hidden rounded-2xl p-2 md:hidden"
          >
            {navItems.map((item) => (
              <a
                key={item}
                href={"#" + item.toLowerCase()}
                onClick={() => setOpen(false)}
                className="focus-ring flex min-h-12 items-center justify-between rounded-xl px-4 text-sm text-slate-200 transition hover:bg-white/[0.07]"
              >
                {navLabels[item]}
                <ArrowRight className="size-4 text-slate-500" />
              </a>
            ))}
            <a
              href={registerUrl}
              onClick={() => setOpen(false)}
              className="focus-ring mt-1 flex min-h-12 items-center justify-between rounded-xl bg-white px-4 text-sm font-semibold text-void"
            >
              申请体验
              <ArrowRight className="size-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function HeroSection() {
  return (
    <section id="top" className="relative flex min-h-[88svh] items-start overflow-hidden pb-0 pt-24 sm:pt-28">
      <div className="section-shell relative z-10">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.07] px-4 py-2 text-sm text-slate-200 shadow-glow backdrop-blur-xl">
              <Sparkles className="size-4 text-highlight" />
              面向现代管理者的自主营收智能
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-balance text-6xl font-black leading-[0.88] tracking-normal sm:text-7xl lg:text-8xl xl:text-[6.25rem]">
              <span className="block">AstraOS</span>
              <span className="text-gradient animate-shimmer block bg-[length:180%_auto]">
                先见一步
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-8 text-slate-300 sm:text-xl">
              电影级 AI 指挥层，将分散的业务信号转化为决策、工作流与管理洞察，在问题发生之前先一步行动。
            </p>
          </Reveal>
          <Reveal delay={0.28}>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <MagneticButton href={registerUrl} variant="primary">
                <span>申请私测</span>
                <ArrowRight className="size-5" />
              </MagneticButton>
              <MagneticButton href="#showcase" variant="secondary">
                <Play className="size-5 fill-white/[0.20]" />
                <span>查看产品</span>
              </MagneticButton>
            </div>
          </Reveal>
          <Reveal delay={0.36}>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-2 text-xs text-slate-400 sm:gap-6 sm:text-sm">
              {["SOC 2 就绪", "私有 AI 架构", "8 分钟接入"].map((item) => (
                <div key={item} className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left">
                  <Check className="size-4 text-highlight" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
      <div className="section-shell absolute -bottom-48 left-1/2 z-[5] -translate-x-1/2 lg:-bottom-52">
        <HeroConsole />
      </div>
      <div className="absolute bottom-5 right-6 z-10 hidden flex-col items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-500 md:flex">
        <span>向下</span>
        <span className="relative h-10 w-6 rounded-full border border-white/[0.18]">
          <span className="absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-full bg-highlight animate-scroll" />
        </span>
      </div>
    </section>
  );
}

function HeroConsole() {
  const reduceMotion = useReducedMotion();

  return (
    <Reveal delay={0.16}>
      <motion.div
        className="hero-console-crop relative mx-auto h-[240px] w-full max-w-[920px] overflow-hidden sm:h-[285px] lg:h-[320px]"
        animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-primary/30 via-accent/15 to-highlight/20 blur-3xl" />
        <div className="glass gradient-border noise relative overflow-hidden rounded-[2rem] p-3 shadow-luxury">
          <div className="rounded-[1.55rem] border border-white/10 bg-[#070b1d]/[0.82] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-rose-400" />
                <span className="size-3 rounded-full bg-amber-300" />
                <span className="size-3 rounded-full bg-emerald-300" />
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-300">
                实时任务
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_.7fr]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                      预测收入
                    </p>
                    <p className="mt-2 text-3xl font-bold">$1480 万</p>
                  </div>
                  <LineChart className="size-7 text-highlight" />
                </div>
                <div className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4">
                  <div className="absolute inset-x-4 bottom-7 h-px bg-white/10" />
                  <div className="absolute inset-y-4 left-8 w-px bg-white/10" />
                  <motion.div
                    className="absolute bottom-8 left-8 h-24 w-[72%] rounded-t-[50%] border-t-2 border-highlight shadow-cyan"
                    animate={reduceMotion ? undefined : { scaleX: [0.88, 1, 0.94, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: "left center" }}
                  />
                  {[26, 44, 34, 72, 58, 86].map((height, index) => (
                    <motion.span
                      key={height}
                      className="absolute bottom-8 w-3 rounded-full bg-gradient-to-t from-primary to-highlight"
                      style={{ left: `${22 + index * 12}%`, height }}
                      animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.7], y: [2, -3, 2] }}
                      transition={{ duration: 3.5, delay: index * 0.18, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-4">
                {[
                  ["流失风险", "12 个账户", "text-rose-200"],
                  ["增长机会", "$190 万", "text-cyan-200"],
                  ["待审批", "4 项排队中", "text-violet-200"]
                ].map(([label, value, color], index) => (
                  <motion.div
                    key={label}
                    className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"
                    animate={reduceMotion ? undefined : { x: [0, index % 2 ? -3 : 3, 0] }}
                    transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {label}
                    </p>
                    <p className={cn("mt-2 text-2xl font-bold", color)}>{value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-2xl bg-highlight/[.16] text-highlight">
                  <Zap className="size-4" />
                </span>
                <div>
                  <p className="font-semibold">AI 简报已生成</p>
                  <p className="text-sm text-slate-400">
                    已汇总 7 项风险，3 条流程等待审批
                  </p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-highlight"
                  animate={reduceMotion ? undefined : { width: ["42%", "82%", "72%", "92%"] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative pb-28 pt-4 sm:pb-36 sm:pt-20">
      <SectionHeading
        eyebrow="信号架构"
        title="告别看板堆叠，用一层系统掌控运营。"
        body="每项能力都围绕管理效率设计：减少切换、理清上下文、更快做出关键决策。"
      />
      <div className="section-shell mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:grid-flow-dense">
        {features.map((feature, index) => (
          <Reveal
            key={feature.title}
            delay={index * 0.05}
            className={cn(
              index === 0 && "lg:col-span-6 lg:row-span-2",
              index > 0 && index < 5 && "lg:col-span-3",
              index === 5 && "lg:col-span-12"
            )}
          >
            <motion.article
              whileHover={{ y: -10, scale: 1.015 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="group gradient-border glass feature-card relative h-full overflow-hidden rounded-lg p-7"
            >
              <div className="absolute -right-12 -top-12 size-36 rounded-full bg-primary/[.18] blur-3xl transition group-hover:bg-highlight/[.18]" />
              <div className={cn("mb-8 grid size-14 place-items-center rounded-2xl bg-gradient-to-br shadow-cyan", feature.accent)}>
                <feature.icon className="size-6 text-void" />
              </div>
              <h3 className="text-2xl font-bold">{feature.title}</h3>
              <p className="mt-4 leading-7 text-slate-400">{feature.body}</p>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ShowcaseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [2.5, -2.5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-3, 3]);

  const handleMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    x.set((event.clientX - bounds.left) / bounds.width - 0.5);
    y.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  return (
    <section id="showcase" className="relative py-28 sm:py-36">
      <SectionHeading
        eyebrow="产品实景"
        title="再复杂的业务，也能安静掌控。"
        body="AstraOS 将稠密的运营信息收束为清晰、从容且可执行的业务全景。"
      />
      <div className="section-shell mt-16">
        <motion.div
          ref={ref}
          onMouseMove={handleMove}
          onMouseLeave={() => {
            x.set(0);
            y.set(0);
          }}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative rounded-[2rem] will-change-transform"
        >
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-r from-primary/[.28] via-accent/[.16] to-highlight/[.24] blur-3xl" />
          <div className="gradient-border glass noise relative overflow-hidden rounded-[2rem] p-3">
            <div className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#060a19]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Command className="size-5 text-highlight" />
                  <span className="font-semibold">AstraOS 指挥台</span>
                </div>
                <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
                  <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.8)]" />
                  全部系统在线
                </div>
              </div>
              <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[240px_1fr_310px]">
                <aside className="hidden border-r border-white/10 bg-white/[0.025] p-4 lg:block">
                  {["概览", "信号", "任务", "审批", "记忆", "安全"].map((item, index) => (
                    <div
                      key={item}
                      className={cn(
                        "mb-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm",
                        index === 0 ? "bg-white/10 text-white" : "text-slate-500"
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-highlight" />
                      {item}
                    </div>
                  ))}
                </aside>
                <div className="p-5 sm:p-7">
                  <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    {stats.slice(0, 3).map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"
                        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                        transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <p className="text-3xl font-bold">{stat.value}</p>
                        <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="relative min-h-[360px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.025] p-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(124,58,237,.22),transparent_30%),radial-gradient(circle_at_82%_70%,rgba(6,182,212,.18),transparent_28%)]" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.28em] text-slate-500">
                          任务地图
                        </p>
                        <h3 className="mt-3 text-3xl font-bold">增长情报</h3>
                      </div>
                      <Rocket className="size-8 text-highlight" />
                    </div>
                    <div className="relative mt-10 grid gap-4 md:grid-cols-3">
                      {["意向激增", "法务评审", "续约风险"].map((item, index) => (
                        <motion.div
                          key={item}
                          className="rounded-3xl border border-white/10 bg-[#080d20]/[0.78] p-5 shadow-luxury backdrop-blur-xl"
                          style={{ transform: `translateZ(${36 + index * 18}px)` }}
                          whileHover={{ y: -8 }}
                        >
                          <div className="mb-8 h-24 rounded-2xl bg-gradient-to-br from-primary/30 via-accent/[.14] to-highlight/20 p-3">
                            <div className="h-full rounded-xl border border-white/10 bg-white/[0.08]" />
                          </div>
                          <p className="font-semibold">{item}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            AI 已给出负责人、下一步动作与置信度。
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <aside className="border-t border-white/10 bg-white/[0.025] p-5 lg:border-l lg:border-t-0">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                      AI 简报
                    </p>
                    <p className="mt-4 text-lg font-semibold">
                      Q3 风险集中在产品采用率低于 42% 的企业续约客户。
                    </p>
                    <div className="mt-6 space-y-3">
                      {["分派客户成功升级", "生成 CFO 摘要", "发起定价评审"].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-sm text-slate-300">
                          <Check className="size-4 text-highlight" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-scan" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="relative py-28 sm:py-36">
      <div className="section-shell grid gap-14 lg:grid-cols-[.82fr_1fr] lg:items-center">
        <SectionHeading
          contained={false}
          align="left"
          eyebrow="为何选择 AstraOS"
          title="从被动汇报，走向提前决策。"
          body="AstraOS 为管理团队提供更清晰、更优雅的方式来观察、决策并推动业务。"
        />
        <div className="grid gap-4">
          {benefits.map((benefit, index) => (
            <Reveal key={benefit} delay={index * 0.07}>
              <motion.div
                whileHover={{ x: 8 }}
                className="benefit-row flex items-start gap-5 border-t border-white/10 py-6"
              >
                <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-2xl bg-highlight/15 text-highlight">
                  <Check className="size-5" />
                </span>
                <p className="text-lg leading-8 text-slate-200">{benefit}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  return (
    <section id="timeline" className="relative py-28 sm:py-36">
      <SectionHeading
        eyebrow="上线流程"
        title="从首个信号到自主执行，路径清晰可控。"
        body="平台以渐进方式建立信任，再将智能能力扩展到整个组织。"
      />
      <div className="section-shell mt-16">
        <div className="relative grid gap-5 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-white/[0.20] to-transparent lg:block" />
          {timeline.map((item, index) => (
            <Reveal key={item.phase} delay={index * 0.08}>
              <motion.article
                whileHover={{ y: -8 }}
                className="timeline-card relative rounded-lg border border-white/10 bg-white/[0.035] p-6"
              >
                <span className="mb-8 grid size-14 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.08] text-lg font-black text-highlight shadow-cyan">
                  {item.phase}
                </span>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-4 leading-7 text-slate-400">{item.body}</p>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="relative py-24">
      <div className="section-shell stats-band overflow-hidden border-y border-white/10 bg-[#080b14] p-8 sm:p-12">
        <div className="grid gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.05}>
              <div className="text-center">
                <p className="text-5xl font-black text-gradient sm:text-6xl">{stat.value}</p>
                <p className="mt-3 text-sm uppercase tracking-[0.2em] text-slate-400">
                  {stat.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="relative py-28 sm:py-36">
      <SectionHeading
        eyebrow="管理者评价"
        title="优秀团队不需要更多噪音，只需要更清晰的重心。"
        body="与重视克制、速度和长期体验的管理者共同设计。"
      />
      <div className="section-shell mt-16 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        {testimonials.map((testimonial, index) => (
          <Reveal
            key={testimonial.name}
            delay={index * 0.07}
            className={cn(index === 0 && "lg:row-span-2")}
          >
            <motion.article
              whileHover={{ y: -6 }}
              className={cn(
                "glass gradient-border h-full rounded-lg p-7",
                index === 0 && "flex min-h-[420px] flex-col justify-between sm:p-9"
              )}
            >
              <div>
                <div className="mb-8 flex items-center justify-between">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={64}
                    height={64}
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                    className="testimonial-avatar"
                  />
                  <div className="flex gap-1 text-amber-300" aria-label="五星评价">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="size-4 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                </div>
                <Quote className="mb-5 size-7 text-highlight" />
                <p className={cn("leading-8 text-slate-200", index === 0 ? "text-2xl sm:text-3xl sm:leading-10" : "text-lg")}>
                  {testimonial.body}
                </p>
              </div>
              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="mt-1 text-sm text-slate-400">{testimonial.role}</p>
              </div>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="relative py-28 sm:py-36">
      <SectionHeading
        eyebrow="价格"
        title="选择适合团队当前阶段的智能深度。"
        body="从轻量起步，在智能运营融入组织节奏后持续扩展。"
      />
      <div className="section-shell mt-16 grid gap-5 lg:grid-cols-3">
        {pricing.map((plan, index) => (
          <Reveal key={plan.name} delay={index * 0.08}>
            <motion.article
              whileHover={{ y: -12 }}
              className={cn(
                "relative h-full overflow-hidden rounded-xl p-7",
                plan.popular ? "gradient-border glass shadow-glow" : "glass"
              )}
            >
              {plan.popular && (
                <div className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-void">
                  推荐
                </div>
              )}
              <Crown className={cn("mb-8 size-8", plan.popular ? "text-highlight" : "text-slate-500")} />
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="mt-3 min-h-14 leading-7 text-slate-400">{plan.caption}</p>
              <div className="my-8 flex items-end gap-2">
                <span className="text-5xl font-black">{plan.price}</span>
                {plan.price.startsWith("$") && <span className="pb-2 text-slate-500">/月</span>}
              </div>
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-slate-300">
                    <Check className="size-4 text-highlight" />
                    {feature}
                  </div>
                ))}
              </div>
              <MagneticButton
                href={registerUrl}
                className="mt-8 w-full justify-center"
                variant={plan.popular ? "primary" : "secondary"}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="size-5" />
              </MagneticButton>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="relative py-28 sm:py-36">
      <div className="section-shell grid gap-12 lg:grid-cols-[.72fr_1fr]">
        <SectionHeading
          contained={false}
          align="left"
          eyebrow="常见问题"
          title="先建立信任，再释放自主能力。"
          body="AstraOS 以可控的治理模型引入自动化，让团队提速而不失稳健。"
        />
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const expanded = open === index;
            const buttonId = "faq-button-" + index;
            const panelId = "faq-panel-" + index;

            return (
              <Reveal key={faq.q} delay={index * 0.04}>
                <article className="faq-item">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      onClick={() => setOpen(expanded ? -1 : index)}
                      className="focus-ring faq-trigger"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                    >
                      <span>{faq.q}</span>
                      <span className="faq-icon" aria-hidden="true">
                        {expanded ? <X className="size-4" /> : <ChevronDown className="size-4" />}
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="faq-answer">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section id="cta" className="relative py-28 sm:py-36">
      <div className="section-shell cta-band relative overflow-hidden border-y border-white/[0.12] bg-white/[0.04] p-8 sm:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(124,58,237,.38),transparent_32%),radial-gradient(circle_at_85%_35%,rgba(6,182,212,.28),transparent_28%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.50] to-transparent" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
              <MessageCircle className="size-4 text-highlight" />
              私享式接入现已开放
            </div>
            <h2 className="max-w-3xl text-balance text-5xl font-black leading-[0.95] tracking-normal sm:text-7xl">
              让公司进入更聪明的运营节奏。
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
              与 AstraOS 一起打造更从容、更快速、更智能的管理运营方式。
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
            <MagneticButton href={registerUrl} variant="primary">
              <span>预约策略沟通</span>
              <ArrowRight className="size-5" />
            </MagneticButton>
            <MagneticButton href="#showcase" variant="secondary">
              <span>查看产品</span>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="section-shell flex flex-col gap-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-white text-void">
            <Command className="size-4" />
          </span>
          <span className="font-semibold text-slate-200">AstraOS</span>
          <span>(c) 2026 AstraOS 公司</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <a className="transition hover:text-white" href="#features">
            功能
          </a>
          <a className="transition hover:text-white" href="#pricing">
            价格
          </a>
          <a className="transition hover:text-white" href="mailto:security@astraos.ai">
            安全
          </a>
          <a className="transition hover:text-white" href="mailto:hello@astraos.ai">
            联系我们
          </a>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  contained = true
}: {
  eyebrow: string;
  title: string;
  body: string;
  align?: "left" | "center";
  contained?: boolean;
}) {
  return (
    <div
      className={cn(
        contained && "section-shell",
        align === "center" ? "text-center" : "text-left"
      )}
    >
      <Reveal>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-highlight">
          {eyebrow}
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className={cn("text-balance text-4xl font-black leading-tight tracking-normal sm:text-6xl", align === "center" && "mx-auto max-w-4xl")}>
          {title}
        </h2>
      </Reveal>
      <Reveal delay={0.16}>
        <p className={cn("mt-6 text-lg leading-8 text-slate-400", align === "center" ? "mx-auto max-w-2xl" : "max-w-xl")}>
          {body}
        </p>
      </Reveal>
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
      animate={
        reduceMotion || isInView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : undefined
      }
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 22 });
  const springY = useSpring(y, { stiffness: 300, damping: 22 });

  const handleMove = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (reduceMotion || window.matchMedia("(pointer: coarse)").matches) return;
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    x.set((event.clientX - bounds.left - bounds.width / 2) * 0.12);
    y.set((event.clientY - bounds.top - bounds.height / 2) * 0.12);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <a
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn("focus-ring inline-flex", className)}
    >
      <motion.span
        style={{ x: springX, y: springY }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        className={cn(
          "group relative inline-flex w-full items-center gap-3 overflow-hidden rounded-full font-semibold transition",
          size === "sm" ? "px-4 py-2 text-sm" : "px-6 py-4",
          variant === "primary" &&
            "bg-white text-void shadow-[0_0_48px_rgba(6,182,212,.24)] hover:shadow-[0_0_64px_rgba(124,58,237,.28)]",
          variant === "secondary" &&
            "border border-white/[0.14] bg-white/[0.08] text-white backdrop-blur-xl hover:border-white/[0.24] hover:bg-white/[0.12]",
          variant === "ghost" &&
            "border border-white/[0.12] bg-white/[0.07] text-white backdrop-blur-xl hover:bg-white/[0.12]"
        )}
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.26] to-transparent transition duration-700 group-hover:translate-x-full" />
        <span className="relative z-10 inline-flex items-center gap-3">{children}</span>
      </motion.span>
    </a>
  );
}

function AuroraBackdrops() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="gsap-float aurora absolute -left-44 top-10 size-[34rem] rounded-full opacity-80" />
      <div className="gsap-float aurora absolute right-[-18rem] top-[32rem] size-[40rem] rounded-full opacity-55" />
      <div className="gsap-float aurora absolute bottom-[24rem] left-1/3 size-[30rem] rounded-full opacity-45" />
    </div>
  );
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.4 + 0.35,
        vx: (Math.random() - 0.5) * 0.00022,
        vy: (Math.random() - 0.5) * 0.00022,
        alpha: Math.random() * 0.36 + 0.12
      })),
    []
  );

  useEffect(() => {
    if (reduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > 1) particle.vx *= -1;
        if (particle.y < 0 || particle.y > 1) particle.vy *= -1;

        const px = particle.x * width;
        const py = particle.y * height;
        const color =
          index % 3 === 0
            ? "6,182,212"
            : index % 3 === 1
              ? "124,58,237"
              : "255,255,255";

        context.beginPath();
        context.arc(px, py, particle.r, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + color + "," + particle.alpha + ")";
        context.fill();
      });
      frame = requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [particles, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden opacity-45 sm:block"
    />
  );
}

function useGsapAtmosphere(reduceMotion: boolean | null) {
  useEffect(() => {
    if (reduceMotion) return;

    const context = gsap.context(() => {
      gsap.to(".gsap-float", {
        y: "random(-8, 8)",
        x: "random(-5, 5)",
        rotate: "random(-1.5, 1.5)",
        duration: "random(7, 11)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.24
      });
    });

    return () => context.revert();
  }, [reduceMotion]);
}
