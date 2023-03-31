/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.keyMessagesCarousel = {
    attach: function (context) {
      $(context).find('.js-slider-prev').once('keyMessagesCarousel').on('click', function (e) {
        updateSlidePosition(e, "prev");
      });

      $(context).find('.js-slider-next').once('keyMessagesCarousel').on('click', function (e) {
        updateSlidePosition(e, "next");
      });
    }
  };

  function updateSlidePosition(func, direction) {
    let cs = func.currentTarget.parentNode.querySelector(".carousel-scroll");
    const firstSlideWidth = cs.querySelector(".cs--item").offsetWidth;
    const parentWidth = cs.offsetWidth;
    const count = cs.childElementCount;

    let btnNext = cs.parentElement.querySelector(".js-slider-next");
    let btnPrev = cs.parentElement.querySelector(".js-slider-prev");

    if (direction === "prev") {
      btnNext.classList.remove('d-none');
      if (cs.scrollLeft - firstSlideWidth <= 21) {
        btnPrev.classList.add('d-none');
      } else {
        btnPrev.classList.remove('d-none');
      }
      cs.scrollLeft -= firstSlideWidth;
    } else {
      btnPrev.classList.remove('d-none');
      if (cs.scrollLeft + firstSlideWidth > count * firstSlideWidth - parentWidth) {
        btnNext.classList.add('d-none');
      } else {
        btnNext.classList.remove('d-none');
      }
      cs.scrollLeft += firstSlideWidth;
    }
  }

  $.fn.isInViewport = function() {
    var elementTop = $(this).offset().top;
    var elementBottom = elementTop + $(this).outerHeight();

    var viewportTop = $(window).scrollTop();
    var viewportBottom = viewportTop + $(window).height();

    return elementBottom > viewportTop && elementTop < viewportBottom;
};

  Drupal.behaviors.publicationUrl = {
    attach: function (context,) {
      hash = window.location.hash;

      if (hash.indexOf('key--messages') !== -1) {
        $(context).find(hash).once('publicationUrl').parents('.collapse').addClass('show');
      }

      if (hash.indexOf('scientific-publications-') !== -1) {
        const node = hash + ' .collapse';
        $(context).find(node).once('publicationUrl').addClass('show');
      }

      $('.js-copy-to-clipboard').click(function (e) {
        var btn = $(this);
        e.preventDefault();
        var copyText = $(this).attr('href');

        btn.addClass('added');
        setTimeout(function () {
          btn.removeClass('added');
        }, 1000);

        document.addEventListener('copy', function(e) {
          copyText = window.location.origin + copyText;
           e.clipboardData.setData('text/plain', copyText);
           e.preventDefault();
        }, true);
        document.execCommand("copy");
      });
    }
  }
})(jQuery, Drupal, once);
