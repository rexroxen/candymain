/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/* eslint-disable */
if (!customElements.get('product-information')) {
  customElements.define('product-information', class ProductInformation extends HTMLElement {
    constructor() {
      super();
      this.dataCache = new Map(); // Cache for pre-fetched data
      this.init();
    }

    init() {
      this.cacheDOMElements();
      this.bindEventHandlers();
    }

    cacheDOMElements() {
      /* ===== Cache any information that we'll need later ===== */
      this.sectionId = this.getAttribute('data-section-id');
      this.sectionFetchId = this.getAttribute('data-section-fetch-id');
      this.isQuickView = this.dataset.quickView === 'true';
      this.productForm = this.querySelector('product-form');
      this.productUrl = this.dataset.url;
      this.elementsToUpdate = this.querySelectorAll(`[data-updates-on-change="true"]`);
      this.formQuantityInput = this.productForm?.querySelector('[name="quantity"]');
      this.stickyContainer = this.classList.contains('product-sticky') ? this : null;
      this.stickyHeader = document.querySelector('.header-section');
      this.enableURLUpdate = this.dataset.enableUrlUpdate === 'true';
      this.variantCount = this.getVariantData().length;
      this.qtyErrorMessage = this.productForm?.querySelector('[data-qty-error-message]');
      this.isFeaturedProduct = this.dataset.isFeaturedProduct === 'true';
    }

    connectedCallback() {
      /* ===== Gather options for the current variant, handle sticky form offset, attach event listeners ===== */
      this.updateOptions();
      this.setStickyOffset();
      this.attachEventListeners();
    }

    disconnectedCallback() {
      /* ===== Clean up event listeners ===== */
      this.removeEventListeners();
    }

    bindEventHandlers() {
      /* ===== Bind methods to maintain the 'this' context ===== */
      this.resizeHandler = this.handleResize.bind(this);
      this.onQuantityChange = this.handleQuantityChange.bind(this);
      this.onVariantChange = this.handleVariantChange.bind(this);
    }

    attachEventListeners() {
      // If there's a mouseover or touchstart we'll pre-fetch all variant data
      // This allows us to cache the data for quick updates when the variant changes
      this.addEventListener('mouseover', this.preFetchAllVariantData.bind(this), { once: true });
      this.addEventListener('touchstart', this.preFetchAllVariantData.bind(this), { once: true });
      // On resize we need to update the sticky form offset
      window.addEventListener('resize', this.resizeHandler);
      // Listen for quantity changes
      eventBus.on('qty:change', this.onQuantityChange);
      // Listen for variant changes
      eventBus.on('variant:change', this.onVariantChange);
    }

    removeEventListeners() {
      /* ===== Remove any event listeners we've attached ===== */
      window.removeEventListener('resize', this.resizeHandler);
      eventBus.off('qty:change', this.onQuantityChange);
      eventBus.off('variant:change', this.onVariantChange);
    }

    preFetchAllVariantData() {
      /* ===== Fetch the data for each variant and cache it ===== */
      if (this.variantCount <= 1 || (this.isFeaturedProduct && window.Shopify.designMode)) return;
      const variants = this.getVariantData(); // Retrieve all variants
      variants.forEach((variant) => {
        const fetchUrl = `${this.productUrl}?section_id=${this.sectionFetchId}&variant=${variant.id}`;
        if (!this.dataCache.has(fetchUrl)) {
          fetch(fetchUrl)
            .then((response) => response.text())
            .then((data) => {
              this.dataCache.set(fetchUrl, data); // Cache the fetched data
            })
            .catch((error) => {
              console.error('Error pre-fetching data for variant:', error);
            });
        }
      });
    }

    handleResize() {
      /* ===== Handle resizing of the window ===== */
      if (window.Shopify.designMode) {
        // If we're in the theme editor we need to update the sticky form offset
        // We only do this in the editor because it's not necessary in the live site
        // because mobile devices can incorrectly trigger resize events when scrolling
        this.setStickyOffset();
      }
    }

    handleQuantityChange(event) {
      /* ===== Handle changes to the quantity input ===== */
      // Clear any quantity error messages
      this.clearErrors();

      // Update the quantity input value
      if (this.formQuantityInput && event.value) {
        if (event.sectionId && event.sectionId !== this.sectionId) return;
        this.formQuantityInput.value = event.value;
      }
    }

    setStickyOffset() {
      if (this.stickyContainer && this.stickyHeader) {
        // Set the top offset of the sticky form to the height of the sticky header
        this.stickyContainer.style.top = `${this.stickyHeader.offsetHeight}px`;
      }
    }

    updateOptions() {
      /* ===== Gather the current options for the variant ===== */
      this.options = Array.from(
        this.querySelectorAll('variant-dropdown, product-swatch')
      ).map((element) => {
        if (element.tagName === 'VARIANT-DROPDOWN') {
          const dropdownList = element.querySelector('[data-dropdown-list]');
          return dropdownList?.querySelector('[data-dropdown-option].selected')?.getAttribute('data-option-value');
        } else if (element.tagName === 'PRODUCT-SWATCH') {
          return element.querySelector('input:checked')?.value;
        }
      }).filter(Boolean); // Filter out falsy values
    }

    async handleVariantChange(context) {
      /* ===== Handle changes to the variant ===== */
      if (this.variantCount <= 1 || (context.sectionId && context.sectionId !== this.sectionId)) return;

      // Clear any quantity error messages
      this.clearErrors();

      // Update the current variant based on the selected options
      this.updateOptions();
      context.variant ? this.currentVariant = context.variant : this.getCurrentVariant();

      // If we don't have a valid variant, handle it and return
      if (!this.currentVariant) {
        this.handleInvalidVariant();
        return;
      }

      // If the variant is available, update the UI
      this.toggleAddButton(this.currentVariant.available);
      const fetchUrl = `${this.productUrl}?section_id=${this.sectionFetchId}&variant=${this.currentVariant.id}`;
      const isCached = this.dataCache.has(fetchUrl);

      if (isCached && (!this.isFeaturedProduct && !window.Shopify.designMode)) {
        // If the data is cached, update the UI with the cached data
        this.updateFromCache(fetchUrl, context);
      } else {
        // If the data isn't cached, fetch the data and update the UI
        await this.fetchAndUpdate(fetchUrl, context);
      }
    }

    handleInvalidVariant() {
      /* ===== Handle an invalid variant ===== */
      // If the variant is invalid, disable the add to cart button
      this.toggleAddButton(false);
      // If the variant is invalid, set the add to cart button text to "unavailable"
      const addButton = this.productForm?.querySelector('[name="add"]');
      if (!addButton) return;
      const addButtonSpan = addButton.querySelector('[data-add-to-cart-text]');
      if (!addButtonSpan) return;

      addButtonSpan.textContent = addButtonSpan.getAttribute('data-unavailable-text');

      // If the variant is invalid, set the price to "Unavailable"
      const priceElement = this.querySelector('[data-product-price]');
      if (!priceElement) return;
      const priceElementSpan = priceElement.querySelector('span[data-price-text]');
      if (!priceElementSpan) return;

      priceElementSpan.textContent = priceElementSpan.getAttribute('data-unavailable-text');
    }

    async fetchAndUpdate(fetchUrl, context) {
      /* ===== Fetch the data for the variant and update the UI ===== */
      if (!fetchUrl || !this.sectionId) return;

      try {
        // If we're updating the URL, update it now
        this.updateOptions();
        if (this.enableURLUpdate) this.updateURL();

        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const responseText = await response.text();
        // Update the UI with the fetched data
        this.updateDOMWithFetchedData(responseText, context);
        // Cache the fetched data
        this.dataCache.set(fetchUrl, responseText);
      } catch (error) {
        console.error("Failed to update product information:", error);
      }
    }

    updateFromCache(fetchUrl, context) {
      /* ===== Update the UI with the cached data ===== */
      if (this.enableURLUpdate) this.updateURL();

      const cachedData = this.dataCache.get(fetchUrl);
      this.updateDOMWithFetchedData(cachedData, context);
    }

    updateDOMWithFetchedData(data, context) {
      const html = this.parseHTML(data);
      if (this.isQuickView) {
        // If this is a quick view, we need to extract the quick view content
        const quickViewContent = html.querySelector('template[data-quick-view-product]')?.content;
        this.updateDOM(quickViewContent, context);
      } else {
        // If this is not a quick view, we can update the entire product information section
        this.updateDOM(html, context);
      }
    }

    parseHTML(data) {
      /* ===== Parse the fetched data into a DOM object ===== */
      return new DOMParser().parseFromString(data, 'text/html');
    }

    updateDOM(html, context = {}) {
      /* ===== Update the DOM with the fetched data ===== */
      this.replaceElements(html, context);
      // Reset the quantity input value
      if (this.formQuantityInput) {
        this.formQuantityInput.value = 1;
      }

      if (context.fromSlideChange) return;

      // Emit an event to let other components know the variant was updated
      eventBus.emit('variant:updated', {
        variant: this.currentVariant,
        sectionId: this.sectionId,
      });
    }

    toggleAddButton(enable) {
      /* ===== Toggle the add to cart button based on the variant availability ===== */
      const addButton = this.productForm?.querySelector('[name="add"]');
      if (addButton) {
        addButton.toggleAttribute('disabled', !enable);
      }
    }

    updateURL() {
      /* ===== Update the URL with the current variant ID ===== */
      if (this.currentVariant) {
        window.history.replaceState({}, '', `${this.productUrl}?variant=${this.currentVariant.id}`);
      }
    }

    replaceElements(html, context = {}) {
      /* ===== Replace elements in the DOM with new elements ===== */
      if (!html || !this.elementsToUpdate.length) return;

      const newSection = html.querySelector(`product-information[data-section-id="${this.sectionId}"][data-url="${this.productUrl}"]`);
      if (!newSection) return;

      this.elementsToUpdate.forEach((updateBlock) => {
        // Replace each block in the current section with the corresponding block in the new section
        const blockId = updateBlock.getAttribute('data-block-id');
        const currentBlock = this.querySelector(`[data-block-id="${blockId}"]`);
        const newBlock = newSection.querySelector(`[data-block-id="${blockId}"]`);
        if (!blockId || !currentBlock || !newBlock) return;

        currentBlock.querySelectorAll('[data-update-item]').forEach((item) => {
          // Replace each item in the current block with the corresponding item in the new block
          const itemId = item.getAttribute('data-update-item');
          const newItem = newBlock.querySelector(`[data-update-item="${itemId}"]`);
          if (!itemId || !newItem) return;
          item.replaceWith(newItem);
        });
      });
    }

    clearErrors() {
      /* ===== Clear any errors in the product form ===== */
      if (this.qtyErrorMessage) this.qtyErrorMessage.classList.add('hidden');
    }

    getCurrentVariant() {
      /* ===== Get the current variant based on the selected options ===== */
      const variants = this.getVariantData();
      this.currentVariant = variants.find(
        (variant) => variant.options.every((option, index) => option === this.options[index])
      ) || null;
    }

    getVariantData() {
      /* ===== Get the variant data for the product ===== */
      if (!this.variantData) {
        const variantContent = this.querySelector('script[type="application/json"]');
        this.variantData = variantContent ? JSON.parse(variantContent.textContent) : {};
      }
      return this.variantData;
    }
  });
}
/******/ })()
;