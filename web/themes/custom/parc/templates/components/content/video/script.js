/**
 * @file
 * Replaces the video cover with the player once it is clicked.
 */

(function (Drupal, once) {
  Drupal.behaviors.videoCover = {
    attach: function (context) {
      once('video-cover', '.video-full__cover', context).forEach(function (cover) {
        cover.addEventListener('click', function () {
          const iframe = document.createElement('iframe');
          iframe.src = cover.dataset.src;
          iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
          iframe.allowFullscreen = true;
          iframe.title = cover.getAttribute('aria-label');
          cover.replaceWith(iframe);
        });
      });
    }
  };
})(Drupal, once);
