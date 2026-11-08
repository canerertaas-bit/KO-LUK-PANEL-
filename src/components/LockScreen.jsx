import { useState } from "react";
import { buttonPrimary, Field, inputClass } from "./ui";

export default function LockScreen({ mode, busy, error, notice, onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const creating = mode === "create";

  function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");
    if (password.length < 8) {
      setLocalError("Parola en az 8 karakter olmalı.");
      return;
    }
    if (creating && password !== confirm) {
      setLocalError("Parolalar eşleşmiyor.");
      return;
    }
    onSubmit(password);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold font-display text-2xl text-ink">
            K
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold">Özel panel</p>
            <h1 className="font-display text-4xl leading-none">Koçluk</h1>
          </div>
        </div>
        <div className="rounded-[28px] border border-line bg-panel/90 p-6 shadow-2xl">
          <h2 className="font-display text-3xl">
            {creating ? "Kasayı oluştur" : "Kilidi aç"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-mist">
            Danışanlar ve kasa hareketleri yalnızca bu cihazda durur. Parolan olmadan kayıtlar
            okunamaz. Unutulan parolanın kurtarması yoktur.
          </p>
          {notice ? (
            <p className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
              {notice}
            </p>
          ) : null}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field label="Parola">
              <input
                className={inputClass}
                type="password"
                autoComplete={creating ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            {creating ? (
              <Field label="Parolayı tekrarla" hint="En az 8 karakter. Bir yere not almanı öneririm.">
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  minLength={8}
                  required
                />
              </Field>
            ) : null}
            {localError || error ? (
              <p className="text-sm text-bad">{localError || error}</p>
            ) : null}
            <button className={`${buttonPrimary} w-full`} type="submit" disabled={busy}>
              {busy ? "Şifre çözülüyor…" : creating ? "Kasayı oluştur" : "Panele gir"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
