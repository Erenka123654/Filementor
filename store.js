/* ═══════════════════════════════════════════
   store.js — Mağaza & Sepet & Lightbox
   ═══════════════════════════════════════════ */

let cart = [];
let activeFilter = 'Tümü';
let lightboxProductId = null;

const CAT_COLORS = {
  'Dekor':'#E1F5EE','Aydınlatma':'#FAEEDA','Hobi':'#E6F1FB',
  'Oyuncak':'#FAECE7','Oyun':'#FBEAF0','Ev':'#EAF3DE',
};
function bgForCat(cat) { return CAT_COLORS[cat] || '#F0EEE8'; }

/* ══════════════ FİLTRELER ══════════════ */
function renderFilters() {
  const cats = ['Tümü', ...new Set(getProducts().map(p => p.cat))];
  const el = document.getElementById('filter-row');
  if (!el) return;
  el.innerHTML = cats.map(c =>
    `<button class="filter-chip${c===activeFilter?' active':''}" onclick="setFilter('${c}')">${c}</button>`
  ).join('');
}
function setFilter(cat) { activeFilter = cat; renderFilters(); renderGrid(); }

/* ══════════════ ÜRÜN GRİDİ ══════════════ */
function productImgHTML(p, zoom = true) {
  const inner = p.image
    ? `<img src="${p.image}" alt="${p.name}" class="product-photo" loading="lazy" />`
    : `<div class="product-emoji-fallback">${p.emoji}</div>`;
  return zoom ? `<div class="product-img-zoom">${inner}</div>` : inner;
}

function renderGrid() {
  const el = document.getElementById('product-grid');
  if (!el) return;

  const visible = getProducts().filter(p =>
    p.status !== 'draft' && (activeFilter === 'Tümü' || p.cat === activeFilter)
  );

  if (!visible.length) {
    el.innerHTML = '<p style="color:#888;grid-column:1/-1;padding:2rem 0">Bu kategoride ürün bulunamadı.</p>';
    return;
  }

  el.innerHTML = visible.map(p => `
    <article class="product-card" onclick="openLightbox(${p.id})">
      <div class="product-img" style="${p.image ? '' : 'background:' + bgForCat(p.cat)}">
        ${p.isNew ? '<span class="badge-new">YENİ</span>' : ''}
        ${p.status==='out' ? '<span class="badge-out">STOK YOK</span>' : ''}
        ${productImgHTML(p)}
        <span class="zoom-hint">🔍 Büyüt</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-cat">${p.cat}</div>
        ${p.desc ? `<div class="product-desc">${p.desc}</div>` : ''}
        <div class="product-footer">
          <span class="product-price">₺${p.price.toLocaleString('tr-TR')}</span>
          ${p.status !== 'out'
            ? `<button class="add-cart-btn" onclick="event.stopPropagation();addToCart(${p.id})" aria-label="Sepete ekle">+</button>`
            : '<span style="font-size:11px;color:#aaa">—</span>'}
        </div>
      </div>
    </article>
  `).join('');
}

/* ══════════════ LİGHTBOX ══════════════ */
function openLightbox(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  lightboxProductId = id;

  // Resim
  const imgWrap = document.getElementById('lb-img-wrap');
  if (p.image) {
    imgWrap.innerHTML = `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;display:block;" />`;
  } else {
    imgWrap.innerHTML = `<div class="lb-emoji" style="font-size:100px;display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:${bgForCat(p.cat)}">${p.emoji}</div>`;
  }

  // Rozetler
  const badges = [];
  if (p.isNew)          badges.push('<span class="lb-badge lb-badge-new">YENİ</span>');
  if (p.status === 'out') badges.push('<span class="lb-badge lb-badge-out">STOK YOK</span>');
  document.getElementById('lb-badges').innerHTML = badges.join('');

  document.getElementById('lb-name').textContent  = p.name;
  document.getElementById('lb-cat').textContent   = p.cat;
  document.getElementById('lb-desc').textContent  = p.desc || 'Açıklama eklenmemiş.';
  document.getElementById('lb-price').textContent = `₺${p.price.toLocaleString('tr-TR')}`;

  const btn = document.getElementById('lb-btn');
  if (p.status === 'out') {
    btn.textContent = 'Stok Yok'; btn.disabled = true; btn.style.opacity = '.5';
  } else {
    btn.textContent = 'Sepete Ekle'; btn.disabled = false; btn.style.opacity = '1';
  }

  const lb = document.getElementById('lightbox');
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
  lightboxProductId = null;
}

function addFromLightbox() {
  if (lightboxProductId) {
    addToCart(lightboxProductId);
    closeLightbox();
  }
}

/* ESC tuşu */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeCheckout(); }
});

/* ══════════════ SEPET ══════════════ */
function addToCart(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p || p.status === 'out') return;
  const ex = cart.find(c => c.id === id);
  ex ? ex.qty++ : cart.push({ ...p, qty: 1 });
  updateCartUI();
  showToast(`"${p.name}" sepete eklendi 🛒`);
}

function removeFromCart(id) { cart = cart.filter(c => c.id !== id); updateCartUI(); }

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cart-count').textContent = total;

  const itemsEl  = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  const totalEl  = document.getElementById('cart-total');
  const subtotalEl = document.getElementById('cart-subtotal');

  if (!cart.length) {
    itemsEl.innerHTML = '<p class="cart-empty">Sepetiniz boş.</p>';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="cart-item-thumb">
        ${c.image
          ? `<img src="${c.image}" alt="${c.name}" style="width:50px;height:50px;object-fit:cover;" />`
          : `<span style="font-size:26px">${c.emoji}</span>`}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${c.name}</div>
        <div class="cart-item-price">₺${c.price.toLocaleString('tr-TR')} x ${c.qty}</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="changeQty(${c.id},-1)">−</button>
        <span style="font-size:14px;font-weight:600;min-width:18px;text-align:center">${c.qty}</span>
        <button class="qty-btn" onclick="changeQty(${c.id},+1)">+</button>
        <button class="qty-btn" onclick="removeFromCart(${c.id})" style="margin-left:2px" title="Kaldır">🗑</button>
      </div>
    </div>
  `).join('');

  const grand = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const fmt = v => '₺' + v.toLocaleString('tr-TR');
  if (subtotalEl) subtotalEl.textContent = fmt(grand);
  if (totalEl)    totalEl.textContent    = fmt(grand);
  if (footerEl)   footerEl.style.display = 'flex';
}

function toggleCart() {
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  const open    = drawer.classList.toggle('open');
  overlay.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

/* ══════════════ FORM ══════════════ */
function handleContact(e) {
  e.preventDefault();
  showToast('Mesajınız iletildi! En kısa sürede dönüş yapacağız. ✓');
  e.target.reset();
}

/* ══════════════ TOAST ══════════════ */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ══════════════ INIT ══════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderFilters();
  renderGrid();
  document.getElementById('cart-btn')?.addEventListener('click', toggleCart);
});
