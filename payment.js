/* ═══════════════════════════════════════════
   payment.js — iyzico Ödeme Entegrasyonu
   Backend: printcraft-backend/server.js
   ═══════════════════════════════════════════ */

let currentStep = 1;
let selectedInstallment = 1;

/* ── Backend adresi ─────────────────────────
   Backend bilgisayarında çalışıyorsa:  http://localhost:4000
   Sunucuya yüklediysen kendi adresin:  https://api.siteadin.com
   ─────────────────────────────────────────── */
const BACKEND_URL = 'http://localhost:4000';

/* ════════════════════════════════
   ÖDEME MODALI AÇ / KAPAT
   ════════════════════════════════ */
function openCheckout() {
  if (!cart.length) { showToast('Sepetiniz boş!'); return; }

  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');

  buildInstallments();
  goStep(1);

  document.getElementById('pay-overlay').classList.add('open');
  document.getElementById('pay-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('pay-overlay').classList.remove('open');
  document.getElementById('pay-modal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ════════════════════════════════
   ADIM YÖNETİMİ
   ════════════════════════════════ */
function goStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;
  if (n === 3) buildOrderSummary();

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.style.display = i === n ? '' : 'none';
  }
  document.getElementById('step-success').style.display = 'none';
  currentStep = n;
}

/* ════════════════════════════════
   DOĞRULAMA
   ════════════════════════════════ */
function validateStep1() {
  const fields = [
    { id: 'pay-name',     label: 'Ad' },
    { id: 'pay-surname',  label: 'Soyad' },
    { id: 'pay-email',    label: 'E-posta' },
    { id: 'pay-phone',    label: 'Telefon' },
    { id: 'pay-address',  label: 'Adres' },
    { id: 'pay-district', label: 'İlçe' },
    { id: 'pay-city',     label: 'Şehir' },
  ];
  for (const f of fields) {
    const el = document.getElementById(f.id);
    if (!el?.value.trim()) { el?.focus(); showToast(`${f.label} alanı zorunludur.`); return false; }
  }
  if (!/\S+@\S+\.\S+/.test(document.getElementById('pay-email').value)) {
    showToast('Geçerli bir e-posta girin.'); return false;
  }
  return true;
}

function validateStep2() {
  const num    = document.getElementById('card-num')?.value.replace(/\s/g,'');
  const holder = document.getElementById('card-holder')?.value.trim();
  const exp    = document.getElementById('card-exp')?.value.trim();
  const cvv    = document.getElementById('card-cvv')?.value.trim();
  if (!num || num.length < 16)  { showToast('Geçerli bir kart numarası girin.'); return false; }
  if (!holder)                   { showToast('Kart sahibi adını girin.'); return false; }
  if (!exp || exp.length < 5)    { showToast('Son kullanma tarihini girin.'); return false; }
  if (!cvv || cvv.length < 3)    { showToast('CVV kodunu girin.'); return false; }
  return true;
}

/* ════════════════════════════════
   TAKSİT
   ════════════════════════════════ */
function buildInstallments() {
  const grand = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const opts  = [
    { n:1,  label:'Tek Çekim' },
    { n:2,  label:'2 Taksit' },
    { n:3,  label:'3 Taksit' },
    { n:6,  label:'6 Taksit' },
    { n:9,  label:'9 Taksit' },
    { n:12, label:'12 Taksit' },
  ];
  const el = document.getElementById('installment-opts');
  if (!el) return;
  el.innerHTML = opts.map(o => {
    const monthly = (grand / o.n).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    return `<div class="inst-opt${o.n===1?' selected':''}" onclick="selectInstallment(${o.n},this)">
      ${o.label}<span>₺${monthly}/ay</span>
    </div>`;
  }).join('');
  selectedInstallment = 1;
}

function selectInstallment(n, el) {
  document.querySelectorAll('.inst-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  selectedInstallment = n;
}

/* ════════════════════════════════
   SİPARİŞ ÖZETİ
   ════════════════════════════════ */
function buildOrderSummary() {
  const el = document.getElementById('order-summary');
  if (!el) return;
  el.innerHTML = cart.map(c => `
    <div class="order-item">
      <div class="order-item-thumb">
        ${c.image
          ? `<img src="${c.image}" alt="${c.name}" style="width:36px;height:36px;object-fit:cover;border-radius:6px">`
          : c.emoji}
      </div>
      <div class="order-item-name">${c.name} <span style="color:#aaa">x${c.qty}</span></div>
      <div class="order-item-price">₺${(c.price*c.qty).toLocaleString('tr-TR')}</div>
    </div>
  `).join('');
  const grand = cart.reduce((s,c) => s + c.price*c.qty, 0);
  const el2 = document.getElementById('order-total-final');
  if (el2) el2.textContent = '₺' + grand.toLocaleString('tr-TR');
}

/* ════════════════════════════════
   ÖDEME GÖNDER → iyzico Backend
   ════════════════════════════════ */
async function processPayment() {
  const btn = document.getElementById('pay-btn');
  btn.textContent = '⏳ Ödeme işleniyor...';
  btn.disabled = true;

  const expParts = document.getElementById('card-exp').value.split('/');

  const payData = {
    card: {
      cardHolderName: document.getElementById('card-holder').value,
      cardNumber:     document.getElementById('card-num').value.replace(/\s/g,''),
      expireMonth:    expParts[0],
      expireYear:     expParts[1],
      cvc:            document.getElementById('card-cvv').value,
    },
    buyer: {
      name:                document.getElementById('pay-name').value,
      surname:             document.getElementById('pay-surname').value,
      email:               document.getElementById('pay-email').value,
      gsmNumber:           document.getElementById('pay-phone').value,
      registrationAddress: document.getElementById('pay-address').value,
      city:                document.getElementById('pay-city').value,
    },
    shippingAddress: {
      address: document.getElementById('pay-address').value,
      city:    document.getElementById('pay-city').value,
    },
    basketItems: cart.map(c => ({
      id:        String(c.id),
      name:      c.name,
      category1: c.cat,
      price:     (c.price * c.qty).toFixed(2),
    })),
    price:       cart.reduce((s,c) => s + c.price*c.qty, 0).toFixed(2),
    installment: selectedInstallment,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/pay`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payData),
    });

    if (!res.ok) throw new Error(`Sunucu hatası: ${res.status}`);
    const result = await res.json();

    if (result.success) {
      /* ── BAŞARILI ── */
      document.getElementById('success-order-no').textContent =
        `Sipariş No: ${result.orderNo || result.paymentId}`;

      ['step-1','step-2','step-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      document.getElementById('step-success').style.display = '';

      cart = [];
      updateCartUI();

    } else {
      /* ── HATA ── */
      showToast('❌ ' + (result.message || 'Ödeme reddedildi.'));
      btn.textContent = '🔒 Güvenli Ödemeyi Tamamla';
      btn.disabled = false;
    }

  } catch (err) {
    console.error('Ödeme hatası:', err);

    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showToast('⚠️ Backend sunucusuna bağlanılamadı. server.js çalışıyor mu?');
    } else {
      showToast('❌ Bağlantı hatası: ' + err.message);
    }
    btn.textContent = '🔒 Güvenli Ödemeyi Tamamla';
    btn.disabled = false;
  }
}

/* ════════════════════════════════
   KART FORMATLAMA
   ════════════════════════════════ */
function formatCard(input) {
  let v = input.value.replace(/\D/g,'').slice(0,16);
  input.value = v.replace(/(.{4})/g,'$1 ').trim();
  const preview = document.getElementById('prev-num');
  if (preview) {
    const padded = v.padEnd(16,'•');
    preview.textContent = padded.replace(/(.{4})/g,'$1 ').trim();
  }
}

function formatExp(input) {
  let v = input.value.replace(/\D/g,'').slice(0,4);
  if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
  const preview = document.getElementById('prev-exp');
  if (preview) preview.textContent = v || 'MM/YY';
}
