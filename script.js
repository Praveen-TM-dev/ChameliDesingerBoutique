/**
 * Chameli Designer Boutique (Kizhakkambalam) - Application Engine
 * Server-Synced Asset & Image File Manager (assets/images/)
 * Batch Multi-File Upload & Automatic Grid + Slide Carousel Sync
 */

const SERVER_BASE_URL = (window.location.protocol.startsWith('http')) 
  ? window.location.origin 
  : 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Shared Components
  initNavigation();
  initThemeSwitcher();
  initLogoCustomizer();
  initPeacockWelcomeLoader();
  
  // Load custom assets from local backend server or local storage
  await loadCustomAssets();

  // Main Page Initialization
  if (document.getElementById('collectionsGridView')) {
    renderCustomAssetsOnMainPage();
    initSlider();
    initFormatSwitcher();
    initGridFilters();
    initFileUpload();
    initQuickViewModal();
    initFormCalculators();
  }

  // Admin Asset Manager Initialization
  if (document.getElementById('adminAssetForm')) {
    initAdminAssetUploader();
    await renderAdminAssetsManager();
  }
});

let globalCustomAssets = [];
let allDiskImages = [];

/* Fetch Custom Assets & Scanned Disk Images from Local Server */
async function loadCustomAssets() {
  try {
    const res = await fetch(`${SERVER_BASE_URL}/api/collections`);
    if (res.ok) {
      let data = await res.json();
      if (data && !Array.isArray(data)) data = [data];
      globalCustomAssets = data || [];
      localStorage.setItem('chameli_custom_assets', JSON.stringify(globalCustomAssets));
      return;
    }
  } catch (err) {
    console.log("Local server offline, checking local storage backup.");
  }
  
  const localData = localStorage.getItem('chameli_custom_assets');
  if (localData) {
    let parsed = JSON.parse(localData);
    if (parsed && !Array.isArray(parsed)) parsed = [parsed];
    globalCustomAssets = parsed || [];
  } else {
    globalCustomAssets = [];
  }
}

/* Fetch ALL physical image files from assets/images/ directory */
async function fetchAllDiskImages() {
  try {
    const res = await fetch(`${SERVER_BASE_URL}/api/all-images`);
    if (res.ok) {
      allDiskImages = await res.json();
      return allDiskImages;
    }
  } catch (err) {
    console.log("Unable to fetch disk images directly from server.");
  }
  return [];
}

function saveLocalAssetsBackup(assets) {
  globalCustomAssets = Array.isArray(assets) ? assets : [assets];
  localStorage.setItem('chameli_custom_assets', JSON.stringify(globalCustomAssets));
}

/* Navigation scroll effect */
function initNavigation() {
  const header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* Render Custom Assets onto Main Boutique Page (index.html) */
function renderCustomAssetsOnMainPage() {
  const sliderWrapper = document.getElementById('sliderWrapper');
  const productGrid = document.querySelector('.product-grid');

  if (!globalCustomAssets || !Array.isArray(globalCustomAssets) || !globalCustomAssets.length) return;

  globalCustomAssets.forEach((item) => {
    // 1. Add to Grid Gallery View (Primary Default View)
    if (item.target !== 'hero' && item.target !== 'logo' && productGrid) {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'product-card';
      cardDiv.setAttribute('data-category', item.category || 'bridal');

      const badgeText = item.badge || 'BRIDAL 2026';

      cardDiv.innerHTML = `
        <div class="card-img-wrapper">
          <img src="${item.imgSrc}" alt="${item.title}" class="card-img">
          <span class="card-badge">${badgeText}</span>
          <div class="card-actions">
            <button class="action-btn view-product-btn" title="Quick View"><i class="fas fa-eye"></i></button>
            <button class="action-btn" title="Add to Wishlist"><i class="fas fa-heart"></i></button>
            <a href="#custom-orders" class="action-btn" title="Custom Stitch"><i class="fas fa-magic"></i></a>
          </div>
        </div>
        <div class="card-body">
          <span class="card-category">${item.categoryName || 'Custom Outfit'}</span>
          <h4 class="card-title">${item.title}</h4>
          <div class="card-footer">
            <span class="card-price">${item.price || 'Custom Couture'}</span>
            <a href="#custom-orders" class="btn-primary" style="padding: 6px 14px; font-size: 0.75rem;">Upload Reference</a>
          </div>
        </div>
      `;
      productGrid.prepend(cardDiv);
    }

    // 2. Add to Slide View (Carousel) for ALL custom uploaded assets
    if (item.target !== 'hero' && item.target !== 'logo' && sliderWrapper) {
      const slideDiv = document.createElement('div');
      slideDiv.className = 'slide-item';
      slideDiv.innerHTML = `
        <div class="slide-img-wrapper">
          <img src="${item.imgSrc}" alt="${item.title}" class="slide-img">
        </div>
        <div class="slide-details">
          <span class="slide-category">${item.badge || item.categoryName || 'Custom Collection'}</span>
          <h3 class="slide-title gold-gradient-text">${item.title}</h3>
          <p class="slide-description">${item.description || 'Exclusive handcrafted designer outfit from Chameli Boutique.'}</p>
          <div class="slide-specs">
            <div class="spec-item">
              <span class="spec-label">Fabric</span>
              <span class="spec-val">${item.fabric || 'Boutique Custom Fabric'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Price Tag</span>
              <span class="spec-val">${item.price || 'Custom Couture'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Folder Path</span>
              <span class="spec-val">assets/images/</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Location</span>
              <span class="spec-val">Kizhakkambalam</span>
            </div>
          </div>
          <div style="display: flex; gap: 1rem;">
            <a href="#custom-orders" class="btn-primary">
              <i class="fas fa-cloud-upload-alt"></i>
              <span>Order Custom Fit</span>
            </a>
            <button class="btn-secondary view-product-btn">
              <i class="fas fa-eye"></i>
              <span>Quick View</span>
            </button>
          </div>
        </div>
      `;
      sliderWrapper.prepend(slideDiv);
    }

    // 3. Set as Hero Background if target is 'hero'
    if (item.target === 'hero') {
      const heroBgImg = document.querySelector('.hero-bg-img');
      if (heroBgImg) heroBgImg.src = item.imgSrc;
    }
  });
}

/* Slide Carousel Functionality */
let currentSlideIndex = 0;
let slideInterval = null;

function initSlider() {
  const wrapper = document.getElementById('sliderWrapper');
  const slides = document.querySelectorAll('.slide-item');
  const dotsContainer = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('slidePrevBtn');
  const nextBtn = document.getElementById('slideNextBtn');

  if (!wrapper || slides.length === 0) return;

  dotsContainer.innerHTML = '';
  slides.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    if (idx === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(idx));
    dotsContainer.appendChild(dot);
  });

  function goToSlide(index) {
    currentSlideIndex = (index + slides.length) % slides.length;
    wrapper.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === currentSlideIndex);
    });
  }

  function nextSlide() {
    goToSlide(currentSlideIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentSlideIndex - 1);
  }

  if (prevBtn) prevBtn.onclick = prevSlide;
  if (nextBtn) nextBtn.onclick = nextSlide;

  startAutoSlide();

  const container = document.querySelector('.slider-container');
  if (container) {
    container.onmouseenter = stopAutoSlide;
    container.onmouseleave = startAutoSlide;
  }

  function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(nextSlide, 5000);
  }

  function stopAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
  }
}

/* Format Switcher (Grid View is Default First) */
function initFormatSwitcher() {
  const slideToggleBtn = document.getElementById('viewToggleSlide');
  const gridToggleBtn = document.getElementById('viewToggleGrid');
  const slideView = document.getElementById('collectionsSlideView');
  const gridView = document.getElementById('collectionsGridView');

  if (!slideToggleBtn || !gridToggleBtn) return;

  slideToggleBtn.addEventListener('click', () => {
    slideToggleBtn.classList.add('active');
    gridToggleBtn.classList.remove('active');
    slideView.classList.add('active-view');
    gridView.classList.remove('active-view');
    showToast("Switched to Featured Carousel Slide View");
  });

  gridToggleBtn.addEventListener('click', () => {
    gridToggleBtn.classList.add('active');
    slideToggleBtn.classList.remove('active');
    gridView.classList.add('active-view');
    slideView.classList.remove('active-view');
    showToast("Switched to Gallery Grid View");
  });
}

/* Category Filters for Grid View */
function initGridFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');

      productCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterVal === 'all' || category === filterVal) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.5s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* File Upload & Drag & Drop System for Custom Orders */
let uploadedFilesList = [];

function initFileUpload() {
  const dropzone = document.getElementById('dropzoneContainer');
  const fileInput = document.getElementById('customFileInput');
  const previewContainer = document.getElementById('uploadedFilesPreview');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  ['dragleave', 'dragend'].forEach(type => {
    dropzone.addEventListener(type, () => {
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleFiles(e.target.files);
    }
  });

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        showToast(`File ${file.name} exceeds 15MB limit!`, 'error');
        return;
      }
      uploadedFilesList.push(file);
      renderFilePreview(file);
    });
    showToast(`Added ${files.length} file(s) for custom design request`);
  }

  function renderFilePreview(file) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-item-preview';

    const isImg = file.type.startsWith('image/');
    const imgUrl = isImg ? URL.createObjectURL(file) : '';

    const iconClass = isImg ? 'fa-file-image' : 'fa-file-pdf';
    const thumbHTML = isImg
      ? `<img src="${imgUrl}" class="file-thumbnail" alt="Preview"/>`
      : `<div class="benefit-icon"><i class="fas ${iconClass}"></i></div>`;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    fileDiv.innerHTML = `
      <div class="file-info-left">
        ${thumbHTML}
        <div>
          <div class="file-name-text">${file.name}</div>
          <div class="file-size-text">${sizeFormatted}</div>
        </div>
      </div>
      <button class="remove-file-btn" title="Remove File">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;

    const removeBtn = fileDiv.querySelector('.remove-file-btn');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uploadedFilesList = uploadedFilesList.filter(f => f !== file);
      fileDiv.remove();
      showToast(`Removed file ${file.name}`);
    });

    previewContainer.appendChild(fileDiv);
  }
}

/* Admin Asset Upload Studio Logic - Supports Batch Multi-File Upload */
let selectedBatchFiles = []; // [{ file, dataUrl, fileName }]

function initAdminAssetUploader() {
  const dropzone = document.getElementById('adminAssetDropzone');
  const fileInput = document.getElementById('adminAssetFileInput');
  const previewImg = document.getElementById('adminAssetPreview');
  const batchGrid = document.getElementById('batchPreviewGrid');
  const downloadContainer = document.getElementById('downloadHelperContainer');
  const form = document.getElementById('adminAssetForm');

  if (!dropzone || !fileInput || !form) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  ['dragleave', 'dragend'].forEach(type => {
    dropzone.addEventListener(type, () => dropzone.classList.remove('drag-over'));
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      processBatchFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      processBatchFiles(e.target.files);
    }
  });

  function processBatchFiles(filesList) {
    const validFiles = Array.from(filesList).filter(f => f.type.startsWith('image/'));
    if (!validFiles.length) {
      showToast('Please select valid image files!', 'error');
      return;
    }

    let loadedCount = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedBatchFiles.push({
          file: file,
          dataUrl: e.target.result,
          fileName: file.name
        });
        loadedCount++;
        if (loadedCount === validFiles.length) {
          renderBatchPreviewGrid();
          showToast(`Selected ${validFiles.length} image file(s)`);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function renderBatchPreviewGrid() {
    if (!batchGrid) return;
    batchGrid.innerHTML = '';

    if (!selectedBatchFiles.length) {
      batchGrid.style.display = 'none';
      if (previewImg) previewImg.style.display = 'none';
      return;
    }

    batchGrid.style.display = 'grid';
    if (previewImg) previewImg.style.display = 'none';

    selectedBatchFiles.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'batch-thumb-item';
      itemDiv.innerHTML = `
        <img src="${item.dataUrl}" alt="${item.fileName}" class="batch-thumb-img">
        <button type="button" class="batch-thumb-remove" title="Remove image">
          <i class="fas fa-times"></i>
        </button>
      `;

      const removeBtn = itemDiv.querySelector('.batch-thumb-remove');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedBatchFiles.splice(index, 1);
        renderBatchPreviewGrid();
        showToast(`Removed ${item.fileName}`);
      });

      batchGrid.appendChild(itemDiv);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedBatchFiles.length) {
      showToast('Please select or drop at least one image file!', 'error');
      return;
    }

    const title = document.getElementById('assetTitle').value;
    const category = document.getElementById('assetCategory').value;
    const categoryName = document.getElementById('assetCategory').options[document.getElementById('assetCategory').selectedIndex].text;
    const badge = document.getElementById('assetBadge').value || 'BRIDAL 2026';
    const price = document.getElementById('assetPrice').value || 'Custom Couture';
    const fabric = document.getElementById('assetFabric').value || 'Boutique Custom Fabric';
    const target = document.getElementById('assetTarget').value;
    const description = document.getElementById('assetDescription').value;

    let successCount = 0;

    for (let i = 0; i < selectedBatchFiles.length; i++) {
      const item = selectedBatchFiles[i];
      const itemTitle = selectedBatchFiles.length > 1 ? `${title} (${i + 1})` : title;

      const payload = {
        title: itemTitle,
        category,
        categoryName,
        badge,
        price,
        fabric,
        target,
        description,
        fileName: item.fileName || `custom_outfit_${i + 1}.jpg`,
        base64Data: item.dataUrl
      };

      let savedViaServer = false;
      try {
        const res = await fetch(`${SERVER_BASE_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          savedViaServer = true;
          successCount++;
        }
      } catch (err) {
        console.log('Server API connection error:', err);
      }

      if (!savedViaServer) {
        const newAsset = {
          id: 'asset_' + (Date.now() + i),
          title: itemTitle,
          category,
          categoryName,
          badge,
          price,
          fabric,
          target,
          description,
          imgSrc: item.dataUrl,
          fileName: item.fileName || `custom_outfit_${i + 1}.jpg`,
          timestamp: new Date().toLocaleDateString()
        };
        globalCustomAssets.unshift(newAsset);
        saveLocalAssetsBackup(globalCustomAssets);
        successCount++;
      }
    }

    if (successCount > 0) {
      await loadCustomAssets();
      showToast(`Successfully published ${successCount} image file(s) into assets/images/!`);
    }

    form.reset();
    selectedBatchFiles = [];
    renderBatchPreviewGrid();
    if (downloadContainer) downloadContainer.style.display = 'none';

    await renderAdminAssetsManager();
  });
}

/* Render & Manage ALL Image Files inside assets/images/ in Admin Dashboard */
async function renderAdminAssetsManager() {
  const grid = document.getElementById('assetsManagerGrid');
  const countEl = document.getElementById('customAssetsCount');

  if (!grid) return;

  const diskImages = await fetchAllDiskImages();
  const displayList = diskImages.length ? diskImages : globalCustomAssets;

  if (countEl) countEl.innerText = `${displayList.length} Files in assets/images/`;

  grid.innerHTML = '';

  if (!displayList || !displayList.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-gold);">
        <i class="fas fa-folder-open" style="font-size: 2.5rem; color: var(--accent-gold); margin-bottom: 1rem;"></i>
        <h4 style="font-family: var(--font-heading); font-size: 1.2rem;">No Image Assets Found in assets/images/</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Upload new outfit photos using the uploader above to save them into <code style="color: var(--accent-gold);">assets/images/</code>.</p>
      </div>
    `;
    return;
  }

  displayList.forEach(asset => {
    const card = document.createElement('div');
    card.className = 'asset-manage-card';

    const isLogoFile = asset.fileName === 'chameli_logo.jpg';
    const logoBadge = isLogoFile ? `<span style="background: var(--accent-gold); color: #000; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 700; margin-left: 6px;">Official Logo</span>` : '';
    const tagBadge = asset.badge ? `<span class="card-badge" style="position: static; margin-bottom: 6px; display: inline-block;">${asset.badge}</span>` : '';

    card.innerHTML = `
      <img src="${asset.imgSrc}" alt="${asset.title || asset.fileName}" class="asset-card-thumb">
      <div class="asset-card-body">
        ${tagBadge}
        <span class="asset-type-badge">${asset.categoryName || 'Image File'}</span> ${logoBadge}
        <h4 style="font-family: var(--font-heading); font-size: 1rem; margin: 6px 0 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${asset.fileName}">${asset.fileName || asset.title}</h4>
        <p style="color: var(--text-gold); font-size: 0.8rem; font-weight: 600;">${asset.price || asset.size || 'assets/images/'}</p>
        <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">Path: ./assets/images/${asset.fileName}</p>
        <div class="asset-actions-bar" style="flex-wrap: wrap; gap: 6px;">
          ${!isLogoFile ? `
          <button class="btn-danger delete-file-btn" data-filename="${asset.fileName}" data-id="${asset.id}" style="padding: 5px 10px; font-size: 0.75rem;">
            <i class="fas fa-trash-alt"></i> Delete File
          </button>
          ` : `
          <span style="font-size: 0.75rem; color: var(--accent-gold); font-weight: 600;">Protected Logo</span>
          `}
        </div>
      </div>
    `;

    // Instant Visual Delete Action on First Click
    const deleteBtn = card.querySelector('.delete-file-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to permanently delete "${asset.fileName}" from assets/images/?`)) {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.9)';
          card.style.transition = 'all 0.3s ease';
          setTimeout(() => card.remove(), 300);

          try {
            await fetch(`${SERVER_BASE_URL}/api/delete-file`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: asset.fileName, id: asset.id })
            });
          } catch (err) {}

          globalCustomAssets = globalCustomAssets.filter(a => a.fileName !== asset.fileName && a.id !== asset.id);
          allDiskImages = allDiskImages.filter(a => a.fileName !== asset.fileName && a.id !== asset.id);
          saveLocalAssetsBackup(globalCustomAssets);

          showToast(`Permanently deleted ${asset.fileName} from assets/images/!`);

          if (countEl) countEl.innerText = `${allDiskImages.length} Files in assets/images/`;
        }
      });
    }

    grid.appendChild(card);
  });
}

/* Theme Switcher & Storage */
function initThemeSwitcher() {
  const themeModal = document.getElementById('themeModal');
  const openThemeBtn = document.getElementById('openThemeBtn');
  const closeThemeBtn = document.getElementById('closeThemeBtn');
  const themeCards = document.querySelectorAll('.theme-card-option');

  if (!themeModal || !openThemeBtn) return;

  openThemeBtn.addEventListener('click', () => {
    themeModal.classList.add('active');
  });

  if (closeThemeBtn) {
    closeThemeBtn.addEventListener('click', () => {
      themeModal.classList.remove('active');
    });
  }

  themeModal.addEventListener('click', (e) => {
    if (e.target === themeModal) themeModal.classList.remove('active');
  });

  const savedTheme = localStorage.getItem('chameli_theme') || 'emerald';
  applyTheme(savedTheme);

  themeCards.forEach(card => {
    const themeName = card.getAttribute('data-theme-name');
    if (themeName === savedTheme) card.classList.add('selected');

    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      applyTheme(themeName);
      localStorage.setItem('chameli_theme', themeName);
      showToast(`Applied Theme: ${card.querySelector('span').innerText}`);
    });
  });

  function applyTheme(name) {
    if (name === 'emerald') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', name);
    }
  }
}

/* Official Logo Management Logic (Managed on admin-upload.html) */
function initLogoCustomizer() {
  const logoImgs = document.querySelectorAll('.logo-img');
  const savedLogo = localStorage.getItem('chameli_custom_logo');

  function applyLogo(src) {
    logoImgs.forEach(img => {
      img.src = src;
    });
  }

  if (savedLogo) {
    applyLogo(savedLogo);
  } else {
    applyLogo(`./assets/images/chameli_logo.jpg?v=${Date.now()}`);
  }

  const logoUploadInput = document.getElementById('logoUploadInput');
  const resetLogoBtn = document.getElementById('resetLogoBtn');
  const modalResetLogoBtn = document.getElementById('modalResetLogoBtn');

  if (logoUploadInput) {
    logoUploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file!', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        localStorage.setItem('chameli_custom_logo', base64Data);
        applyLogo(base64Data);

        try {
          await fetch(`${SERVER_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Official Boutique Logo',
              category: 'logo',
              categoryName: 'Official Logo',
              badge: 'Official Logo',
              price: 'System Logo',
              fabric: 'N/A',
              target: 'logo',
              description: 'Official Chameli Boutique Emblem Logo',
              fileName: 'chameli_logo.jpg',
              base64Data: base64Data
            })
          });
        } catch (err) {}

        showToast('Official Boutique Logo updated successfully!');
      };
      reader.readAsDataURL(file);
    });
  }

  function handleResetLogo() {
    localStorage.removeItem('chameli_custom_logo');
    const defaultSrc = `./assets/images/chameli_logo.jpg?v=${Date.now()}`;
    applyLogo(defaultSrc);
    showToast('Reset to default official peacock logo!');
  }

  if (resetLogoBtn) resetLogoBtn.addEventListener('click', handleResetLogo);
  if (modalResetLogoBtn) modalResetLogoBtn.addEventListener('click', handleResetLogo);
}

/* Royal Peacock Welcome Loader Screen Animation */
function initPeacockWelcomeLoader() {
  const loader = document.getElementById('peacockLoader');
  const skipBtn = document.getElementById('skipIntroBtn');

  if (!loader) return;

  function dismissLoader() {
    loader.classList.add('fade-out');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 800);
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', dismissLoader);
  }

  // Auto dismiss after 2.4 seconds
  setTimeout(dismissLoader, 2400);
}

/* Quick View Modal for Products */
function initQuickViewModal() {
  const modal = document.getElementById('quickViewModal');
  const closeModal = document.getElementById('closeQuickViewBtn');

  if (!modal) return;

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-product-btn');
    if (!btn) return;
    e.stopPropagation();
    const card = btn.closest('.product-card') || btn.closest('.slide-item');
    if (!card) return;

    const titleEl = card.querySelector('.card-title, .slide-title');
    const categoryEl = card.querySelector('.card-category, .slide-category');
    const priceEl = card.querySelector('.card-price');
    const imgEl = card.querySelector('.card-img, .slide-img');

    if (titleEl) document.getElementById('modalProductTitle').innerText = titleEl.innerText;
    if (categoryEl) document.getElementById('modalProductCategory').innerText = categoryEl.innerText;
    if (priceEl) document.getElementById('modalProductPrice').innerText = priceEl.innerText;
    if (imgEl) document.getElementById('modalProductImg').src = imgEl.src;

    modal.classList.add('active');
  });

  if (closeModal) {
    closeModal.addEventListener('click', () => modal.classList.remove('active'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

/* Custom Couture Form Submission & WhatsApp Order Generator */
function initFormCalculators() {
  const form = document.getElementById('customDesignForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const outfitType = document.getElementById('custOutfitType').value;
    const fabric = document.getElementById('custFabric').value;
    const notes = document.getElementById('custNotes').value;

    const fileCount = uploadedFilesList.length;

    const message = `Hello Chameli Designer Boutique (Kizhakkambalam)!%0A%0AI would like to submit a Custom Design Inquiry:%0A- *Name*: ${name}%0A- *Phone*: ${phone}%0A- *Outfit Type*: ${outfitType}%0A- *Fabric Preference*: ${fabric}%0A- *Reference Files Attached*: ${fileCount} file(s)%0A- *Notes/Measurements*: ${notes}`;
    
    const whatsappUrl = `https://wa.me/919876543210?text=${message}`;
    
    showToast(`Inquiry Created! Opening WhatsApp for Chameli Designer Team...`);

    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 1200);
  });
}

/* Global Toast Notification System */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-sparkles' : 'fa-exclamation-circle'}" style="color: var(--accent-gold);"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
