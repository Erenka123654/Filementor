/* ═══════════════════════════════════════════
   products.js — Ürün Veri Yönetimi
   LocalStorage ile kalıcı saklama
   image: base64 string veya null
   ═══════════════════════════════════════════ */

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Dekoratif Vazo', cat: 'Dekor', price: 180, status: 'active', emoji: '🏺', isNew: true,  desc: 'Zarif çizgilere sahip el yapımı dekoratif vazo.', image: null },
  { id: 2, name: 'Masa Lambası Kapağı', cat: 'Aydınlatma', price: 240, status: 'active', emoji: '💡', isNew: false, desc: 'E27 duy uyumlu geometrik lamba kapağı.', image: null },
  { id: 3, name: 'Saksı Seti (3 parça)', cat: 'Dekor', price: 320, status: 'active', emoji: '🪴', isNew: true,  desc: 'Farklı boyutlarda iç mekan bitki saksısı seti.', image: null },
  { id: 4, name: 'Özel Dinosaur Figura', cat: 'Oyuncak', price: 150, status: 'out',    emoji: '🦕', isNew: false, desc: 'Detaylı boyalı T-Rex figürü, çocuklar için ideal.', image: null },
  { id: 5, name: 'Dişli Mekanizma Seti', cat: 'Hobi', price: 95, status: 'active', emoji: '⚙️', isNew: false, desc: 'Birbirine geçen 5 farklı boyut dişli seti.', image: null },
  { id: 6, name: 'El Yapımı Satranç Seti', cat: 'Oyun', price: 450, status: 'draft',   emoji: '♟️', isNew: false, desc: '32 parça özel tasarım satranç takımı.', image: null },
  { id: 7, name: 'Duvar Organizeri', cat: 'Ev', price: 200, status: 'active', emoji: '🔑', isNew: true,  desc: 'Anahtarlık, not kağıdı ve kalem tutucu.', image: null },
  { id: 8, name: 'Uzay Roketi Figürü', cat: 'Hobi', price: 130, status: 'active', emoji: '🚀', isNew: false, desc: 'Detaylı boyalı roket maketi, masa dekoru.', image: null },
];

const STORAGE_KEY = 'printcraft_products';
const NEXT_ID_KEY  = 'printcraft_next_id';
const EMOJIS = ['🏺','🪴','💡','⚙️','🎮','🔧','🐾','🌸','🦕','🚀','♟️','🎭','🔑','🌙','🎲','🏠','🎨','🌿','🍃','🦋','🏆','🎪','🔮','🌺'];

function getProducts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [...DEFAULT_PRODUCTS];
  } catch { return [...DEFAULT_PRODUCTS]; }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function getNextId() {
  const id = parseInt(localStorage.getItem(NEXT_ID_KEY) || '9');
  localStorage.setItem(NEXT_ID_KEY, id + 1);
  return id;
}

/* Resmi base64'e çeviren yardımcı — max 800px, JPEG kalitesi 0.82 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const MAX = 800;
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else        { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

if (!localStorage.getItem(STORAGE_KEY)) {
  saveProducts(DEFAULT_PRODUCTS);
}
