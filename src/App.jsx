import { useEffect, useRef, useState } from "react";
import ClientsView from "./components/ClientsView";
import FinanceView from "./components/FinanceView";
import { IconLock, IconPeople, IconWallet } from "./components/Icons";
import LockScreen from "./components/LockScreen";
import SettingsSheet from "./components/SettingsSheet";
import { buttonGhost } from "./components/ui";
import {
  decryptVault,
  emptyData,
  encryptVault,
  normalizeData,
  readVaultPayload,
  vaultExists,
  writeVaultPayload,
} from "./lib/vault";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState(emptyData);
  const [tab, setTab] = useState("clients");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const passwordRef = useRef("");
  const dataRef = useRef(emptyData());
  const queueRef = useRef(Promise.resolve());
  const sessionRef = useRef(0);

  useEffect(() => {
    setHasVault(vaultExists());
    setBooting(false);
  }, []);

  function commit(updater, nextPassword) {
    const session = sessionRef.current;
    const run = queueRef.current.then(async () => {
      if (session !== sessionRef.current) return;
      const password = nextPassword || passwordRef.current;
      const next = normalizeData(typeof updater === "function" ? updater(dataRef.current) : updater);
      dataRef.current = next;
      setData(next);
      if (!password) return;
      passwordRef.current = password;
      const payload = await encryptVault(password, next);
      if (session !== sessionRef.current) return;
      writeVaultPayload(payload);
    });
    queueRef.current = run.catch(() => {
      setError("Kayıt şifrelenemedi. Bu oturumdaki son değişiklik diske yazılmamış olabilir.");
    });
    return queueRef.current;
  }

  async function unlock(password) {
    setBusy(true);
    setError("");
    try {
      const next = await decryptVault(password, readVaultPayload());
      passwordRef.current = password;
      dataRef.current = next;
      setData(next);
      setUnlocked(true);
      setNotice("");
    } catch {
      setError("Parola hatalı veya kasa bozuk.");
    } finally {
      setBusy(false);
    }
  }

  async function createVault(password) {
    setBusy(true);
    setError("");
    try {
      const next = emptyData();
      const payload = await encryptVault(password, next);
      writeVaultPayload(payload);
      passwordRef.current = password;
      dataRef.current = next;
      setData(next);
      setHasVault(true);
      setUnlocked(true);
    } catch {
      setError("Kasa oluşturulamadı.");
    } finally {
      setBusy(false);
    }
  }

  function lock(message = "") {
    sessionRef.current += 1;
    passwordRef.current = "";
    dataRef.current = emptyData();
    setData(emptyData());
    setUnlocked(false);
    setSettingsOpen(false);
    setNotice(message);
    setHasVault(vaultExists());
  }

  if (booting) {
    return <main className="grid min-h-dvh place-items-center text-sm text-mist">Kasa kontrol ediliyor…</main>;
  }

  if (!unlocked) {
    return (
      <LockScreen
        mode={hasVault ? "unlock" : "create"}
        busy={busy}
        error={error}
        notice={notice}
        onSubmit={hasVault ? unlock : createVault}
      />
    );
  }

  const nav = [
    { id: "clients", label: "Danışanlar", icon: IconPeople },
    { id: "finance", label: "Kasa", icon: IconWallet },
  ];

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-panel/80 md:flex md:flex-col md:px-4 md:py-6">
        <div className="px-2">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Şifreli</p>
          <h1 className="mt-2 font-display text-3xl leading-tight">{data.brandName}</h1>
        </div>
        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
          ))}
        </nav>
        <div className="mt-auto space-y-2 px-2">
          <button type="button" className={`${buttonGhost} w-full justify-start`} onClick={() => setSettingsOpen(true)}>
            Ayarlar
          </button>
          <button type="button" className={`${buttonGhost} w-full justify-start`} onClick={() => lock()}>
            Kilitle
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gold">
                <IconLock className="h-3.5 w-3.5" />
                Bu cihazda şifreli
              </p>
              <h1 className="truncate font-display text-2xl md:hidden">{data.brandName}</h1>
              <p className="hidden text-sm text-mist md:block">
                {tab === "clients" ? "Müşteri ve paketler" : "Gelir, gider ve net sonuç"}
              </p>
            </div>
            <button type="button" className={`${buttonGhost} md:hidden`} onClick={() => setSettingsOpen(true)}>
              Ayarlar
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-28 md:px-8 md:pb-10">
          {error ? <p className="mb-4 text-sm text-bad">{error}</p> : null}
          {tab === "clients" ? (
            <ClientsView clients={data.clients} onCommit={commit} />
          ) : (
            <FinanceView data={data} onCommit={commit} />
          )}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
            {nav.map((item) => (
              <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} compact />
            ))}
          </div>
        </nav>
      </div>

      {settingsOpen ? (
        <SettingsSheet
          data={data}
          onClose={() => setSettingsOpen(false)}
          onCommit={commit}
          onLock={() => lock()}
          onImported={(message) => lock(message)}
          onErased={() => lock("Kasa bu cihazdan silindi. İstersen yenisini oluştur.")}
        />
      ) : null}
    </div>
  );
}

function NavButton({ item, active, onClick, compact }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
        compact ? "justify-center" : ""
      } ${active ? "bg-gold text-ink" : "text-mist hover:bg-white/5 hover:text-paper"}`}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </button>
  );
}
