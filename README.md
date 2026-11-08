# Koçluk Paneli

Kişisel müşteri ve finans paneli. Kayıtlar sunucuya gitmez; tarayıcıda AES-GCM ile şifrelenir.

## Çalıştırma

```bash
npm install
npm run dev
```

Bilgisayarında aç: http://localhost:5173

## Telefonda

1. Telefon ve bilgisayar aynı Wi-Fi ağında olsun.
2. `npm run dev` çıktısındaki `Network` adresini telefon tarayıcısında aç.
3. Windows güvenlik duvarı sorarsa özel ağlara izin ver.
4. Ana ekrana ekle:
   - iPhone Safari: Paylaş → Ana Ekrana Ekle
   - Android Chrome: menü → Uygulamayı yükle / Ana ekrana ekle

Yüklü uygulama ile tarayıcı sekmesi ayrı kasa tutabilir. Parolayı, her gün kullanacağın yerde oluştur. Diğer tarafa geçmek için Ayarlar → Şifreli yedek indir, sonra içe aktar.

Kalıcı yükleme önizlemesi:

```bash
npm run build
npm run preview
```

## Gizlilik

- Parola unutulursa kayıtlar açılamaz. Kurtarma yoktur.
- Yedeği düzenli indir. Yedek dosyası da şifrelidir.
- Site verisini silmek kasayı da siler.
