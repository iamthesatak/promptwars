// State Variables
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
let originalPdfBytes = null;
let fileName = "document.pdf";
let isEditing = false;

// Annotations Dictionary
// Key: Page Number, Value: Array of {text, xFrac, yFrac, fontSize}
let pageAnnotations = {};

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const textLayer = document.getElementById('text-layer');

/**
 * Handle File Upload
 */
document.getElementById('file-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file && file.type === "application/pdf") {
    fileName = file.name;
    document.getElementById('file-name-display').innerText = fileName;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      originalPdfBytes = new Uint8Array(evt.target.result);
      loadPdfFromBytes(originalPdfBytes);
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert("Please select a valid PDF file.");
  }
});

/**
 * Load PDF with pdf.js
 */
function loadPdfFromBytes(bytes) {
  const loadingTask = pdfjsLib.getDocument({data: bytes});
  loadingTask.promise.then(function(pdfDoc_) {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    
    // Clear old annotations
    pageAnnotations = {};
    
    // Render first page
    pageNum = 1;
    renderPage(pageNum);
  }).catch(function(err) {
    console.error("Error loading PDF: ", err);
    alert("Could not load PDF.");
  });
}

/**
 * Render PDF page to Canvas
 */
function renderPage(num) {
  pageRendering = true;
  
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({scale: scale});
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    // Clear existing text inputs from layer
    textLayer.innerHTML = '';
    
    const renderTask = page.render(renderContext);
    renderTask.promise.then(function() {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
      
      // Draw standard annotations on top
      restoreAnnotations(num);
    });
  });

  document.getElementById('page-num').textContent = num;
}

/**
 * Queue a page for rendering.
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Pagination Controls
 */
document.getElementById('btn-prev').addEventListener('click', function() {
  if (pdfDoc === null || pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
});

document.getElementById('btn-next').addEventListener('click', function() {
  if (pdfDoc === null || pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
});

/**
 * Zoom Controls
 */
document.getElementById('btn-zoom-in').addEventListener('click', function() {
  if (pdfDoc === null || scale >= 3.0) return;
  scale += 0.25;
  document.getElementById('zoom-level').innerText = Math.round(scale * 100) + '%';
  queueRenderPage(pageNum);
});

document.getElementById('btn-zoom-out').addEventListener('click', function() {
  if (pdfDoc === null || scale <= 0.5) return;
  scale -= 0.25;
  document.getElementById('zoom-level').innerText = Math.round(scale * 100) + '%';
  queueRenderPage(pageNum);
});

/**
 * Editor Tooling Toggle
 */
document.getElementById('btn-add-text').addEventListener('click', function(e) {
  if (!pdfDoc) {
    alert("Please open a PDF first.");
    return;
  }
  isEditing = !isEditing;
  if (isEditing) {
    e.target.classList.add('active');
    textLayer.classList.add('editing-active');
  } else {
    e.target.classList.remove('active');
    textLayer.classList.remove('editing-active');
  }
});

/**
 * Add Text functionality
 */
textLayer.addEventListener('click', function(e) {
  if (!isEditing) return;
  
  // If clicked directly on an existing element, do nothing to avoid nesting inputs
  if (e.target !== textLayer) return;

  const rect = textLayer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-annotation-input';
  input.style.left = x + 'px';
  input.style.top = y + 'px';
  input.style.fontSize = (16 * scale) + 'px'; // Base 16px scaled
  input.placeholder = "Type here & click outside";
  
  textLayer.appendChild(input);
  input.focus();
  
  input.addEventListener('blur', function() {
    const textVal = input.value.trim();
    if (textVal.length > 0) {
      if (!pageAnnotations[pageNum]) {
        pageAnnotations[pageNum] = [];
      }
      
      // Store relative fractions so it works across zoom levels
      pageAnnotations[pageNum].push({
        text: textVal,
        xFrac: x / textLayer.clientWidth,
        yFrac: y / textLayer.clientHeight,
        fontSize: 14 // Base font size unit
      });
      restoreAnnotations(pageNum);
    }
    if (textLayer.contains(input)) {
        textLayer.removeChild(input);
    }
  });
  
  // Auto-remove on enter
  input.addEventListener('keypress', function(evt) {
      if (evt.key === 'Enter') {
          input.blur();
      }
  });
});

/**
 * Re-draw completed text annotations on the text layer
 */
function restoreAnnotations(num) {
  // First clean up old static elements
  const oldElements = textLayer.querySelectorAll('.text-annotation-display');
  oldElements.forEach(el => el.remove());
  
  const annots = pageAnnotations[num] || [];
  annots.forEach(annot => {
    const div = document.createElement('div');
    div.className = 'text-annotation-display';
    div.innerText = annot.text;
    
    // Convert fraction back to CSS pixels at current scale
    div.style.left = (annot.xFrac * textLayer.clientWidth) + 'px';
    div.style.top = (annot.yFrac * textLayer.clientHeight) + 'px';
    div.style.fontSize = (annot.fontSize * scale) + 'px';
    
    textLayer.appendChild(div);
  });
}

/**
 * Save current state logic compiling with pdf-lib
 */
document.getElementById('btn-save-pdf').addEventListener('click', async function() {
  if (!originalPdfBytes) {
    alert("Please open a PDF first.");
    return;
  }
  
  const originalLabel = this.innerText;
  this.innerText = "Saving...";
  
  try {
    // Load original PDF context
    const pdfLibDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
    const pages = pdfLibDoc.getPages();
    
    // Embed custom font to handle all text safely
    const helveticaFont = await pdfLibDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    
    for (const [pNum, annots] of Object.entries(pageAnnotations)) {
      const pageIndex = parseInt(pNum) - 1;
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        
        for (const annot of annots) {
          // pdf-lib origin is Bottom-Left. HTML CSS origin is Top-Left.
          const x = annot.xFrac * width;
          // Approximate the font rendering baseline offset
          const pdfFontSize = annot.fontSize; 
          const y = height - (annot.yFrac * height) - pdfFontSize; 
          
          page.drawText(annot.text, {
            x: x,
            y: y,
            size: pdfFontSize,
            font: helveticaFont,
            color: PDFLib.rgb(0, 0, 0)
          });
        }
      }
    }
    
    // Serialize PDF
    const pdfBytes = await pdfLibDoc.save();
    
    // Trigger Download
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName.replace(".pdf", "_edited.pdf");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error(error);
    alert("Error saving PDF. Check console for details.");
  } finally {
    this.innerText = originalLabel;
  }
});
