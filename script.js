// PDF.js worker yolunu tanımlıyoruz (CDN üzerinden)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Global Değişkenler
let pdfDoc = null;
let currentSpread = 0; // Dergideki aktif çift sayfa indeksi
let totalSpreads = 0;
let pagesArr = []; // Oluşturulan sayfa elementlerini tutar

// DOM Elemanları
const homeScreen = document.getElementById('home-screen');
const viewerScreen = document.getElementById('viewer-screen');
const flipbook = document.getElementById('flipbook');
const loader = document.getElementById('loader');

const btnRead = document.getElementById('btn-read');
const btnBack = document.getElementById('btn-back');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const pdfUpload = document.getElementById('pdf-upload');

const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');

// Klasördeki varsayılan PDF dosyasının adı
const DEFAULT_PDF = 'dergi.pdf'; 

// --- EVENT LISTENERS (OLAY DİNLEYİCİLERİ) ---

// "Dergiyi Oku" butonu tetikleyicisi
btnRead.addEventListener('click', () => {
    loadPDF(DEFAULT_PDF);
});

// Yerel cihazdan PDF yükleme tetikleyicisi
pdfUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const fileURL = URL.createObjectURL(file);
        loadPDF(fileURL);
    } else {
        alert('Lütfen geçerli bir PDF dosyası seçin.');
    }
});

// Görüntüleyiciden çıkış (Geri dön)
btnBack.addEventListener('click', () => {
    viewerScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    flipbook.innerHTML = ''; // Hafızayı ve DOM'u temizle
});

// Sayfa değiştirme butonları
btnPrev.addEventListener('click', showPrevSpread);
btnNext.addEventListener('click', showNextSpread);

// Klavye ok tuşları ile kontrol
document.addEventListener('keydown', (e) => {
    if (viewerScreen.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') showPrevSpread();
    if (e.key === 'ArrowRight') showNextSpread();
});


// --- PDF İŞLEME VE RENDER SÜRECİ ---

async function loadPDF(url) {
    loader.classList.remove('hidden');
    flipbook.innerHTML = '';
    pagesArr = [];
    currentSpread = 0;

    try {
        // PDF dosyasını yükle
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        totalPagesSpan.textContent = pdfDoc.numPages;
        
        // Çift sayfa düzeni (Spread) hesaplama
        totalSpreads = Math.ceil(pdfDoc.numPages / 2);

        // Her sayfayı render et ve DOM yapısını kur
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            await renderPage(pageNum);
        }

        // İlk görünümü ayarla
        updateSpreadVisibility();
        
        // Ekranları değiştir
        homeScreen.classList.add('hidden');
        viewerScreen.classList.remove('hidden');
    } catch (error) {
        console.error('PDF yüklenirken hata oluştu:', error);
        alert('PDF yüklenemedi. Dosya yolunu veya dosyayı kontrol edin.');
    } finally {
        loader.classList.add('hidden');
    }
}

async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    
    // Yüksek kaliteli render için scale ayarı
    const viewport = page.getViewport({ scale: 1.5 });
    
    // HTML Elementlerini Oluşturma
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('book-page');
    
    // Dergi mantığı: Tek sayılar sağda, çift sayılar solda durur (1. sayfa hariç kapaktır)
    if (pageNum === 1) {
        pageDiv.classList.add('right-side'); // Kapak sağda başlar
    } else if (pageNum % 2 === 0) {
        pageDiv.classList.add('left-side');
    } else {
        pageDiv.classList.add('right-side');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    pageDiv.appendChild(canvas);
    flipbook.appendChild(pageDiv);
    pagesArr.push(pageDiv);

    // PDF sayfasını Canvas üzerine çizme
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;
}

// --- FLIPBOOK (SAYFA ÇEVİRME) MANTIĞI ---

function updateSpreadVisibility() {
    // Sayfa numarası güncelleme (Örn: "2-3 / 12")
    if (currentSpread === 0) {
        currentPageSpan.textContent = "1 (Kapak)";
    } else {
        const startPage = currentSpread * 2;
        const endPage = Math.min(startPage + 1, pdfDoc.numPages);
        currentPageSpan.textContent = startPage === endPage ? startPage : `${startPage}-${endPage}`;
    }

    // CSS 3D Efektlerini tetikleme döngüsü
    pagesArr.forEach((pageElement, index) => {
        const pageNum = index + 1;
        
        if (currentSpread === 0) {
            // Sadece kapak (1. Sayfa) görünür, diğerleri arkada bekler
            if (pageNum === 1) {
                pageElement.style.display = 'block';
                pageElement.classList.remove('flipped');
            } else {
                pageElement.style.display = 'none';
            }
        } else {
            // Aktif çift sayfaları yönetme
            const activeLeft = currentSpread * 2;
            const activeRight = activeLeft + 1;

            if (pageNum < activeLeft) {
                // Geçilmiş sayfalar (Sola katlanmış)
                pageElement.style.display = 'block';
                pageElement.classList.add('flipped');
            } else if (pageNum === activeLeft || pageNum === activeRight) {
                // Şu an ekranda açık olan sol ve sağ sayfa
                pageElement.style.display = 'block';
                pageElement.classList.remove('flipped');
            } else {
                // Gelecek sayfalar (Sağda arkada bekleyenler)
                pageElement.style.display = 'none';
                pageElement.classList.remove('flipped');
            }
        }
    });
}

function showNextSpread() {
    if (currentSpread < totalSpreads - 1) {
        currentSpread++;
        updateSpreadVisibility();
    }
}

function showPrevSpread() {
    if (currentSpread > 0) {
        currentSpread--;
        updateSpreadVisibility();
    }
}
