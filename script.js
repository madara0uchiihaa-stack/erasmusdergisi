// PDF.js motorunun arka planda çalışması için gerekli worker dosyasını CDN'den bağlıyoruz
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Global Durum Yönetimi (State)
let pdfDoc = null;
let currentSpread = 0; // Dergide o an açık olan çift sayfa indeksi
let totalSpreads = 0;  // Toplam çift sayfa sayısı
let pagesArr = [];     // DOM'a eklenen sayfa elementlerinin referans listesi

// DOM Elemanları Seçimi
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

// Proje klasöründeki varsayılan PDF adını erasmus.pdf olarak güncelledik
const DEFAULT_PDF = 'erasmus.pdf'; 

// ==================================================
// OLAY DİNLEYİCİLERİ (EVENT LISTENERS)
// ==================================================

// Klasördeki sabit dergiyi oku butonu tıklandığında
btnRead.addEventListener('click', () => {
    loadPDF(DEFAULT_PDF);
});

// Kullanıcı kendi bilgisayarından bir PDF yüklediğinde
pdfUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        const fileURL = URL.createObjectURL(file);
        loadPDF(fileURL); // Oluşturulan sanal URL ile PDF yüklenir
    } else if (file) {
        alert('Lütfen sadece .pdf formatında bir dosya seçin.');
    }
});

// Dergi ekranından çıkış yapıp ana sayfaya geri dönme
btnBack.addEventListener('click', () => {
    viewerScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    flipbook.innerHTML = ''; // Bellek temizliği için DOM içeriğini boşaltıyoruz
    pagesArr = [];
});

// Sayfa gezinti butonları tetikleyicileri
btnPrev.addEventListener('click', showPrevSpread);
btnNext.addEventListener('click', showNextSpread);

// Masaüstü kullanıcıları için Klavye Ok Tuşları desteği
document.addEventListener('keydown', (e) => {
    if (viewerScreen.classList.contains('hidden')) return; // Görüntüleyici açık değilse çalışma
    if (e.key === 'ArrowLeft') showPrevSpread();
    if (e.key === 'ArrowRight') showNextSpread();
});


// ==================================================
// PDF ASENKRON YÜKLEME VE İŞLEME FONKSİYONLARI
// ==================================================

async function loadPDF(url) {
    loader.classList.remove('hidden'); // Yükleniyor animasyonunu başlat
    flipbook.innerHTML = '';
    pagesArr = [];
    currentSpread = 0;

    try {
        // PDF dosyasını asenkron olarak indirip çözümlüyoruz
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        totalPagesSpan.textContent = pdfDoc.numPages;
        
        // Toplam çift sayfa (Spread) ihtiyacını hesapla
        totalSpreads = Math.ceil(pdfDoc.numPages / 2);

        // Her bir PDF sayfasını sırayla render et (Sıralı olmaları için await kullanıldı)
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            await renderPageToBook(pageNum);
        }

        // Sayfa yerleşim düzenini ilk kez çalıştır
        updateSpreadVisibility();
        
        // Arayüz ekranlarını değiştir
        homeScreen.classList.add('hidden');
        viewerScreen.classList.remove('hidden');
    } catch (error) {
        console.error('PDF işleme hatası:', error);
        alert('Seçilen PDF dosyası yüklenirken bir hata oluştu veya dosya bulunamadı.');
    } finally {
        loader.classList.add('hidden'); // İşlem bitince yükleniyor ekranını kapat
    }
}

async function renderPageToBook(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    
    // Masaüstü ekranlarda yüksek netlik/çözünürlük sağlamak için ölçek katsayısı (Scale)
    const viewport = page.getViewport({ scale: 1.6 });
    
    // Sayfa için HTML iskeletini inşa etme
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('book-page');
    
    // Dergi Tasarım Mantığı: 1. Sayfa kapaktır ve sağda durur. Çift sayılar solda, tek sayılar sağdadır.
    if (pageNum === 1) {
        pageDiv.classList.add('right-side'); 
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
    pagesArr.push(pageDiv); // İleride kolayca erişebilmek için listeye ekle

    // PDF.js katmanı ile PDF'i canvas elementi üzerine çiziyoruz
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;
}


// ==================================================
// FLIPBOOK ETKİLEŞİM VE ANİMASYON YÖNETİMİ
// ==================================================

function updateSpreadVisibility() {
    // Sayfa numarasını üst barda dinamik güncelleme (Örn: "2-3 / 16")
    if (currentSpread === 0) {
        currentPageSpan.textContent = "1 (Kapak)";
    } else {
        const startPage = currentSpread * 2;
        const endPage = Math.min(startPage + 1, pdfDoc.numPages);
        currentPageSpan.textContent = startPage === endPage ? startPage : `${startPage}-${endPage}`;
    }

    // CSS 3D dönüşümlerini ve görünürlük durumlarını yöneten ana döngü
    pagesArr.forEach((pageElement, index) => {
        const pageNum = index + 1;
        
        if (currentSpread === 0) {
            // Sadece kapak görünür olsun, diğer tüm sayfalar başlangıçta gizlenir
            if (pageNum === 1) {
                pageElement.style.display = 'block';
                pageElement.classList.remove('flipped');
            } else {
                pageElement.style.display = 'none';
            }
        } else {
            // Aktif olarak açılması gereken Sol ve Sağ sayfa numaralarını bul
            const activeLeft = currentSpread * 2;
            const activeRight = activeLeft + 1;

            if (pageNum < activeLeft) {
                // Okunmuş, geçmiş sayfalar: Sola doğru 3D katlanmış ve arkada kalmış durumda
                pageElement.style.display = 'block';
                pageElement.classList.add('flipped');
            } else if (pageNum === activeLeft || pageNum === activeRight) {
                // Şu an ekranda açık duran iki sayfa
                pageElement.style.display = 'block';
                pageElement.classList.remove('flipped');
            } else {
                // Henüz açılmamış, ilerideki sayfalar: CPU/GPU yormamak için gizlenir
                pageElement.style.display = 'none';
                pageElement.classList.remove('flipped'); // <--- Hata buradaydı, düzeltildi!
            }
        }
    });
}

// Sonraki sayfaya geçiş tetikleyicisi
function showNextSpread() {
    if (currentSpread < totalSpreads - 1) {
        currentSpread++;
        updateSpreadVisibility();
    }
}

// Önceki sayfaya geri dönme tetikleyicisi
function showPrevSpread() {
    if (currentSpread > 0) {
        currentSpread--;
        updateSpreadVisibility();
    }
}
