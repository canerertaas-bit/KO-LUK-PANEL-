import { useMemo, useState } from "react";
import { formatDate, formatMoney, monthRange, parseAmount, todayIso, yearRange } from "../lib/format";
import { buttonDanger, buttonGhost, buttonPrimary, buttonSecondary, Field, inputClass, Modal } from "./ui";

const INCOME = ["Danışan ödemesi", "Paket satışı", "Özel ders", "Diğer gelir"];
const EXPENSE = ["Reklam", "Kira", "Yazılım", "Ulaşım", "Malzeme", "Diğer gider"];

function blankEntry(type) {
  return {
    id: "",
    type,
    amount: "",
    date: todayIso(),
    category: type === "income" ? INCOME[0] : EXPENSE[0],
    note: "",
    clientId: "",
    createdAt: "",
  };
}

export default function FinanceView({ data, onCommit }) {
  const [preset, setPreset] = useState("month");
  const [range, setRange] = useState(() => monthRange(0));
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = useMemo(() => {
    return data.transactions
      .filter((entry) => entry.date >= range.from && entry.date <= range.to)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [data.transactions, range.from, range.to]);

  const summary = useMemo(() => {
    const income = filtered.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const expense = filtered.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    return { income, expense, net: Math.round((income - expense) * 100) / 100 };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const entry of filtered) {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date).push(entry);
    }
    return [...map.entries()];
  }, [filtered]);

  function choosePreset(next) {
    setPreset(next);
    if (next === "month") setRange(monthRange(0));
    if (next === "prev") setRange(monthRange(-1));
    if (next === "year") setRange(yearRange());
  }

  function saveForm(event) {
    event.preventDefault();
    const amount = parseAmount(form.amount);
    if (!Number.isFinite(amount)) {
      setFormError("Geçerli bir tutar yaz. Örnek: 1500 veya 1.500,50");
      return;
    }
    if (!form.date) {
      setFormError("Tarih gerekli.");
      return;
    }
    const next = {
      id: form.id || crypto.randomUUID(),
      type: form.type,
      amount,
      date: form.date,
      category: form.category,
      note: form.note.trim(),
      clientId: form.type === "income" ? form.clientId : "",
      createdAt: form.createdAt || new Date().toISOString(),
    };
    onCommit((current) => {
      const exists = current.transactions.some((entry) => entry.id === next.id);
      return {
        ...current,
        transactions: exists
          ? current.transactions.map((entry) => (entry.id === next.id ? next : entry))
          : [next, ...current.transactions],
      };
    });
    setForm(null);
  }

  const netLabel = summary.net > 0 ? "Net kâr" : summary.net < 0 ? "Net zarar" : "Başabaş";
  const netClass = summary.net > 0 ? "text-good" : summary.net < 0 ? "text-bad" : "text-paper";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <PresetButton active={preset === "month"} onClick={() => choosePreset("month")}>
          Bu ay
        </PresetButton>
        <PresetButton active={preset === "prev"} onClick={() => choosePreset("prev")}>
          Geçen ay
        </PresetButton>
        <PresetButton active={preset === "year"} onClick={() => choosePreset("year")}>
          Bu yıl
        </PresetButton>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Başlangıç">
          <input
            className={inputClass}
            type="date"
            value={range.from}
            onChange={(event) => {
              setPreset("custom");
              setRange((current) => ({ ...current, from: event.target.value }));
            }}
          />
        </Field>
        <Field label="Bitiş">
          <input
            className={inputClass}
            type="date"
            value={range.to}
            onChange={(event) => {
              setPreset("custom");
              setRange((current) => ({ ...current, to: event.target.value }));
            }}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Toplam gelir" value={formatMoney(summary.income)} tone="text-good" />
        <SummaryCard label="Toplam gider" value={formatMoney(summary.expense)} tone="text-bad" />
        <SummaryCard label={netLabel} value={formatMoney(summary.net)} tone={netClass} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={buttonPrimary}
          onClick={() => {
            setFormError("");
            setForm(blankEntry("income"));
          }}
        >
          Gelir ekle
        </button>
        <button
          type="button"
          className={buttonSecondary}
          onClick={() => {
            setFormError("");
            setForm(blankEntry("expense"));
          }}
        >
          Gider ekle
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-5 py-12 text-center">
          <p className="font-display text-2xl">Bu aralıkta hareket yok</p>
          <p className="mt-2 text-sm text-mist">Gelen ödemeleri ve giden giderleri buradan işle.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, entries]) => {
            const dayNet = entries.reduce(
              (sum, entry) => sum + (entry.type === "income" ? entry.amount : -entry.amount),
              0,
            );
            return (
              <section key={date}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h3 className="text-sm font-medium text-mist">{formatDate(date)}</h3>
                  <span className={`text-sm font-semibold ${dayNet >= 0 ? "text-good" : "text-bad"}`}>
                    {formatMoney(dayNet)}
                  </span>
                </div>
                <div className="overflow-hidden rounded-3xl border border-line bg-card">
                  {entries.map((entry) => {
                    const client = data.clients.find((item) => item.id === entry.clientId);
                    return (
                <article key={entry.id} className="border-b border-line px-4 py-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{entry.category}</p>
                          <p className="truncate text-xs text-mist">
                            {[client?.name, entry.note].filter(Boolean).join(" · ") || "Not yok"}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-semibold ${entry.type === "income" ? "text-good" : "text-bad"}`}>
                          {entry.type === "income" ? "+" : "−"}
                          {formatMoney(entry.amount)}
                        </p>
                      </div>
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          className={buttonGhost}
                          onClick={() => {
                            setFormError("");
                            setForm({ ...entry, amount: String(entry.amount).replace(".", ",") });
                          }}
                        >
                          Düzenle
                        </button>
                        <button type="button" className={buttonGhost} onClick={() => setPendingDelete(entry)}>
                          Sil
                        </button>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {form ? (
        <Modal title={form.id ? "Hareketi düzenle" : form.type === "income" ? "Gelir" : "Gider"} onClose={() => setForm(null)}>
          <form className="space-y-4" onSubmit={saveForm}>
            <Field label="Tutar">
              <input
                className={inputClass}
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="1500"
                required
              />
            </Field>
            <Field label="Tarih">
              <input
                className={inputClass}
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </Field>
            <Field label="Kategori">
              <select
                className={inputClass}
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {(form.type === "income" ? INCOME : EXPENSE).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            {form.type === "income" ? (
              <Field label="Danışan">
                <select
                  className={inputClass}
                  value={form.clientId}
                  onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                >
                  <option value="">Bağlama</option>
                  {data.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Not">
              <input
                className={inputClass}
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </Field>
            {formError ? <p className="text-sm text-bad">{formError}</p> : null}
            <div className="flex gap-2">
              <button type="button" className={`${buttonSecondary} flex-1`} onClick={() => setForm(null)}>
                Vazgeç
              </button>
              <button type="submit" className={`${buttonPrimary} flex-1`}>
                Kaydet
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal title="Hareketi sil" onClose={() => setPendingDelete(null)}>
          <p className="text-sm leading-6 text-mist">
            {formatMoney(pendingDelete.amount)} tutarındaki kayıt silinecek.
          </p>
          <div className="mt-6 flex gap-2">
            <button type="button" className={`${buttonSecondary} flex-1`} onClick={() => setPendingDelete(null)}>
              Vazgeç
            </button>
            <button
              type="button"
              className={`${buttonDanger} flex-1`}
              onClick={() => {
                onCommit((current) => ({
                  ...current,
                  transactions: current.transactions.filter((entry) => entry.id !== pendingDelete.id),
                }));
                setPendingDelete(null);
              }}
            >
              Sil
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function PresetButton({ active, onClick, children }) {
  return (
    <button type="button" className={active ? buttonPrimary : buttonSecondary} onClick={onClick}>
      {children}
    </button>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <article className="rounded-3xl border border-line bg-card px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className={`mt-2 font-display text-3xl leading-none ${tone}`}>{value}</p>
    </article>
  );
}
