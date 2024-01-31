/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.keyMessagesCarousel = {
    attach: function (context) {
      $(once('keyMessagesCarousel', '.js-slider-prev', context)).on('click', function (e) {
        updateSlidePosition(e, "prev");
      });

      $(once('keyMessagesCarousel', '.js-slider-next', context)).on('click', function (e) {
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

  Drupal.behaviors.publicationExpand = {
    attach: function (context) {
      $(once('publicationExpand', '.node--publications--default .btn[data-bs-toggle]')).on('click', function () {
        const parent = $(this).closest('.node--publications--default');
        parent.toggleClass('expanded');
        parent.find('.authors').toggleClass('authors-expanded');
      });
    }
  };

  Drupal.behaviors.publicationUrl = {
    attach: function (context) {
      hash = window.location.hash;

      if (hash.indexOf('messages') !== -1) {
        $(once('publicationUrl', hash, context)).parents('.collapse').addClass('show');
      }

      if (hash.indexOf('article-') !== -1) {
        const node = hash + ' .collapse';
        $(once('publicationUrl', node, context)).addClass('show');
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
