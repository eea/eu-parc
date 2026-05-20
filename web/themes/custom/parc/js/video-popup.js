((Drupal, once) => {
  const POPUP_ID = 'video-popup';

  function buildPopup() {
    const popup = document.createElement('div');
    popup.id = POPUP_ID;
    popup.className = 'video-popup video-popup--hidden';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', Drupal.t('Video player'));

    popup.innerHTML = `
      <div class="video-popup__overlay"></div>
      <button class="video-popup__close" type="button" aria-label="${Drupal.t('Close')}">&#215;</button>
      <button class="video-popup__prev video-popup__prev--hidden" type="button" aria-label="${Drupal.t('Previous video')}">&#8249;</button>
      <button class="video-popup__next video-popup__next--hidden" type="button" aria-label="${Drupal.t('Next video')}">&#8250;</button>
      <div class="video-popup__inner">
        <div class="video-popup__body">
          <div class="video-popup__video"></div>
          <div class="video-popup__info-type"></div>
          <p class="video-popup__info-title"></p>
          <div class="video-popup__info-body"></div>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('.video-popup__overlay').addEventListener('click', closePopup);
    popup.querySelector('.video-popup__close').addEventListener('click', closePopup);
    popup.querySelector('.video-popup__prev').addEventListener('click', () => navigate(-1));
    popup.querySelector('.video-popup__next').addEventListener('click', () => navigate(1));

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') closePopup();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    return popup;
  }

  function getPopup() {
    return document.getElementById(POPUP_ID) || buildPopup();
  }

  function isOpen() {
    return !getPopup().classList.contains('video-popup--hidden');
  }

  let currentIndex = 0;
  let currentTeasers = [];

  // Collect unique teasers by nid to avoid duplicates from carousel loop cloning.
  function getUniqueTeasers() {
    const seen = new Set();
    const result = [];
    document.querySelectorAll('.node--video-teaser').forEach((el) => {
      const nid = el.dataset.nid;
      if (nid && !seen.has(nid)) {
        seen.add(nid);
        result.push(el);
      }
    });
    return result;
  }

  function openPopup(teaser) {
    currentTeasers = getUniqueTeasers();
    const nid = teaser.dataset.nid;
    // Find the canonical (first) teaser for this nid.
    currentIndex = currentTeasers.findIndex((t) => t.dataset.nid === nid);
    if (currentIndex === -1) currentIndex = 0;

    renderSlide(currentIndex);

    const popup = getPopup();
    popup.classList.remove('video-popup--hidden');
    document.body.classList.add('video-popup-open');
    popup.querySelector('.video-popup__close').focus();
  }

  function closePopup() {
    const popup = getPopup();
    popup.classList.add('video-popup--hidden');
    document.body.classList.remove('video-popup-open');
    // Clear video to stop playback.
    popup.querySelector('.video-popup__video').innerHTML = '';
  }

  function navigate(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= currentTeasers.length) return;
    currentIndex = newIndex;
    renderSlide(currentIndex);
  }

  function renderSlide(index) {
    const popup = getPopup();
    const teaser = currentTeasers[index];
    if (!teaser) return;

    const data = teaser.querySelector('.video-teaser__popup-data');

    const videoEl = popup.querySelector('.video-popup__video');
    const videoSrc = data ? data.querySelector('.video-teaser__popup-video') : null;
    videoEl.innerHTML = videoSrc ? videoSrc.innerHTML : '';
    Drupal.attachBehaviors(videoEl);

    const typeEl = popup.querySelector('.video-popup__info-type');
    const typeSrc = data ? data.querySelector('.video-teaser__popup-type') : null;
    typeEl.textContent = typeSrc ? typeSrc.textContent.trim() : '';

    const titleEl = popup.querySelector('.video-popup__info-title');
    const titleSrc = data ? data.querySelector('.video-teaser__popup-title') : null;
    titleEl.textContent = titleSrc ? titleSrc.textContent.trim() : '';

    const bodyEl = popup.querySelector('.video-popup__info-body');
    const bodySrc = data ? data.querySelector('.video-teaser__popup-body') : null;
    bodyEl.innerHTML = bodySrc ? bodySrc.innerHTML : '';

    popup.querySelector('.video-popup__prev').classList.toggle('video-popup__prev--hidden', index <= 0);
    popup.querySelector('.video-popup__next').classList.toggle('video-popup__next--hidden', index >= currentTeasers.length - 1);

    popup.scrollTop = 0;
  }

  Drupal.behaviors.parcVideoPopup = {
    attach(context) {
      // Use event delegation on document so Swiper loop clones are also covered.
      once('video-popup-delegate', 'body', context).forEach(() => {
        document.addEventListener('click', (e) => {
          // Ignore clicks inside the popup itself.
          const popup = document.getElementById(POPUP_ID);
          if (popup && !popup.classList.contains('video-popup--hidden') && popup.contains(e.target)) return;

          const teaser = e.target.closest('.node--video-teaser');
          if (!teaser) return;

          // Allow normal link clicks inside teasers to pass through.
          if (e.target.closest('a[href]')) return;

          e.preventDefault();
          e.stopPropagation();
          openPopup(teaser);
        });
      });
    },
  };
})(Drupal, once);
