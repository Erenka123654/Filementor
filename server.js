/* ═══════════════════════════════════════════════════
   PrintCraft Studio — iyzico Ödeme Backend
   Kurulum: node server.js → tarayıcıda http://localhost:4000
   ═══════════════════════════════════════════════════ */

const express  = require('express');
const cors     = require('cors');
const Iyzipay  = require('iyzipay');
const fs       = require('fs');
const path     = require('path');

const app      = express();
const PORT     = 4000;
const CFG_FILE = path.join(__dirname, 'config.json');

app.use(cors({ origin: '*', methods: ['GET','POST'] }));
app.use(express.json());
app.use(express.static(__dirname)); // setup.html için

/* ══════════════════════════════════════════
   Konfigürasyon oku / yaz
   ══════════════════════════════════════════ */
function loadConfig() {
  try {
    if (fs.existsSync(CFG_FILE)) return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'));
  } catch {}
  return { apiKey: '', secretKey: '', sandbox: true };
}

function saveConfig(cfg) {
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));
}

function makeIyzipay(cfg) {
  return new Iyzipay({
    apiKey:    cfg.apiKey,
    secretKey: cfg.secretKey,
    uri: cfg.sandbox
      ? 'https://sandbox-api.iyzipay.com'
      : 'https://api.iyzipay.com',
  });
}

/* ══════════════════════════════════════════
   GET /api/config — mevcut ayarları döndür
   ══════════════════════════════════════════ */
app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  res.json({
    hasKeys: !!(cfg.apiKey && cfg.secretKey),
    sandbox: cfg.sandbox,
    // Key'leri gizle, sadece ilk 8 karakteri göster
    apiKeyHint:    cfg.apiKey    ? cfg.apiKey.slice(0,16)    + '...' : '',
    secretKeyHint: cfg.secretKey ? cfg.secretKey.slice(0,16) + '...' : '',
  });
});

/* ══════════════════════════════════════════
   POST /api/config — key'leri kaydet
   ══════════════════════════════════════════ */
app.post('/api/config', (req, res) => {
  const { apiKey, secretKey, sandbox } = req.body;
  if (!apiKey || !secretKey) return res.json({ success: false, message: 'İki alan da zorunludur.' });

  saveConfig({ apiKey: apiKey.trim(), secretKey: secretKey.trim(), sandbox: !!sandbox });
  console.log('\n🔑 API key\'ler kaydedildi.');
  console.log('   Mod:', sandbox ? '🧪 SANDBOX' : '💳 CANLI');
  res.json({ success: true });
});

/* ══════════════════════════════════════════
   POST /api/config/test — key'leri test et
   ══════════════════════════════════════════ */
app.post('/api/config/test', (req, res) => {
  const { apiKey, secretKey, sandbox } = req.body;
  const iyzipay = makeIyzipay({ apiKey, secretKey, sandbox });

  // Basit bir istek at (geçersiz ama bağlantıyı test eder)
  iyzipay.apiTest.retrieve({ locale: 'tr' }, (err, result) => {
    if (err) return res.json({ success: false, message: 'Bağlantı hatası: ' + err.message });
    if (result.status === 'success') return res.json({ success: true });
    // 401 = geçersiz key, başka hata = başka sorun
    const msg = result.errorCode === '401'
      ? 'API key veya Secret key hatalı.'
      : (result.errorMessage || 'Bilinmeyen hata');
    res.json({ success: false, message: msg });
  });
});

/* ══════════════════════════════════════════
   POST /api/pay — Ödeme başlat
   ══════════════════════════════════════════ */
app.post('/api/pay', (req, res) => {
  const cfg = loadConfig();
  if (!cfg.apiKey || !cfg.secretKey) {
    return res.json({ success: false, message: 'API key\'ler henüz girilmemiş. Kurulum sayfasını aç.' });
  }

  const { card, buyer, shippingAddress, basketItems, price, installment } = req.body;
  if (!card?.cardNumber || !buyer?.email || !price) {
    return res.json({ success: false, message: 'Eksik ödeme bilgisi.' });
  }

  const iyzipay       = makeIyzipay(cfg);
  const conversationId = 'PC-' + Date.now();

  const request = {
    locale:         Iyzipay.LOCALE.TR,
    conversationId,
    price:          parseFloat(price).toFixed(2),
    paidPrice:      parseFloat(price).toFixed(2),
    currency:       Iyzipay.CURRENCY.TRY,
    installment:    parseInt(installment) || 1,
    basketId:       'B-' + conversationId,
    paymentChannel: Iyzipay.PAYMENT_CHANNEL.WEB,
    paymentGroup:   Iyzipay.PAYMENT_GROUP.PRODUCT,
    paymentCard: {
      cardHolderName: card.cardHolderName,
      cardNumber:     card.cardNumber.replace(/\s/g,''),
      expireMonth:    card.expireMonth,
      expireYear:     card.expireYear?.length === 2 ? '20' + card.expireYear : card.expireYear,
      cvc:            card.cvc,
      registerCard:   '0',
    },
    buyer: {
      id:                  'U-' + Date.now(),
      name:                buyer.name,
      surname:             buyer.surname,
      gsmNumber:           buyer.gsmNumber,
      email:               buyer.email,
      identityNumber:      '74300864791',
      registrationAddress: buyer.registrationAddress,
      city:                buyer.city,
      country:             'Turkey',
      ip:                  req.ip || '127.0.0.1',
    },
    shippingAddress: {
      contactName: `${buyer.name} ${buyer.surname}`,
      city:        shippingAddress?.city || buyer.city,
      country:     'Turkey',
      address:     shippingAddress?.address || buyer.registrationAddress,
    },
    billingAddress: {
      contactName: `${buyer.name} ${buyer.surname}`,
      city:        buyer.city,
      country:     'Turkey',
      address:     buyer.registrationAddress,
    },
    basketItems: basketItems.map(item => ({
      id:        String(item.id),
      name:      item.name,
      category1: item.category1 || 'Genel',
      itemType:  Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
      price:     parseFloat(item.price).toFixed(2),
    })),
  };

  iyzipay.payment.create(request, (err, result) => {
    if (err) { console.error('iyzico hata:', err); return res.json({ success: false, message: 'Bağlantı hatası.' }); }
    console.log('iyzico yanıt:', result.status, result.errorMessage || '');
    if (result.status === 'success') return res.json({ success: true, paymentId: result.paymentId, orderNo: conversationId });

    const errorMap = {
      'Do not honour':       'Kart bankası işlemi reddetti.',
      'Do not honor':        'Kart bankası işlemi reddetti.',
      'Invalid card number': 'Geçersiz kart numarası.',
      'Expired card':        'Kartın son kullanma tarihi geçmiş.',
      'Not sufficient funds':'Kart bakiyesi yetersiz.',
      'Invalid CVV2':        'CVV kodu hatalı.',
    };
    res.json({ success: false, message: errorMap[result.errorMessage] || result.errorMessage || 'Ödeme reddedildi.' });
  });
});

/* ══════════════════════════════════════════
   Başlat
   ══════════════════════════════════════════ */
app.listen(PORT, () => {
  const cfg  = loadConfig();
  const mode = cfg.sandbox ? '🧪 SANDBOX' : '💳 CANLI';
  const keys = cfg.apiKey ? '✅ Girilmiş' : '⚠️  Henüz girilmemiş';

  console.log('\n╔════════════════════════════════════╗');
  console.log('║   PrintCraft Studio Backend        ║');
  console.log('╚════════════════════════════════════╝');
  console.log(`\n🌐 Adres  : http://localhost:${PORT}`);
  console.log(`⚙️  Kurulum : http://localhost:${PORT}/setup.html`);
  console.log(`🔑 API Key : ${keys}`);
  if (cfg.apiKey) console.log(`📡 Mod     : ${mode}`);
  console.log('\n─────────────────────────────────────');
  if (!cfg.apiKey) {
    console.log('👉 Tarayıcıda http://localhost:4000/setup.html');
    console.log('   adresini aç ve API key\'lerini gir.\n');
  }
});
