import { useState } from "react";
import { todayIso } from "../lib/format";
import { decryptVault, eraseVault, isVaultPayload, readVaultPayload, writeVaultPayload } from "../lib/vault";
import { buttonDanger, buttonPrimary, buttonSecondary, Field, inputClass, Modal } from "./ui";

export default function SettingsSheet({ data, onClose, onCommit, onLock, onImported, onErased }) {
  const [brand, setBrand] = useState(data.brandName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [eraseText, setEraseText] = useState("");
  const [busy, setBusy] = useState(false);

  function saveBrand(event) {
    event.preventDefault();
    const brandName = brand.trim() || "Koçluk Paneli";
    onCommit((current) => ({ ...current, brandName }));
    setMessage("Marka adı kaydedildi.");
    setError("");
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (nextPassword.length < 8) {
      setError("Yeni parola en az 8 karakter olmalı.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("Yeni parolalar eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      await onCommit((current) => current);
      await decryptVault(currentPassword, readVaultPayload());
      await onCommit((current) => current, nextPassword);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setMessage("Parola değiştirildi. Yeni parolayı not al.");
    } catch {
      setError("Mevcut parola hatalı.");
    } finally {
      setBusy(false);
    }
  }

  function downloadBackup() {
    const raw = localStorage.getItem("kocluk.vault.v1");
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `kocluk-panel-yedek-${todayIso()}.vault.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!isVaultPayload(payload)) throw new Error("format");
      writeVaultPayload(payload);
      onImported("Yedek yüklendi. Bu yedeğin parolasıyla aç.");
    } catch {
      setError("Bu dosya geçerli bir şifreli yedek değil.");
    }
  }

  return (
    <Modal title="Ayarlar" onClose={onClose}>
      <div className="space-y-8">
        <form className="space-y-3" onSubmit={saveBrand}>
          <Field label="Marka adı" hint="Panelin başlığında görünür. Yalnızca bu cihazda saklanır.">
            <input className={inputClass} value={brand} onChange={(event) => setBrand(event.target.value)} />
          </Field>
          <button type="submit" className={buttonPrimary}>
            Markayı kaydet
          </button>
        </form>

        <form className="space-y-3 border-t border-line pt-6" onSubmit={changePassword}>
          <h3 className="font-display text-2xl">Parolayı değiştir</h3>
          <Field label="Mevcut parola">
            <input
              className={inputClass}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label="Yeni parola">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
          </Field>
          <Field label="Yeni parolayı tekrarla">
            <input
              className={inputClass}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
          <button type="submit" className={buttonSecondary} disabled={busy}>
            {busy ? "Şifreleniyor…" : "Parolayı güncelle"}
          </button>
        </form>

        <div className="space-y-3 border-t border-line pt-6">
          <h3 className="font-display text-2xl">Yedek</h3>
          <p className="text-sm leading-6 text-mist">
            İndirilen dosya şifrelidir. Başka bir telefona geçerken önce yedeği indir, yeni cihazda içe aktar,
            sonra aynı parolayla aç.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className={buttonSecondary} onClick={downloadBackup}>
              Şifreli yedek indir
            </button>
            <label className={`${buttonSecondary} cursor-pointer`}>
              Yedekten yükle
              <input className="sr-only" type="file" accept="application/json,.json" onChange={importBackup} />
            </label>
          </div>
        </div>

        <div className="space-y-3 border-t border-line pt-6">
          <button type="button" className={buttonSecondary} onClick={onLock}>
            Kasayı kilitle
          </button>
          <Field label='Bu cihazdaki kasayı silmek için SIL yaz'>
            <input className={inputClass} value={eraseText} onChange={(event) => setEraseText(event.target.value)} />
          </Field>
          <button
            type="button"
            className={buttonDanger}
            disabled={eraseText !== "SIL"}
            onClick={() => {
              eraseVault();
              onErased();
            }}
          >
            Kasayı bu cihazdan sil
          </button>
        </div>
        {message ? <p className="text-sm text-good">{message}</p> : null}
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </div>
    </Modal>
  );
}
