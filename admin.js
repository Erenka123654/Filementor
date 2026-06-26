/* ═══════════════════════════════════════════
   admin.js — Yönetim Paneli Mantığı
   ═══════════════════════════════════════════ */

let editingId     = null;
let selectedEmoji = '🏺';
let pendingImage  = null;   // base64 veya null
let currentSection = 'dashboard';

/* ══════════════ NAVİGASYON ══════════════ */
function showSection(name) {
  ['dashboard','products','orders'].forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = s === name ? '' : 'none';
  });
  document.querySelectorAll('.sidebar-link').forEach(l =>
    l.classList.toggle('active', l.dataset.section === name)
  );
  const titles = { dashboard:'Dashboard', products:'Ürünler', orders:'Siparişler' };
  setText('section-title', titles[name] || name);
  const addBtn = document.getElementById('add-btn');
  if (addBtn) addBtn.style.display = name === 'products' ? '' : 'none';
  currentSection = name;
  if (name === 'dashboard') renderDashboard();
  if (name === 'products')  renderProductsTable();
}

/* ══════════════ DASHBOARD ══════════════ */
function renderDashboard() {
  const products = getProducts();
  setText('d-total',  products.length);
  setText('d-active', products.filter(p => p.status==='active').length);
  setText('d-out',    products.filter(p => p.status==='out').length);
  setText('d-cats',   new Set(products.map(p => p.cat)).size);

  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;
  tbody.innerHTML = [...products].reverse().slice(0, 5).map(p => `
    <tr>
      <td>
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px;">`
          : `<span style="font-size:22px;vertical-align:middle;margin-right:8px">${p.emoji}</span>`}
        <strong>${p.name}</strong>
      </td>
      <td>${p.cat}</td>
      <td>₺${p.price.toLocaleString('tr-TR')}</td>
      <td><span class="status-pill status-${p.status}">${statusLabel(p.status)}</span></td>
    </tr>
  `).join('');
}

/* ══════════════ ÜRÜN TABLOSU ══════════════ */
function renderProductsTable(query = '') {
  let products = getProducts();
  if (query) {
    const q = query.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)
    );
  }
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:2rem">Ürün bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td style="display:flex;align-items:center;gap:10px;padding:10px 12px">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0;">`
          : `<div style="width:40px;height:40px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${p.emoji}</div>`}
        <strong>${p.name}</strong>
      </td>
      <td>${p.cat}</td>
      <td>₺${p.price.toLocaleString('tr-TR')}</td>
      <td><span class="status-pill status-${p.status}">${statusLabel(p.status)}</span></td>
      <td style="white-space:nowrap">
        <button class="tbl-btn" onclick="editProduct(${p.id})">✏️ Düzenle</button>
        <button class="tbl-btn tbl-btn-del" onclick="deleteProduct(${p.id})" style="margin-left:4px">🗑 Sil</button>
      </td>
    </tr>
  `).join('');
}

function filterProducts() {
  renderProductsTable(document.getElementById('search-input')?.value || '');
}

/* ══════════════ MODAL ══════════════ */
function openModal(product = null) {
  editingId    = product ? product.id : null;
  pendingImage = product ? (product.image || null) : null;

  setText('modal-title', product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle');
  setValue('f-name',   product?.name   || '');
  setValue('f-price',  product?.price  || '');
  setValue('f-cat',    product?.cat    || '');
  setValue('f-desc',   product?.desc   || '');
  setValue('f-status', product?.status || 'active');
  setValue('f-new',    product ? String(!!product.isNew) : 'false');

  buildEmojiGrid(product?.emoji || '🏺');
  renderImagePreview();

  document.getElementById('modal-overlay')?.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  editingId = null; pendingImage = null;
}

function buildEmojiGrid(selected) {
  selectedEmoji = selected;
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  grid.innerHTML = EMOJIS.map(e =>
    `<div class="emoji-opt${e===selected?' selected':''}" onclick="selectEmoji('${e}')">${e}</div>`
  ).join('');
}

function selectEmoji(e) {
  selectedEmoji = e;
  document.querySelectorAll('.emoji-opt').forEach(el =>
    el.classList.toggle('selected', el.textContent === e)
  );
}

/* ── Resim Yükleme ── */
function renderImagePreview() {
  const wrap = document.getElementById('img-preview-wrap');
  if (!wrap) return;

  if (pendingImage) {
    wrap.innerHTML = `
      <div class="img-preview-box">
        <img src="${pendingImage}" alt="Ürün resmi" class="img-preview-thumb" />
        <button type="button" class="img-remove-btn" onclick="removeImage()" title="Resmi kaldır">✕</button>
      </div>
      <p class="img-hint">Değiştirmek için yeni dosya seç</p>
      <label class="img-upload-label" for="f-image">📂 Farklı resim seç</label>
    `;
  } else {
    wrap.innerHTML = `
      <label class="img-drop-zone" for="f-image" id="drop-zone">
        <span class="drop-icon">🖼️</span>
        <span class="drop-text">JPG, PNG veya WEBP yükle</span>
        <span class="drop-sub">Tıkla veya sürükle bırak • Maks 5 MB</span>
      </label>
    `;
    setupDropZone();
  }
}

function setupDropZone() {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });
}

async function handleImageFile(file) {
  if (!file.type.startsWith('image/')) { alert('Lütfen bir resim dosyası seçin.'); return; }
  if (file.size > 5 * 1024 * 1024)    { alert('Dosya boyutu 5 MB\'dan büyük olamaz.'); return; }
  try {
    pendingImage = await fileToBase64(file);
    renderImagePreview();
  } catch { alert('Resim yüklenirken hata oluştu.'); }
}

function removeImage() { pendingImage = null; renderImagePreview(); }

/* ══════════════ KAYDET / SİL ══════════════ */
function saveProduct() {
  const name   = document.getElementById('f-name')?.value.trim();
  const price  = parseInt(document.getElementById('f-price')?.value);
  const cat    = document.getElementById('f-cat')?.value.trim();
  const desc   = document.getElementById('f-desc')?.value.trim();
  const status = document.getElementById('f-status')?.value;
  const isNew  = document.getElementById('f-new')?.value === 'true';

  if (!name || !price || !cat) { alert('Lütfen zorunlu alanları (*) doldurun.'); return; }

  const products = getProducts();

  if (editingId !== null) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, price, cat, desc, status, isNew, emoji: selectedEmoji, image: pendingImage };
    }
  } else {
    products.push({ id: getNextId(), name, price, cat, desc, status, isNew, emoji: selectedEmoji, image: pendingImage });
  }

  saveProducts(products);
  closeModal();
  renderDashboard();
  if (currentSection === 'products') renderProductsTable();
  showToast(editingId ? 'Ürün güncellendi ✓' : 'Yeni ürün eklendi ✓');
}

function editProduct(id) {
  const p = getProducts().find(x => x.id === id);
  if (p) openModal(p);
}

function deleteProduct(id) {
  if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
  saveProducts(getProducts().filter(p => p.id !== id));
  renderProductsTable(); renderDashboard();
  showToast('Ürün silindi.');
}

/* ══════════════ YARDIMCILAR ══════════════ */
function statusLabel(s) {
  return { active:'Satışta', out:'Stok Yok', draft:'Taslak' }[s] || s;
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

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
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); showSection(link.dataset.section); })
  );

  /* Dosya seçici değişince işle */
  document.addEventListener('change', e => {
    if (e.target.id === 'f-image' && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  showSection('dashboard');
});
