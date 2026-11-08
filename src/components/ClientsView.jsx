import { useMemo, useState } from "react";
import { daysLeft, fold, formatShortDate, todayIso } from "../lib/format";
import { buttonDanger, buttonGhost, buttonPrimary, buttonSecondary, Field, inputClass, Modal } from "./ui";

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "active", label: "Aktifler" },
  { id: "passive", label: "Pasifler" },
];

function wholeNumber(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return NaN;
  return Number(text);
}

function blankClient(group) {
  return {
    id: "",
    group,
    name: "",
    packageName: "",
    phone: "",
    note: "",
    status: "active",
    startDate: todayIso(),
    endDate: "",
    totalLessons: "8",
    remainingLessons: "8",
    createdAt: "",
  };
}

function clientToForm(client) {
  return {
    ...blankClient(client.group),
    ...client,
    totalLessons: client.totalLessons ?? "",
    remainingLessons: client.remainingLessons ?? "",
  };
}

function onlineTone(client) {
  if (client.status !== "active") return "calm";
  const left = daysLeft(client.endDate);
  if (left === null) return "calm";
  if (left <= 0) return "bad";
  if (left <= 7) return "warn";
  return "calm";
}

function privateTone(client) {
  if (client.status !== "active") return "calm";
  if (client.remainingLessons <= 2) return client.remainingLessons === 0 ? "bad" : "warn";
  return "calm";
}

function toneClass(tone) {
  if (tone === "bad") return "border-bad/50 bg-bad/10";
  if (tone === "warn") return "border-warn/50 bg-warn/10";
  return "border-line bg-card";
}

export default function ClientsView({ clients, onCommit }) {
  const [group, setGroup] = useState("online");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const counts = useMemo(() => {
    const online = clients.filter((client) => client.group === "online" && client.status === "active");
    const lessons = clients.filter((client) => client.group === "private" && client.status === "active");
    return {
      online: online.length,
      lessons: lessons.length,
      expired: online.filter((client) => (daysLeft(client.endDate) ?? 1) <= 0).length,
      low: lessons.filter((client) => client.remainingLessons <= 2).length,
    };
  }, [clients]);

  const visible = useMemo(() => {
    const needle = fold(query.trim());
    return clients
      .filter((client) => client.group === group)
      .filter((client) => (filter === "all" ? true : client.status === filter))
      .filter((client) => {
        if (!needle) return true;
        return fold(`${client.name} ${client.packageName} ${client.phone} ${client.note}`).includes(needle);
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        if (group === "online") return (daysLeft(a.endDate) ?? 9999) - (daysLeft(b.endDate) ?? 9999);
        return a.remainingLessons - b.remainingLessons || a.name.localeCompare(b.name, "tr");
      });
  }, [clients, filter, group, query]);

  function update(id, patch) {
    onCommit((data) => ({
      ...data,
      clients: data.clients.map((client) => (client.id === id ? { ...client, ...patch } : client)),
    }));
  }

  function saveForm(event) {
    event.preventDefault();
    const name = form.name.trim();
    const packageName = form.packageName.trim();
    if (!name || !packageName) {
      setFormError("Ad ve paket adı gerekli.");
      return;
    }
    let nextClient;
    if (form.group === "online") {
      if (!form.startDate || !form.endDate) {
        setFormError("Başlangıç ve bitiş tarihi gerekli.");
        return;
      }
      if (form.endDate < form.startDate) {
        setFormError("Bitiş tarihi başlangıçtan önce olamaz.");
        return;
      }
      nextClient = {
        id: form.id || crypto.randomUUID(),
        group: "online",
        name,
        packageName,
        phone: form.phone.trim(),
        note: form.note.trim(),
        status: form.status,
        startDate: form.startDate,
        endDate: form.endDate,
        createdAt: form.createdAt || new Date().toISOString(),
      };
    } else {
      const total = wholeNumber(form.totalLessons);
      const remaining = wholeNumber(form.remainingLessons);
      if (!Number.isInteger(total) || total < 1) {
        setFormError("Toplam ders 1 veya daha büyük bir tam sayı olmalı.");
        return;
      }
      if (!Number.isInteger(remaining) || remaining < 0 || remaining > total) {
        setFormError("Kalan ders, 0 ile toplam ders arasında olmalı.");
        return;
      }
      nextClient = {
        id: form.id || crypto.randomUUID(),
        group: "private",
        name,
        packageName,
        phone: form.phone.trim(),
        note: form.note.trim(),
        status: form.status,
        totalLessons: total,
        remainingLessons: remaining,
        createdAt: form.createdAt || new Date().toISOString(),
      };
    }
    onCommit((data) => {
      const exists = data.clients.some((client) => client.id === nextClient.id);
      return {
        ...data,
        clients: exists
          ? data.clients.map((client) => (client.id === nextClient.id ? nextClient : client))
          : [nextClient, ...data.clients],
      };
    });
    setForm(null);
  }

  return (
    <section className="space-y-4">
      {counts.expired || counts.low ? (
        <div className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm leading-6 text-warn">
          {counts.expired ? `${counts.expired} online paketin süresi doldu. ` : ""}
          {counts.low ? `${counts.low} öğrencinin kalan dersi 2 veya altında.` : ""}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 rounded-3xl border border-line bg-panel p-1.5">
        <GroupButton
          active={group === "online"}
          label="Online Danışanlar"
          count={counts.online}
          onClick={() => setGroup("online")}
        />
        <GroupButton
          active={group === "private"}
          label="Özel Ders"
          count={counts.lessons}
          onClick={() => setGroup("private")}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className={inputClass}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="İsim, paket veya telefon ara"
          aria-label="Danışan ara"
        />
        <button
          type="button"
          className={`${buttonPrimary} shrink-0`}
          onClick={() => {
            setFormError("");
            setForm(blankClient(group));
          }}
        >
          Yeni kayıt
        </button>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Durum filtresi">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            className={filter === item.id ? buttonPrimary : buttonSecondary}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-5 py-12 text-center">
          <p className="font-display text-2xl">Bu listede kimse yok</p>
          <p className="mt-2 text-sm text-mist">Yeni kayıt ekleyebilir veya filtreyi değiştirebilirsin.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((client) =>
            client.group === "online" ? (
              <OnlineCard
                key={client.id}
                client={client}
                onEdit={() => {
                  setFormError("");
                  setForm(clientToForm(client));
                }}
                onToggle={() =>
                  update(client.id, { status: client.status === "active" ? "passive" : "active" })
                }
                onDelete={() => setPendingDelete(client)}
              />
            ) : (
              <PrivateCard
                key={client.id}
                client={client}
                onEdit={() => {
                  setFormError("");
                  setForm(clientToForm(client));
                }}
                onToggle={() =>
                  update(client.id, { status: client.status === "active" ? "passive" : "active" })
                }
                onShift={(delta) =>
                  update(client.id, {
                    remainingLessons: Math.min(
                      client.totalLessons,
                      Math.max(0, client.remainingLessons + delta),
                    ),
                  })
                }
                onDelete={() => setPendingDelete(client)}
              />
            ),
          )}
        </div>
      )}

      {form ? (
        <Modal
          title={form.id ? "Kaydı düzenle" : form.group === "online" ? "Online danışan" : "Özel ders öğrencisi"}
          onClose={() => setForm(null)}
        >
          <form className="space-y-4" onSubmit={saveForm}>
            <Field label="Ad soyad">
              <input
                className={inputClass}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Paket">
              <input
                className={inputClass}
                value={form.packageName}
                onChange={(event) => setForm({ ...form, packageName: event.target.value })}
                placeholder={form.group === "online" ? "8 haftalık online" : "10 derslik paket"}
                required
              />
            </Field>
            {form.group === "online" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Başlangıç">
                  <input
                    className={inputClass}
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Bitiş">
                  <input
                    className={inputClass}
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                    required
                  />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Toplam ders">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.totalLessons}
                    onChange={(event) => setForm({ ...form, totalLessons: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Kalan ders">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    value={form.remainingLessons}
                    onChange={(event) => setForm({ ...form, remainingLessons: event.target.value })}
                    required
                  />
                </Field>
              </div>
            )}
            <Field label="Telefon">
              <input
                className={inputClass}
                inputMode="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Not">
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </Field>
            <Field label="Durum">
              <select
                className={inputClass}
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
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
        <Modal title="Kaydı sil" onClose={() => setPendingDelete(null)}>
          <p className="text-sm leading-6 text-mist">
            {pendingDelete.name} kalıcı olarak silinecek. Pasife almak yerine silmek istediğinden emin misin?
          </p>
          <div className="mt-6 flex gap-2">
            <button type="button" className={`${buttonSecondary} flex-1`} onClick={() => setPendingDelete(null)}>
              Vazgeç
            </button>
            <button
              type="button"
              className={`${buttonDanger} flex-1`}
              onClick={() => {
                onCommit((data) => ({
                  ...data,
                  clients: data.clients.filter((client) => client.id !== pendingDelete.id),
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

function GroupButton({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-3 text-left transition ${
        active ? "bg-gold text-ink" : "text-mist hover:bg-white/5"
      }`}
    >
      <span className="block text-sm font-semibold leading-5">{label}</span>
      <span className={`mt-1 block text-xs ${active ? "text-ink/70" : "text-mist/80"}`}>{count} aktif</span>
    </button>
  );
}

function StatusPill({ status }) {
  const active = status === "active";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-good/15 text-good" : "bg-white/8 text-mist"
      }`}
    >
      {active ? "Aktif" : "Pasif"}
    </span>
  );
}

function OnlineCard({ client, onEdit, onToggle, onDelete }) {
  const left = daysLeft(client.endDate);
  const tone = onlineTone(client);
  let detail = "Tarih eksik";
  if (left !== null && left < 0) detail = `Süresi ${Math.abs(left)} gün önce doldu`;
  else if (left === 0) detail = "Paket bugün bitiyor";
  else if (left !== null) detail = `${left} gün kaldı`;

  return (
    <article className={`rounded-3xl border p-4 ${toneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{client.name}</h3>
          <p className="text-sm text-mist">{client.packageName}</p>
        </div>
        <StatusPill status={client.status} />
      </div>
      <p className={`mt-4 text-sm font-medium ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-paper"}`}>
        {detail}
      </p>
      <p className="mt-1 text-xs text-mist">
        {formatShortDate(client.startDate)} — {formatShortDate(client.endDate)}
      </p>
      {client.phone ? (
        <a className="mt-3 block text-sm text-gold" href={`tel:${client.phone}`}>
          {client.phone}
        </a>
      ) : null}
      {client.note ? <p className="mt-2 text-sm leading-6 text-mist">{client.note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={buttonSecondary} onClick={onToggle}>
          {client.status === "active" ? "Pasife al" : "Aktif yap"}
        </button>
        <button type="button" className={buttonGhost} onClick={onEdit}>
          Düzenle
        </button>
        <button type="button" className={buttonGhost} onClick={onDelete}>
          Sil
        </button>
      </div>
    </article>
  );
}

function PrivateCard({ client, onEdit, onToggle, onShift, onDelete }) {
  const tone = privateTone(client);
  const ratio = client.totalLessons ? Math.min(100, (client.remainingLessons / client.totalLessons) * 100) : 0;
  const alert =
    client.remainingLessons === 0
      ? "Ders kalmadı"
      : client.remainingLessons <= 2
        ? "Kalan ders 2 veya altında"
        : `${client.remainingLessons} ders kaldı`;

  return (
    <article className={`rounded-3xl border p-4 ${toneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{client.name}</h3>
          <p className="text-sm text-mist">{client.packageName}</p>
        </div>
        <StatusPill status={client.status} />
      </div>
      <p className={`mt-4 text-sm font-medium ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-paper"}`}>
        {alert}
      </p>
      <p className="mt-1 text-xs text-mist">
        {client.remainingLessons} / {client.totalLessons} ders
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink">
        <div className="h-full rounded-full bg-gold" style={{ width: `${ratio}%` }} />
      </div>
      {client.phone ? (
        <a className="mt-3 block text-sm text-gold" href={`tel:${client.phone}`}>
          {client.phone}
        </a>
      ) : null}
      {client.note ? <p className="mt-2 text-sm leading-6 text-mist">{client.note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonPrimary}
          disabled={client.remainingLessons <= 0}
          onClick={() => onShift(-1)}
        >
          −1 Ders
        </button>
        <button
          type="button"
          className={buttonSecondary}
          disabled={client.remainingLessons >= client.totalLessons}
          onClick={() => onShift(1)}
        >
          +1
        </button>
        <button type="button" className={buttonSecondary} onClick={onToggle}>
          {client.status === "active" ? "Pasife al" : "Aktif yap"}
        </button>
        <button type="button" className={buttonGhost} onClick={onEdit}>
          Düzenle
        </button>
        <button type="button" className={buttonGhost} onClick={onDelete}>
          Sil
        </button>
      </div>
    </article>
  );
}
