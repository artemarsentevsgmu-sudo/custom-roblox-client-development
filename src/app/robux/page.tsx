"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/components/SessionProvider";
import { EmptyState, Robux, SectionHeader, Skeleton, Stat, Tabs } from "@/components/ui";
import { compact, fetcher, full, rbxUrl, timeAgo } from "@/lib/client";

type Totals = Record<string, number>;
type Txn = {
  id: number;
  created: string;
  isPending: boolean;
  agent?: { id: number; type: string; name: string };
  details?: { id: number; name: string; type: string };
  currency?: { amount: number; type: string };
};
type TxnPayload = { data?: Txn[] };

const TYPES = [
  { id: "Purchase", label: "Покупки" },
  { id: "Sale", label: "Продажи" },
  { id: "Commission", label: "Комиссии" },
  { id: "GroupPayout", label: "Выплаты групп" },
  { id: "PremiumStipend", label: "Premium-стипендия" },
  { id: "TradeRobux", label: "Трейды" },
  { id: "CurrencyPurchase", label: "Пополнения" },
];

const TOTAL_LABELS: Record<string, string> = {
  salesTotal: "Продажи",
  purchasesTotal: "Покупки",
  affiliateSalesTotal: "Партнёрские продажи",
  groupPayoutsTotal: "Выплаты групп",
  currencyPurchasesTotal: "Пополнения Robux",
  premiumStipendsTotal: "Premium-стипендия",
  tradeSystemEarningsTotal: "Доход с трейдов",
  tradeSystemCostsTotal: "Расходы на трейды",
  pendingRobuxTotal: "В ожидании",
  incomingRobuxTotal: "Всего получено",
  outgoingRobuxTotal: "Всего потрачено",
  individualToGroupTotal: "Переводы в группы",
  commissionsTotal: "Комиссии",
};

export default function RobuxPage() {
  const { me, openLogin } = useSession();
  const userId = me?.user?.id;
  const [type, setType] = useState("Purchase");
  const [frame, setFrame] = useState<"Day" | "Week" | "Month" | "Year">("Month");

  const { data: totals, isLoading: loadingTotals } = useSWR<Totals>(
    userId
      ? rbxUrl(
          `economy.roblox.com/v1/users/${userId}/transaction-totals?timeFrame=${frame}&transactionType=summary`,
          60_000,
        )
      : null,
    fetcher,
  );
  const { data: txns, isLoading } = useSWR<TxnPayload>(
    userId
      ? rbxUrl(
          `economy.roblox.com/v2/users/${userId}/transactions?transactionType=${type}&limit=30&sortOrder=Desc`,
          30_000,
        )
      : null,
    fetcher,
  );

  if (!me?.authenticated) {
    return (
      <EmptyState
        emoji="💰"
        title="Войдите, чтобы видеть баланс Robux"
        hint="Счётчик баланса, история транзакций, стипендия Premium и доходы групп."
        action={
          <button className="btn btn-primary mt-3" onClick={openLogin}>
            Войти
          </button>
        }
      />
    );
  }

  const history = me.balanceHistory ?? [];
  const max = Math.max(1, ...history.map((h) => h.robux));

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel relative overflow-hidden p-6">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Robux className="h-4 w-4" /> Текущий баланс
            </div>
            <div className="mt-2 text-5xl font-black text-white">{full(me.stats?.robux ?? null)}</div>
            <div className="muted mt-1 text-sm">
              ≈ {compact(Math.round((me.stats?.robux ?? 0) * 0.0035 * 100) / 100)} USD по курсу DevEx
            </div>
            <div className="mt-6 flex h-24 items-end gap-1.5">
              {(history.length ? history : Array.from({ length: 14 }, () => ({ robux: 0, capturedAt: "" }))).map(
                (h, i) => (
                  <div key={i} className="group relative flex-1">
                    <div
                      className="rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(8, (h.robux / max) * 96)}px`,
                        background:
                          i === history.length - 1
                            ? "linear-gradient(180deg,#ffd166,#ff9f1c)"
                            : "rgba(255,255,255,0.14)",
                      }}
                    />
                  </div>
                ),
              )}
            </div>
            <div className="muted mt-2 text-[11px]">Снимки баланса сохраняются в базе Nova</div>
          </div>
        </div>

        <div className="panel p-6">
          <SectionHeader
            title="Сводка"
            subtitle="Данные Roblox Economy API"
            action={
              <select
                className="input h-9 w-auto py-1.5 text-xs"
                value={frame}
                onChange={(e) => setFrame(e.target.value as typeof frame)}
              >
                <option value="Day">За день</option>
                <option value="Week">За неделю</option>
                <option value="Month">За месяц</option>
                <option value="Year">За год</option>
              </select>
            }
          />
          {loadingTotals ? <Skeleton className="h-40 w-full" /> : null}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(totals ?? {})
              .filter(([, v]) => typeof v === "number" && v !== 0)
              .slice(0, 10)
              .map(([k, v]) => (
                <div key={k} className="panel-soft px-3 py-2">
                  <div className="muted text-[10px] uppercase">{TOTAL_LABELS[k] ?? k}</div>
                  <div
                    className={`text-sm font-extrabold ${v > 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {v > 0 ? "+" : ""}
                    {full(v)}
                  </div>
                </div>
              ))}
            {totals && !Object.values(totals).some((v) => v !== 0) ? (
              <p className="muted col-span-2 text-sm">Нет операций за выбранный период</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="В ожидании"
          value={`${full(totals?.pendingRobuxTotal ?? 0)} R$`}
          hint="станут доступны в течение 3–7 дней"
          accent="#ffb020"
        />
        <Stat
          label="Получено"
          value={`${full(totals?.incomingRobuxTotal ?? 0)} R$`}
          hint={`за период: ${frame}`}
          accent="#3ddc84"
        />
        <Stat
          label="Потрачено"
          value={`${full(totals?.outgoingRobuxTotal ?? 0)} R$`}
          hint={`за период: ${frame}`}
          accent="#ff5c8a"
        />
      </section>

      <div className="panel p-5">
        <SectionHeader title="История транзакций" />
        <Tabs tabs={TYPES.map((t) => ({ id: t.id, label: t.label }))} value={type} onChange={setType} />
        <div className="mt-4 space-y-2">
          {isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {(txns?.data ?? []).map((t) => (
            <div
              key={t.id}
              className="panel-soft flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">
                  {t.details?.name ?? t.details?.type ?? "Операция"}
                </div>
                <div className="muted text-[11px]">
                  {t.agent?.name ? `${t.agent.name} · ` : ""}
                  {timeAgo(t.created)}
                  {t.isPending ? " · в ожидании" : ""}
                </div>
              </div>
              <div
                className={`font-extrabold ${(t.currency?.amount ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}
              >
                {(t.currency?.amount ?? 0) > 0 ? "+" : ""}
                {full(t.currency?.amount ?? 0)} R$
              </div>
            </div>
          ))}
          {!isLoading && !(txns?.data ?? []).length ? (
            <p className="muted py-6 text-center text-sm">Операций не найдено</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
