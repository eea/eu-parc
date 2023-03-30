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
    console.log(firstSlideWidth);

    if (direction === "prev") {
      cs.scrollLeft -= firstSlideWidth;
    } else {
      cs.scrollLeft += firstSlideWidth;
    }
  }

  Drupal.behaviors.publicationUrl = {
    attach: function (context,) {
      hash = window.location.hash;
      $(context).find(hash).once('publicationUrl').parents('.collapse').addClass('show');

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
