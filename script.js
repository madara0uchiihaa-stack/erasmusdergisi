pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null;
let pageFlip = null;
const DEFAULT_PDF = 'erasmus.pdf'; // Senin meşhur dosya adın :)

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

btnRead.addEventListener('click', () => loadPDF(DEFAULT_PDF));

pdfUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadPDF(URL.createObjectURL(file));
    }
});

btnBack.addEventListener('click', () => {
    if (pageFlip) {
        pageFlip.destroy();
        pageFlip = null;
    }
    viewerScreen.classList.add('hidden');
    homeScreen.classList.remove('hidden');
    flipbook.innerHTML = '';
});

async function loadPDF(url) {
    loader.classList.remove('hidden');
    flipbook.innerHTML = '';
    
    try {
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        totalPagesSpan.textContent = pdfDoc.numPages;

        // Önce tüm sayfaları arka arkaya oluşturup hazırlıyoruz
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            await renderPage(pageNum);
        }

        // Ekranı gösteriyoruz ki kütüphane boyutları doğru hesaplasın
        homeScreen.classList.add('hidden');
        viewerScreen.classList.remove('hidden');

        // GERÇEKÇİ KIVRILMA MOTORUNU BAŞLATMA
        initPageFlip();

    } catch (error) {
        console.error(error);
        alert('PDF yüklenirken bir hata oluştu.');
    } finally {
        loader.classList.add('hidden');
    }
}

async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    // Kütüphanenin istediği sayfa yapısı
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page-component');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    pageDiv.appendChild(canvas);
    flipbook.appendChild(pageDiv);

    await page.render({ canvasContext: context, viewport: viewport }).promise;
}

function initPageFlip() {
    // İlk sayfanın boyutlarına göre dergi boyutunu senkronize et
    const firstCanvas = flipbook.querySelector('canvas');
    const width = firstCanvas.clientWidth;
    const height = firstCanvas.clientHeight;

    pageFlip = new St.PageFlip(flipbook, {
        width: width,
        height: height,
        size: "fixed",
        minWidth: 300,
        maxWidth: 1200,
        minHeight: 400,
        maxHeight: 1600,
        drawShadow: true, // Muazzam gölge efekti açık
        showCover: true,  // İlk sayfa tek kapak olarak başlar
        usePortrait: true // Mobilde tek sayfaya otomatik düşer
    });

    // Sayfaları yükle
    pageFlip.loadFromHTML(document.querySelectorAll('.page-component'));

    // Sayfa değiştikçe numaraları güncelle
    currentPageSpan.textContent = pageFlip.getCurrentPageIndex() + 1;
    
    pageFlip.on('flip', (e) => {
        currentPageSpan.textContent = e.data + 1;
    });

    // Buton kontrollerini kütüphaneye bağlama
    btnPrev.onclick = () => pageFlip.flipPrev();
    btnNext.onclick = () => pageFlip.flipNext();
}
