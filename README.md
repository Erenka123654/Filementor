# Filementor Studio — 3D Baskı Mağazası

Sıfırdan yazılmış HTML/CSS/JS e-ticaret sitesi.
Sunucu veya framework gerektirmez — sadece tarayıcıda aç.

## 📁 Dosya Yapısı

```
filementor/
├── index.html        ← Mağaza vitrini (müşteri sayfası)
├── admin.html        ← Yönetim paneli
├── css/
│   ├── style.css     ← Ana stiller
│   └── admin.css     ← Admin stilleri
└── js/
    ├── products.js   ← Ürün verisi (localStorage)
    ├── store.js      ← Vitrin, sepet, lightbox
    ├── admin.js      ← Ürün yönetimi
    └── payment.js    ← iyzico ödeme entegrasyonu
```

## 🚀 Hızlı Başlangıç

1. ZIP'i indir ve klasörü aç
2. `index.html` → müşteri sayfası
3. `admin.html` → yönetim paneli (ürün ekle/çıkar)

---

## 💳 iyzico Ödeme Entegrasyonu

### 1. iyzico Hesabı Aç
- https://iyzico.com → Başvur
- Sandbox (test) ve canlı API key alırsın

### 2. Backend Kurulumu (Node.js)

API key'leri güvenlik nedeniyle frontend'de kullanma.
Bir backend oluştur:

```bash
mkdir printcraft-backend && cd printcraft-backend
npm init -y
npm install express iyzipay cors
```

**server.js:**
```javascript
const express  = require('express');
const Iyzipay  = require('iyzipay');
const cors     = require('cors');
const app      = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const iyzipay = new Iyzipay({
  apiKey:    'sandbox-YOUR_API_KEY',    // iyzico panelinden al
  secretKey: 'sandbox-YOUR_SECRET_KEY', // iyzico panelinden al
  uri:       'https://sandbox-api.iyzipay.com',
});

app.post('/api/pay', async (req, res) => {
  const { card, buyer, shippingAddress, basketItems, price, installment } = req.body;

  const request = {
    locale:           Iyzipay.LOCALE.TR,
    conversationId:   Date.now().toString(),
    price:            price,
    paidPrice:        price,
    currency:         Iyzipay.CURRENCY.TRY,
    installment:      installment || 1,
    basketId:         'B' + Date.now(),
    paymentChannel:   Iyzipay.PAYMENT_CHANNEL.WEB,
    paymentGroup:     Iyzipay.PAYMENT_GROUP.PRODUCT,
    paymentCard:      card,
    buyer: {
      id:                  'U' + Date.now(),
      name:                buyer.name,
      surname:             buyer.surname,
      gsmNumber:           buyer.gsmNumber,
      email:               buyer.email,
      identityNumber:      '74300864791', // TCKN (test değeri)
      registrationAddress: buyer.registrationAddress,
      city:                buyer.city,
      country:             buyer.country,
    },
    shippingAddress,
    billingAddress: shippingAddress,
    basketItems,
  };

  iyzipay.payment.create(request, (err, result) => {
    if (err || result.status !== 'success') {
      return res.json({ success: false, message: result?.errorMessage || 'Hata' });
    }
    res.json({ success: true, paymentId: result.paymentId });
  });
});

app.listen(4000, () => console.log('Backend çalışıyor: http://localhost:4000'));
```

```bash
node server.js
```

### 3. Frontend'i Bağla

`js/payment.js` içinde `processPayment()` fonksiyonundaki
DEMO MODU bloğunu kaldır, şunu etkinleştir:

```javascript
const res = await fetch('http://localhost:4000/api/pay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payData),
});
const result = await res.json();
if (!result.success) throw new Error(result.message);
```

### 4. Test Kartları (Sandbox)

| Kart No          | Son Kullanma | CVV | Sonuç    |
|-----------------|-------------|-----|----------|
| 5528790000000008 | 12/30        | 123 | Başarılı |
| 5528790000000016 | 12/30        | 123 | Başarısız|
| 4054180000000007 | 12/30        | 123 | Başarılı |

---

## 🎨 Özelleştirme

`css/style.css` dosyasındaki `:root` renklerini değiştir:

```css
:root {
  --brand:      #1D9E75;  /* Ana renk */
  --brand-dark: #085041;  /* Koyu ton */
  --accent:     #D85A30;  /* Vurgu    */
}
```

## 🌐 Yayınlama

Dosyaları Netlify, Vercel veya GitHub Pages'e yükle.
Backend için Railway, Render veya Heroku kullanabilirsin.
