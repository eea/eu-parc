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
})(jQuery, Drupal, once);
