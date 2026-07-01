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
    } else if (file)
