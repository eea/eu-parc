/**
 * @file
 * Full width responsive video: orientation-aware source, sound toggle.
 */

(function (Drupal, once) {
  'use strict';

  /**
   * Below this width the portrait cut is used.
   */
  var PORTRAIT_QUERY = '(max-width: 767px)';

  /**
   * Points the player at the cut matching the current viewport.
   */
  function setSource(video, query) {
    var src = query.matches ? video.getAttribute('data-src-portrait') : video.getAttribute('data-src-landscape');

    if (!src || video.getAttribute('data-current-src') === src) {
      return;
    }

    var wasPlaying = !video.paused;
    var time = video.currentTime;

    video.setAttribute('data-current-src', src);
    video.src = src;
    video.load();

    video.addEventListener('loadedmetadata', function restore() {
      video.removeEventListener('loadedmetadata', restore);
      if (time && time < video.duration) {
        video.currentTime = time;
      }
      if (wasPlaying) {
        var playing = video.play();
        if (playing && playing.catch) {
          playing.catch(function () {});
        }
      }
    });
  }

  /**
   * Wires the mute/unmute button.
   */
  function setupSound(wrapper, video) {
    var button = wrapper.querySelector('[data-responsive-video-sound]');
    var label = wrapper.querySelector('[data-responsive-video-sound-label]');

    if (!button) {
      return;
    }

    function sync() {
      var muted = video.muted;
      button.setAttribute('aria-pressed', muted ? 'false' : 'true');
      wrapper.classList.toggle('responsive-video--sound-on', !muted);
      if (label) {
        label.textContent = muted ? Drupal.t('Turn sound on') : Drupal.t('Turn sound off');
      }
    }

    button.addEventListener('click', function () {
      video.muted = !video.muted;
      if (!video.muted && video.paused) {
        var playing = video.play();
        if (playing && playing.catch) {
          playing.catch(function () {});
        }
      }
      sync();
    });

    video.addEventListener('volumechange', sync);
    sync();
  }

  /**
   * Stops playback while the video is scrolled out of view.
   */
  function setupVisibility(video) {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (video.paused) {
            var playing = video.play();
            if (playing && playing.catch) {
              playing.catch(function () {});
            }
          }
        }
        else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.1 }).observe(video);
  }

  Drupal.behaviors.parcResponsiveVideo = {
    attach: function (context) {
      once('parcResponsiveVideo', '[data-responsive-video]', context).forEach(function (video) {
        var wrapper = video.closest('.responsive-video');
        var query = window.matchMedia(PORTRAIT_QUERY);

        setSource(video, query);

        var onChange = function () {
          setSource(video, query);
        };

        if (query.addEventListener) {
          query.addEventListener('change', onChange);
        }
        else {
          query.addListener(onChange);
        }

        if (wrapper) {
          setupSound(wrapper, video);
        }
        setupVisibility(video);
      });
    }
  };

})(Drupal, once);
