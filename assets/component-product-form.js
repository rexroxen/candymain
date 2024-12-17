/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/* eslint-disable */
class ProductForm extends HTMLElement {
  constructor() {
    super();

    this.cacheDOMElements();
    /* ===== Bind the event handlers in order to maintain the correct context of 'this' ===== */
    this.onSubmitBound = this.onSubmit.bind(this);
    /* ===== Remove the noscript elements from the DOM (javascript is enabled) ===== */
    Array.from(this.noscriptElements).forEach(element => element.remove());
  }

  cacheDOMElements() {
    /* ===== Cache the DOM elements ===== */
    this.form = this.querySelector('form');
    this.noscriptElements = this.querySelectorAll('noscript');
    this.sectionId = this.getAttribute('data-section-id');
    this.productInformation = this.closest('product-information');
    this.cartAction = document.getElementById('PageContainer').dataset.cartAction;
    this.cartType = document.getElementById('PageContainer').dataset.cartType;
    this.cartCountIndicator = document.querySelector('[data-cart-count-indicator]');
    this.giftWrapProductId = this.getAttribute('data-gift-wrap-product-id');
    this.wethemeGlobal = document.querySelector('script#wetheme-global');
    this.translationsObject = JSON.parse(this.wethemeGlobal.textContent);
    this.qtyErrorMessage = this.querySelector('[data-qty-error-message]');
  }

  connectedCallback() {
    /* ===== Set the initial state of the add to cart button ===== */
    if (!this.form) return;
    this.attachEventListeners();
  }

  attachEventListeners() {
    /* ===== Attach the event listeners to the DOM elements ===== */
    this.form.addEventListener('submit', this.onSubmitBound);
  }

  onSubmit(event) {
    /* ===== Handle the form submission ===== */
    event.preventDefault();
    this.prepareForSubmission();
  }

  prepareForSubmission() {
    /* ===== Prepare the form for submission ===== */
    this.cacheSubmissionElements();
    if (!this.checkRequiredInputs()) return;
    // If the form is valid, proceed with the submission
    this.showLoadingState();
    this.appendPropertiesAsHiddenInputs();
    this.addItemsToCart();
  }

  cacheSubmissionElements() {
    /* ===== Cache the elements needed for form submission ===== */
    this.loadingIcon = this.form.querySelector('[data-loading-icon]');
    this.addToCartText = this.form.querySelector('[data-add-to-cart-text]');
    this.addedText = this.form.querySelector('[data-cart-added-text]');
    this.quantityInput = this.form.querySelector('[name="quantity"]');
    this.quantity = this.quantityInput ? parseInt(this.quantityInput.value, 10) || 1 : 1;
  }

  fetchConfig(type = 'json') {
    /* ===== Create the fetch configuration object ===== */
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
    };
  }

  checkRequiredInputs() {
    /* ===== Check if the required inputs have been filled out ===== */
    const requiredInputs = Array.from(this.form.querySelectorAll('[required]:not(:disabled)'));
    this.clearErrorMessages();
    const invalidInputs = requiredInputs.filter(input => !input.value.trim());
    invalidInputs.forEach(input => this.applyErrorMessage(input));
    return invalidInputs.length === 0;
  }

  clearErrorMessages() {
    /* ===== Clear the error messages from the form ===== */
    this.form.querySelectorAll('.required-field-error').forEach(error => error.remove());
  }

  applyErrorMessage(input) {
    /* ===== Apply the error message to the input element if the required input is empty ===== */
    const errorMessage = this.translationsObject.translations.required_input_error;
    const errorElement = `<span class="required-field-error" style="color:var(--error-color);">${errorMessage}</span>`;
    input.insertAdjacentHTML('afterend', errorElement);
    if (!input.classList.contains('input-error')) {
      input.classList.add('input-error');
      input.focus();
    }
  }

  appendPropertiesAsHiddenInputs() {
    /* ===== Append the custom properties as hidden inputs to the form ===== */
    if (!this.productInformation) return;
    this.removeAllDynamicHiddenInputs();
    this.addPropertyInputs();
    this.disableEmptyInputs();
  }

  disableEmptyInputs() {
    /* ===== Disable the empty inputs before submitting the form ===== */
    this.form.querySelectorAll('input, textarea').forEach(input => {
      if (!input.value) input.disabled = true;
    });
  }

  removeAllDynamicHiddenInputs() {
    /* ===== Remove all the hidden inputs from the form ===== */
    this.form.querySelectorAll('.dynamic-hidden-input').forEach(input => input.remove());
  }

  addPropertyInputs() {
    /* ===== Add the custom properties as hidden inputs to the form ===== */
    const propertyElements = this.productInformation.querySelectorAll('[data-custom-property][name^="properties["]');
    propertyElements.forEach(element => this.constructHiddenInput(element));
  }

  constructHiddenInput(element) {
    /* ===== Construct the hidden input element and append it to the form ===== */
    // This allows us to pass the custom properties to the cart
    if (this.shouldElementBeIgnored(element)) return;

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = element.name;
    hiddenInput.value = element.value;
    hiddenInput.classList.add('dynamic-hidden-input');

    this.form.appendChild(hiddenInput);
  }

  shouldElementBeIgnored(element) {
    /* ===== Determine if the element should be ignored when appending as a hidden input ===== */
    return element.type === 'file' ? this.handleFileInput(element) :
      ((element.type === 'checkbox' || element.type === 'radio') && !element.checked) ||
      (element.type !== 'checkbox' && element.type !== 'radio' && !element.value);
  }

  handleFileInput(element) {
    /* ===== Handle the file input element when appending as a hidden input ===== */
    element.style.display = 'none';
    this.form.appendChild(element);
    return true;
  }

  giftWrapEnabled() {
    /* ===== Determine if the gift wrap product is enabled ===== */
    return !!this.form.querySelector('[name="properties[Gift wrap]"]') && this.giftWrapProductId !== '';
  }

  async addItemsToCart() {
    /* ===== Add the item(s) to the cart ===== */
    try {
      // Add the main product to the cart
      const mainProductAdded = await this.addProductToCart(routes.cart_add_url, this.fetchConfigWithBody());
      if (mainProductAdded && this.giftWrapEnabled()) {
        // Add the gift wrap product to the cart
        await this.addProductToCart(routes.cart_add_url, this.additionalProductConfig(this.giftWrapProductId, this.quantity));
      }
      // Process the response
      this.processResponse(mainProductAdded);
    } catch (error) {
      console.error(`Error adding item(s) to cart: ${error.description || error.message}`);
    }
  }

  async addProductToCart(url, config) {
    /* ===== Add the product to the cart ===== */
    const response = await fetch(url, config);
    if (!response.ok) {
      console.error(`Error adding item to cart: ${response.description || response.statusText}`);
    }
    return response;
  }

  additionalProductConfig(productId, quantity) {
    /* ===== Create the configuration object for the additional product(s) to be added to the cart ===== */
    const additionalItemPayload = { items: [{ id: productId, quantity: quantity }] };
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(additionalItemPayload)
    };
  }

  async getCart() {
    /* ===== Fetch the cart information ===== */
    try {
      const response = await fetch(`${routes.cart_url}?view=compare`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching cart: ${error.description || error.message}`);
    }
  }

  updateCartCountIndicator() {
    /* ===== Update the cart count indicator ===== */
    if (!this.cartCountIndicator) return;
    this.getCart().then(cart => this.cartCountIndicator.textContent = cart.item_count);
    if (this.cartCountIndicator.classList.contains('hide')) this.cartCountIndicator.classList.remove('hide');
  }

  fetchConfigWithBody() {
    /* ===== Create the fetch configuration object with the form data as the body ===== */
    const config = this.fetchConfig('javascript');
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type'];
    config.body = new FormData(this.form);
    return config;
  }

  processResponse(response) {
    /* ===== Process the response from the server ===== */
    if (response.ok) {
      this.hideLoadingState();
    }

    // Handle the case where the product is out of stock
    if (response.status === 422) {
      this.hideLoadingState();
      if (this.qtyErrorMessage) this.qtyErrorMessage.classList.remove('hidden');
    }

    // Emit the cart:added event
    eventBus.emit('cart:added', { sectionId: this.sectionId });
  }

  toggleCartDrawer() {
    /* ===== Toggle the cart drawer open or closed ===== */
    this.getCart().then(cart => {
      eventBus.emit('toggle:right:drawer', { type: 'cart', forceOpen: true, params: { cart } });
    }).catch(error => {
      console.error(`Error fetching cart: ${error}`);
    });
  }

  showLoadingState() {
    /* ===== Show the loading state of the add to cart button ===== */
    this.toggleElements(this.addToCartText, false);
    this.toggleElements(this.loadingIcon, true, 'hidden');
    this.toggleAddButton(true);
  }

  hideLoadingState() {
    /* ===== Hide the loading state of the add to cart button ===== */
    this.toggleElements(this.loadingIcon, false, 'hidden');
    this.toggleCartActionDisplay();
  }

  toggleCartActionDisplay() {
    /* ===== Toggle the cart action display based on the selected action ===== */
    if (this.cartAction === 'show_added_message' && this.addedText) {
      // Show the added text message and update the cart count indicator
      this.addedText.style.display = 'block';
      setTimeout(() => {
        this.toggleAddToCartText(true);
        this.toggleAddButton(false); 
        this.updateCartCountIndicator();
      }, 2000);
    } else if (this.cartType === 'drawer' && this.cartAction === 'go_to_or_open_cart') {
      // Open the cart drawer 
      this.toggleAddToCartText(true);
      this.toggleCartDrawer();
      this.toggleAddButton(false);
    } else {
      // Redirect to the cart page
      this.toggleAddToCartText(true);
      this.toggleAddButton(false);
      window.location = window.routes.cart_url;
    }
  }

  toggleAddToCartText(show) {
    /* ===== Toggle the add to cart text and the added text message ===== */
    // Show the added text message and hide the add to cart text
    if (this.addedText) this.addedText.style.display = show ? 'none' : 'block';
    // Show the add to cart text and hide the added text message
    if (this.addToCartText) this.addToCartText.style.display = show ? 'block' : 'none';
  }

  toggleElements(element, show, className) {
    /* ===== Toggle the display of the element based on the show value ===== */
    if (!element) return;
    if (className) {
      show ? element.classList.remove(className) : element.classList.add(className);
    } else {
      element.style.display = show ? 'block' : 'none';
    }
  }

  toggleAddButton(disable = true) {
    /* ===== Toggle the state of the add to cart button ===== */
    const addButton = this.querySelector('[name="add"]');
    if (!addButton) return;

    addButton.disabled = disable;
  }

  disconnectedCallback() {
    /* ===== Remove the event listeners when the element is removed from the DOM ===== */
    this.form.removeEventListener('submit', this.onSubmitBound);
  }
}

if (!customElements.get('product-form')) {
  customElements.define('product-form', ProductForm);
}

/******/ })()
;