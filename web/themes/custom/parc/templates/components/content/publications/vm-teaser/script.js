/**
 * @file
 * Description.
 */

(function ($, Drupal, once) {
  Drupal.behaviors.keyMessagesCarousel = {
    attach: function (context) {
      $('.js-slider-prev', context).on('click', function () {
        updateSlidePosition("prev");
      });

      $(context).find('.js-slider-next').once('keyMessagesCarousel').on('click', function () {
        updateSlidePosition("next");
      });
    }
  };
})(jQuery, Drupal, once);



function updateSlidePosition(direction) {
  let cs = document.querySelector(".carousel-scroll");
  const firstSlideWidth = cs.querySelector(".cs--item").offsetWidth;

  if (direction === "prev") {
    cs.scrollLeft -= firstSlideWidth;
  } else {
    cs.scrollLeft += firstSlideWidth;
  }
}
