/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/* eslint-disable no-undef */
class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    /* ===== Cache the DOM elements and set the initial state of the component ===== */
    this.sectionId = this.getAttribute('data-section-id');
    this.activeMediaClass = this.getAttribute('data-active-media-class');
    this.mediaPlayButton = this.querySelector('[data-media-play-button]');
    this.mediaId = this.getAttribute('data-media-id');
    this.bindEventHandlers();
  }

  connectedCallback() {
    /* ===== Verify the initial setup and register the event listeners ===== */
    this.verifyInitialSetup();
    this.registerEventListeners();
  }

  verifyInitialSetup() {
    /* ===== Verify the initial setup of the component ===== */
    if (!this.mediaPlayButton) {
      // Log an error if the play button is not found
      console.error('DeferredMedia: Play button not found!');
    }
    if (!this.mediaId) {
      // Log an error if the media ID is not found
      console.error('DeferredMedia: Media ID not found!');
    }
  }

  bindEventHandlers() {
    /* ===== Bind the event handlers in order to maintain the correct context of 'this' ===== */
    this.handleMediaClick = this.handleMediaClick.bind(this);
    this.handleMediaLoad = this.handleMediaLoad.bind(this);
    this.pauseAllMedia = this.pauseAllMedia.bind(this);
  }

  registerEventListeners() {
    /* ===== Attach the event listeners to the DOM elements ===== */
    eventBus.on('load:media', this.handleMediaLoad);
    eventBus.on('pause:media', this.pauseAllMedia);
    if (this.mediaPlayButton) {
      this.mediaPlayButton.addEventListener('click', this.handleMediaClick);
    }
  }

  handleMediaLoad(event) {
    /* ===== Handle the load:media event and load the media if the media ID matches ===== */
    if (event.mediaId === this.mediaId && event.sectionId === this.sectionId) {
      this.loadMedia();
    }
  }

  handleMediaClick() {
    /* ===== Handle the click event on the media play button ===== */
    this.loadMedia();
  }

  loadMedia() {
    /* ===== Load the media element and post-process it ===== */
    if (!this.mediaId || this.getAttribute('data-media-loaded')) return;
    this.pauseAllMedia();
    const template = this.querySelector('template');
    const mediaElement = template?.content?.querySelector('[data-media-wrapper]');
    if (!mediaElement) return;

    // Clone the media element and append it to the component
    const media = mediaElement.cloneNode(true);
    this.innerHTML = '';
    this.appendChild(media);
    this.setAttribute('data-media-loaded', true);
    media.classList.add(this.activeMediaClass);

    // Post-process the media element
    this.postProcessMedia(media);
  }

  postProcessMedia(media) {
    /* ===== Post-process the media element and load specific features based on the media type ===== */
    const mediaEl = media.querySelector('video, iframe, model-viewer');
    if (mediaEl) {
      mediaEl.style.pointerEvents = 'auto';
      this.loadSpecificMediaFeatures(mediaEl);
    }
  }

  loadSpecificMediaFeatures(mediaEl) {
    /* ===== Load specific features based on the media type ===== */
    if (mediaEl.tagName === 'MODEL-VIEWER') {
      // Load the model-viewer features if the media is a model-viewer element
      this.loadModelFeatures(mediaEl);
    } else if (mediaEl.tagName === 'VIDEO' && mediaEl.getAttribute('autoplay')) {
      // Play the video if the video element has the autoplay attribute
      mediaEl.play().catch(error => console.error('Error playing video:', error));
    }
  }

  loadModelFeatures(modelViewerElement) {
    /* ===== Load the model-viewer features and initialize the Shopify XR ===== */
    Shopify.loadFeatures([
      {
        name: 'model-viewer-ui',
        version: '1.0',
        onLoad: (errors) => {
          if (errors) return;
          const modelViewerUI = new Shopify.ModelViewerUI(modelViewerElement);
          modelViewerElement.modelViewerUI = modelViewerUI;
  
          // Add event listeners to disable/enable swiping on the main swiper
          this.addModelInteractionListeners(modelViewerElement);
  
          // Initialize XR when the first model is loaded
          this.initializeShopifyXR();
        },
      }
    ]);
  }

  addModelInteractionListeners(modelViewerElement) {
    /* ===== Add event listeners to disable/enable swiping on the main swiper ===== */
    const events = ['mousedown', 'mouseup', 'touchstart', 'touchend'];
    const actionMap = {
      'mousedown': 'disable-swiping',
      'mouseup': 'enable-swiping',
      'touchstart': 'disable-swiping',
      'touchend': 'enable-swiping'
    };
  
    events.forEach(event => {
      modelViewerElement.addEventListener(event, () => {
        eventBus.emit(actionMap[event], { sectionId: this.sectionId });
      });
    });
  }

  initializeShopifyXR() {
    /* ===== Initialize the Shopify XR and setup the XR elements ===== */
    Shopify.loadFeatures([
      {
        name: 'shopify-xr',
        version: '1.0',
        onLoad: (errors) => {
          if (errors) return;
          document.addEventListener('shopify_xr_initialized', () => this.setupShopifyXR());
        },
      }
    ]);
  }

  setupShopifyXR() {
    /* ===== Setup the Shopify XR elements and add the models to the XR viewer ===== */
    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.ShopifyXR.setupXRElements();
  }

  pauseAllMedia() {
    /* ===== Pause all media elements on the page ===== */
    const allMedia = document.querySelectorAll('.js-youtube, .js-vimeo, video, model-viewer');
    allMedia.forEach(media => {
      if (media.tagName === 'IFRAME') {
        // Post a message to the media element to pause the video
        const origin = media.src.includes("youtube") ? 'https://www.youtube.com' : 'https://player.vimeo.com';
        media.contentWindow.postMessage(this.messageFn('pause', media.src), origin);
      } else if (media.tagName === 'VIDEO') {
        // Pause the video element
        media.pause();
      } else if (media.tagName === 'MODEL-VIEWER' && media.modelViewerUI) {
        // Pause the model-viewer element
        media.modelViewerUI.pause();
      }
    });
  }

  messageFn(action, src) {
    /* ===== Create a message function to pause/play the media elements ===== */
    if (src.includes("youtube")) {
      return JSON.stringify({ event: "command", func: action === "play" ? "playVideo" : "pauseVideo", args: [] });
    } else if (src.includes("vimeo")) {
      return JSON.stringify({ method: action });
    }
  }

  disconnectedCallback() {
    /* ===== Remove the event listeners when the element is removed from the DOM ===== */
    if (this.mediaPlayButton) {
      this.mediaPlayButton.removeEventListener('click', this.handleMediaClick);
    }
    eventBus.off('load:media', this.handleMediaLoad);
    eventBus.off('pause:media', this.pauseAllMedia);
  }
}

if (!customElements.get('deferred-media')) {
  customElements.define('deferred-media', DeferredMedia);
}

/******/ })()
;