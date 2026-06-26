import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/SiteLayout";
import { useAuth } from "@/components/auth-context";
import { getPageContent, adminUpsertPageContent } from "@/lib/api/page-content.functions";

export const Route = createFileRoute("/creator-qa")({
  head: () => ({
    meta: [
      { title: "创作者问答 · 女性友好体验测评" },
      {
        name: "description",
        content: "创作者访谈：为什么做这个平台、如何防止情绪化、如何盈利。为姐妹们留一盏灯。",
      },
      { property: "og:title", content: "创作者问答 | 为姐妹们留一盏灯" },
      {
        property: "og:description",
        content: "创作者访谈：为什么做这个平台、如何防止情绪化、如何盈利。",
      },
    ],
    links: [{ rel: "canonical", href: "/creator-qa" }],
  }),
  component: CreatorQAPage,
});

type QA = { q: string; a: string };
type QAContent = { title: string; subtitle: string; intro?: string; items: QA[] };

const DEFAULT_CONTENT: QAContent = {
  title: "创作者访谈",
  subtitle: "为姐妹们留一盏灯",
  intro: "",
  items: [
    {
      q: "为什么会想做这样一个平台？",
      a: "很简单，我想找一个「不会被闭麦」的地方。这个平台首先服务我自己，我经常被各大平台限流，而我的发言也仅仅是对女性被错误对待之后的陈述。所以，我深切地感受到，当女性在生活中感到被冒犯时，需要一个能安全发声的角落。我也希望，所有有着相同价值观的姐妹，能在这里认出彼此，不再孤单。",
    },
    {
      q: "完全开放发言，不怕社区变成情绪宣泄的「垃圾场」吗？",
      a: "所以我们请来了 AI 当「守门人」。它不会删掉姐妹的原话，而是负责提炼内容，把那些典型的「厌女」逻辑标记出来，作为我们观察和记录的证据。",
    },
    {
      q: "如果姐妹们只是愤怒地吐槽，没有条理清晰的论证，AI 怎么算？品牌方又怎么看？",
      a: "这一点请大家放心。只有那些明确指出「哪个产品/作品、具体做了什么、为何厌女」的高质量反馈，才会纳入该品牌的「厌女指数」评估。\n\n但同时，我们绝不过滤情绪。哪怕表述不够完美，每一位姐妹的感受都值得被看见。我们鼓励精准表达以监督市场，也鼓励释放情绪——因为品牌不仅需要听到理性的批评，更需要看见真实的痛感，这才能倒逼出更好的产品：「什么样的产品、影视作品和服务，才是真正能得到女性认可的」。",
    },
    {
      q: "运营平台很耗精力，你打算怎么盈利？",
      a: "我的答案是：不盈利。\n\n如果在起步阶段就盯着赚钱，这个平台的底色就会变。短期内，这里就是姐妹们纯粹的「发声空地」。\n\n未来如果有了影响力，我们只接受女性创立、真正服务女性的品牌来做推广——目的是帮优秀的女性创业者找到同频的用户，而不是为了流量变现。最重要的是，这里的规则对谁都一视同仁：无论谁，只要做出厌女行为，观察名单上见。我们的独立与清醒，永不出售。",
    },
    {
      q: "不盈利很不现实，这让人觉得很假",
      a: "因为有 AI 的加持，制作一个这样的平台比「过去那个时代」要便宜很多，目前这个成本是我个人能够承受的，且不需要投靠资本也能活下去。",
    },
  ],
};

function CreatorQAPage() {
  const { isAdmin } = useAuth();
  const fetchContent = useServerFn(getPageContent);
  const saveContent = useServerFn(adminUpsertPageContent);

  const [content, setContent] = useState<QAContent>(DEFAULT_CONTENT);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContent({ data: { slug: "creator-qa" } })
      .then((row) => {
        if (cancelled || !row) return;
        try {
          const body = JSON.parse(row.bodyJson) as Partial<QAContent> | null;
          if (body && Array.isArray(body.items)) {
            setContent({ ...DEFAULT_CONTENT, ...body, items: body.items as QA[] });
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchContent]);

  function startEdit() {
    setDraft(JSON.stringify(content, null, 2));
    setEditing(true);
    setMsg(null);
  }

  async function save() {
    setMsg(null);
    let parsed: QAContent;
    try {
      parsed = JSON.parse(draft) as QAContent;
      if (!parsed.items || !Array.isArray(parsed.items)) throw new Error("items 必须是数组");
    } catch (e) {
      setMsg("JSON 格式错误：" + (e as Error).message);
      return;
    }
    setSaving(true);
    try {
      await saveContent({ data: { slug: "creator-qa", body: parsed } });
      setContent(parsed);
      setEditing(false);
      setMsg("已保存");
    } catch (e) {
      setMsg("保存失败：" + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <section className="border-b border-border">
        <div className="container-prose py-14">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Creator Q&amp;A
          </p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">
            {content.title} <span className="text-accent">|</span> {content.subtitle}
          </h1>
          {content.intro ? (
            <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {content.intro}
            </p>
          ) : null}

          {isAdmin && !editing ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={startEdit}
                className="border border-accent px-4 py-2 text-sm text-accent hover:bg-accent hover:text-accent-foreground"
              >
                编辑内容
              </button>
              {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
            </div>
          ) : null}
        </div>
      </section>

      {editing ? (
        <section className="border-b border-border bg-muted/30 py-10">
          <div className="container-prose">
            <p className="text-xs text-muted-foreground">
              编辑 JSON（字段：title / subtitle / intro / items[{`{q, a}`}]）
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-3 h-[480px] w-full border border-border bg-background p-3 font-mono text-xs"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="bg-accent px-5 py-2 text-sm text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="border border-border px-5 py-2 text-sm hover:border-foreground"
              >
                取消
              </button>
              {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-14">
        <div className="container-prose space-y-10">
          {content.items.map((item, i) => (
            <article key={i} className="border-l-2 border-accent pl-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent">
                Q{String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 font-serif text-xl md:text-2xl">{item.q}</h2>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                <span className="mr-2 font-medium text-accent">A：</span>
                {item.a}
              </p>
            </article>
          ))}

          <div className="mt-10 flex flex-wrap gap-3 text-sm">
            <Link
              to="/how-we-judge"
              className="border border-border px-4 py-2 hover:border-foreground"
            >
              ← 返回判断说明
            </Link>
            <Link
              to="/points-system"
              className="border border-border px-4 py-2 hover:border-foreground"
            >
              积分制度
            </Link>
            <Link
              to="/leaderboard"
              className="border border-border px-4 py-2 hover:border-foreground"
            >
              贡献榜
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
