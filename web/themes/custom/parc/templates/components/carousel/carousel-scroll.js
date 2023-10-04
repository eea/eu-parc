/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.carouselScroll = {
    attach: function (context) {
      $(once('carouselScroll', '.js-slider-prev', context)).on('click', function (e) {
        updateCarouselSlidePosition(e, "prev");
      });

      $(once('carouselScroll', '.js-slider-next', context)).on('click', function (e) {
        updateCarouselSlidePosition(e, "next");
      });
    }
  };

  function updateCarouselSlidePosition(func, direction) {
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
})(jQuery, Drupal, once);
