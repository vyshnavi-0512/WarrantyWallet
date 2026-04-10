/* ----------------------------------------------------------
       CONFIG
    ---------------------------------------------------------- */
    const WEBHOOK_URL= 'https://lizzette-spiritlike-marleen.ngrok-free.dev/webhook-test/upload-receipt';

    /* ----------------------------------------------------------
       DOM REFS
    ---------------------------------------------------------- */
    const dropZone      = document.getElementById('dropZone');
    const fileInput     = document.getElementById('fileInput');
    const filePreview   = document.getElementById('filePreview');
    const previewName   = document.getElementById('previewName');
    const previewSize   = document.getElementById('previewSize');
    const removeFileBtn = document.getElementById('removeFile');
    const submitBtn     = document.getElementById('submitBtn');
    const spinner       = document.getElementById('spinner');
    const successAlert  = document.getElementById('successAlert');
    const errorAlert    = document.getElementById('errorAlert');
    const successMsg    = document.getElementById('successMsg');
    const errorMsg      = document.getElementById('errorMsg');

    // Results
    const placeholderState = document.getElementById('placeholderState');
    const resultsArea      = document.getElementById('resultsArea');
    const purchaseDateEl   = document.getElementById('purchaseDate');
    const purchaseAmountEl = document.getElementById('purchaseAmount');
    const merchantNameEl   = document.getElementById('merchantName');
    const warrantyPeriodEl = document.getElementById('warrantyPeriod');
    const ocrTextEl        = document.getElementById('ocrText');
    const warrantyBanner   = document.getElementById('warrantyBanner');
    const warrantyStatus   = document.getElementById('warrantyStatus');
    const warrantyDetail   = document.getElementById('warrantyDetail');

    let selectedFile = null;

    /* ----------------------------------------------------------
       DRAG & DROP
    ---------------------------------------------------------- */
    ['dragenter', 'dragover'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      })
    );
    ['dragleave', 'drop'].forEach(evt =>
      dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (evt === 'drop') {
          const dt = e.dataTransfer;
          if (dt.files.length) handleFileSelect(dt.files[0]);
        }
      })
    );

    /* ----------------------------------------------------------
       FILE INPUT CHANGE
    ---------------------------------------------------------- */
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFileSelect(fileInput.files[0]);
    });

    /* ----------------------------------------------------------
       HANDLE FILE SELECT
    ---------------------------------------------------------- */
    function handleFileSelect(file) {
      // Validate type
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowed.includes(file.type)) {
        showError('Unsupported file type. Please upload JPG, PNG, WEBP, or PDF.');
        return;
      }
      // Validate size (10 MB max)
      if (file.size > 10 * 1024 * 1024) {
        showError('File too large. Maximum size is 10 MB.');
        return;
      }

      selectedFile = file;
      previewName.textContent = file.name;
      previewSize.textContent = formatBytes(file.size);
      filePreview.classList.add('show');
      hideAlerts();
    }

    /* ----------------------------------------------------------
       REMOVE FILE
    ---------------------------------------------------------- */
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      filePreview.classList.remove('show');
      hideAlerts();
    });

    /* ----------------------------------------------------------
       SUBMIT
    ---------------------------------------------------------- */
    submitBtn.addEventListener('click', async () => {
      if (!selectedFile) {
        showError('Please select a receipt file first.');
        return;
      }

      setLoading(true);
      hideAlerts();

      const formData = new FormData();
      formData.append('file', selectedFile);  // key must be "file"

      try {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData
          // Do NOT set Content-Type header — browser sets it automatically with boundary
        });

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        let data = {};
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          // Try to parse as JSON anyway (some n8n responses don't set header correctly)
          const text = await response.text();
          try { data = JSON.parse(text); } catch { data = { rawText: text }; }
        }

        displayResults(data);
        showSuccess('Receipt processed successfully! Warranty details extracted.');

      } catch (err) {
        console.error('Upload error:', err);
        // If n8n is offline / ngrok tunnel is down, show demo result
        if (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed')) {
          displayDemoResults();
          showSuccess('Demo mode: Showing sample extraction (webhook offline).');
        } else {
          showError(`Upload failed: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    });

    /* ----------------------------------------------------------
       DISPLAY RESULTS FROM WEBHOOK RESPONSE
       Handles multiple possible n8n response shapes
    ---------------------------------------------------------- */
    function displayResults(data) {
      // Flatten if wrapped in array
      if (Array.isArray(data)) data = data[0] || {};

      // Try multiple common response paths
      const ocr = data.ParsedResults?.[0]?.ParsedText
                || data.parsedText
                || data.text
                || data.extracted_text
                || data.ocrText
                || data.rawText
                || '(No text extracted)';

      const date    = data.purchaseDate  || data.date    || data.invoice_date || extractDate(ocr)   || 'Not detected';
      const amount  = data.amount        || data.total   || data.price        || extractAmount(ocr) || 'Not detected';
      const merchant = data.merchant     || data.store   || data.vendor       || extractMerchant(ocr) || 'Not detected';
      const warranty = data.warranty     || data.warrantyPeriod || data.warranty_period || 'Not specified on receipt';

      purchaseDateEl.textContent   = date;
      purchaseAmountEl.textContent = amount;
      merchantNameEl.textContent   = merchant;
      warrantyPeriodEl.textContent = warranty;
      ocrTextEl.textContent        = ocr;

      // Update warranty banner
      const hasWarranty = !warranty.toLowerCase().includes('not');
      warrantyBanner.className = `warranty-banner ${hasWarranty ? 'active' : 'inactive'}`;
      warrantyStatus.textContent = hasWarranty ? 'Warranty Detected' : 'No Warranty Info Found';
      warrantyDetail.textContent = hasWarranty
        ? `Period: ${warranty}`
        : 'Check product documentation for warranty details';

      // Show results panel
      placeholderState.style.display = 'none';
      resultsArea.classList.add('show');

      // Save receipt to localStorage
      saveReceipt({
        merchant: merchant,
        date: date,
        amount: amount,
        warranty: warranty
      });

      // Scroll to results on mobile
      if (window.innerWidth < 820) {
        document.getElementById('resultsCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    /* ----------------------------------------------------------
       DEMO RESULTS (when webhook is unreachable)
    ---------------------------------------------------------- */
    function displayDemoResults() {
      displayResults({
        ParsedResults: [{ ParsedText: 'RETAIL RECEIPT\\nStore: TechZone India\\nDate: 09/04/2025\\nItem: Wireless Headphones XM5\\nQty: 1\\nPrice: ₹29,990.00\\nWarranty: 1 Year Manufacturer Warranty\\nTotal: ₹29,990.00\\nThank you for shopping with us!' }],
        purchaseDate: '09 Apr 2025',
        amount: '₹29,990.00',
        merchant: 'TechZone India',
        warranty: '1 Year Manufacturer Warranty'
      });
    }

    /* ----------------------------------------------------------
       SIMPLE OCR FIELD EXTRACTORS (client-side fallback)
    ---------------------------------------------------------- */
    function extractDate(text) {
      const match = text.match(/\\b(\\d{1,2}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{2,4})\\b/);
      return match ? match[1] : null;
    }
    function extractAmount(text) {
      const match = text.match(/(?:total|amount|price|rs\.?|₹|inr)\s*[:\-]?\s*([\d,]+\.?\d{0,2})/i);
      if (match) return '₹' + match[1];
      const plain = text.match(/₹\s*([\d,]+\.?\d{0,2})/);
      return plain ? '₹' + plain[1] : null;
    }
    function extractMerchant(text) {
      const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
      return lines[0] || null;
    }

    /* ----------------------------------------------------------
       UI HELPERS
    ---------------------------------------------------------- */
    function setLoading(isLoading) {
      submitBtn.disabled = isLoading;
      spinner.classList.toggle('show', isLoading);
      submitBtn.style.display = isLoading ? 'none' : 'flex';
    }

    function showSuccess(msg) {
      successMsg.textContent = msg;
      successAlert.classList.add('show');
      errorAlert.classList.remove('show');
    }

    function showError(msg) {
      errorMsg.textContent = msg;
      errorAlert.classList.add('show');
      successAlert.classList.remove('show');
    }

    function hideAlerts() {
      successAlert.classList.remove('show');
      errorAlert.classList.remove('show');
    }

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /* ----------------------------------------------------------
       LOCALSTORAGE: RECEIPT MANAGEMENT
    ---------------------------------------------------------- */
    function saveReceipt(receiptData) {
      try {
        const receipts = JSON.parse(localStorage.getItem('receipts')) || [];
        
        const receipt = {
          id: Date.now(),
          merchant: receiptData.merchant,
          date: receiptData.date,
          amount: receiptData.amount,
          warranty: receiptData.warranty,
          savedAt: new Date().toISOString()
        };
        
        receipts.unshift(receipt); // Add to front
        localStorage.setItem('receipts', JSON.stringify(receipts));
        
        // Update UI
        loadReceipts();
        
      } catch (err) {
        console.error('Error saving receipt:', err);
      }
    }

    function loadReceipts() {
      try {
        const receipts = JSON.parse(localStorage.getItem('receipts')) || [];
        const receiptsGrid = document.getElementById('receiptsGrid');
        
        if (!receiptsGrid) return;
        
        // Clear existing dynamic receipts (keep placeholder intact)
        const existingDynamic = receiptsGrid.querySelectorAll('[data-receipt-id]');
        existingDynamic.forEach(card => card.remove());
        
        if (receipts.length === 0) {
          // Show empty state if no receipts
          if (receiptsGrid.children.length === 0) {
            receiptsGrid.innerHTML = '<div class="empty-receipts"><svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg><p>No receipts stored yet.<br/>Start by uploading your first receipt!</p></div>';
          }
          return;
        }
        
        // Render stored receipts
        receipts.forEach(receipt => {
          const card = createReceiptCard(receipt);
          receiptsGrid.insertBefore(card, receiptsGrid.firstChild);
        });
        
      } catch (err) {
        console.error('Error loading receipts:', err);
      }
    }

    function createReceiptCard(receipt) {
      const card = document.createElement('div');
      card.className = 'receipt-card';
      card.setAttribute('data-receipt-id', receipt.id);
      
      const status = getWarrantyStatus(receipt);
      const warrantySinceDays = calculateWarrantySinceDays(receipt);
      const warrantyPercent = Math.min(100, warrantySinceDays);
      const fillClass = getProgressFillClass(status);
      
      card.innerHTML = `
        <div class="receipt-card-header">
          <div class="receipt-product-icon">
            <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <span class="warranty-chip ${getChipClass(status)}">${status}</span>
        </div>
        <h4>${escapeHtml(receipt.merchant)}</h4>
        <p class="merchant">${escapeHtml(receipt.merchant)} · Receipt</p>
        <div class="receipt-meta">
          <span class="meta-pill">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${receipt.date}
          </span>
          <span class="meta-pill">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${receipt.warranty}
          </span>
        </div>
        <div class="receipt-card-footer">
          <div class="warranty-progress">
            <div class="progress-label"><span>Warranty used</span><span>${Math.min(100, warrantyPercent)}%</span></div>
            <div class="progress-bar"><div class="progress-fill ${fillClass}" style="width:${Math.min(100, warrantyPercent)}%"></div></div>
          </div>
          <div class="receipt-amount">${receipt.amount}</div>
        </div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button class="del-btn" onclick="deleteReceipt(${receipt.id})" style="flex: 1; padding: 8px 12px; background: #FEE2E2; border: 1px solid #FECACA; color: #991B1B; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none;">
            Delete
          </button>
        </div>
      `;
      
      return card;
    }

    function deleteReceipt(receiptId) {
      try {
        let receipts = JSON.parse(localStorage.getItem('receipts')) || [];
        receipts = receipts.filter(r => r.id !== receiptId);
        localStorage.setItem('receipts', JSON.stringify(receipts));
        
        // Remove card from UI
        const card = document.querySelector(`[data-receipt-id="${receiptId}"]`);
        if (card) {
          card.style.animation = 'slide-out 0.2s ease forwards';
          setTimeout(() => card.remove(), 200);
        }
        
        loadReceipts();
        
      } catch (err) {
        console.error('Error deleting receipt:', err);
      }
    }

    function getWarrantyStatus(receipt) {
      const warranty = receipt.warranty.toLowerCase();
      if (warranty.includes('not specified') || warranty.includes('not detected')) {
        return 'Unknown';
      }
      
      const daysSincePurchase = calculateWarrantySinceDays(receipt);
      const warrantyDays = parseWarrantyToDays(receipt.warranty);
      
      if (warrantyDays === null) {
        return 'Active';
      }
      
      if (daysSincePurchase > warrantyDays) {
        return 'Expired';
      } else if (daysSincePurchase > warrantyDays * 0.8) {
        return 'Expiring';
      }
      
      return 'Active';
    }

    function calculateWarrantySinceDays(receipt) {
      const dateStr = receipt.date;
      const parsedDate = parseDate(dateStr);
      if (!parsedDate) return 0;
      
      const today = new Date();
      const diffTime = Math.abs(today - parsedDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    function parseDate(dateStr) {
      // Try common date formats: "15 Jan 2024", "Jan 15, 2024", "2024-01-15", "15/01/2024"
      let date;
      
      // Format: "15 Jan 2024" or "15-Jan-2024"
      date = new Date(dateStr);
      if (!isNaN(date)) return date;
      
      // Try parsing manually for other formats
      const patterns = [
        /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/,  // "15 Jan 2024"
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,  // "15/01/2024"
      ];
      
      for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
          try {
            return new Date(match[0]);
          } catch (e) {}
        }
      }
      
      return null;
    }

    function parseWarrantyToDays(warrantyStr) {
      // Parse "1 Year", "2 months", "6 years", etc.
      const warranty = warrantyStr.toLowerCase();
      
      const yearMatch = warranty.match(/([\d.]+)\s*y(?:ear)?s?/);
      if (yearMatch) {
        return Math.round(parseFloat(yearMatch[1]) * 365);
      }
      
      const monthMatch = warranty.match(/([\d.]+)\s*m(?:onth)?s?/);
      if (monthMatch) {
        return Math.round(parseFloat(monthMatch[1]) * 30);
      }
      
      const dayMatch = warranty.match(/([\d.]+)\s*d(?:ay)?s?/);
      if (dayMatch) {
        return Math.round(parseFloat(dayMatch[1]));
      }
      
      return null;
    }

    function getChipClass(status) {
      switch(status) {
        case 'Active': return 'chip-active';
        case 'Expiring': return 'chip-expiring';
        case 'Expired': return 'chip-expired';
        default: return 'chip-active';
      }
    }

    function getProgressFillClass(status) {
      switch(status) {
        case 'Expired': return 'fill-red';
        case 'Expiring': return 'fill-amber';
        default: return 'fill-green';
      }
    }

    function escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    }

    /* ----------------------------------------------------------
       ANIMATE PROGRESS BARS ON LOAD
    ---------------------------------------------------------- */
    window.addEventListener('load', () => {
      // Load stored receipts from localStorage
      loadReceipts();
      
      // Animate progress bars
      document.querySelectorAll('.progress-fill').forEach(el => {
        const w = el.style.width;
        el.style.width = '0';
        setTimeout(() => { el.style.width = w; }, 300);
      });
    });
