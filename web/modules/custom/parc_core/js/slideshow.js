(function ($, Drupal, once) {

  Drupal.behaviors.parcSlideshow = {
    attach: function (context, settings) {
      $(once('parcSlideshow', '.parc-slideshow .slides')).each(function () {
        $(this).slick({
          infinite: true,
          arrows: true,
          dots: true,
          asNavFor: '.captions',
          swipe: false,
        });

        $(this).parent().find('.captions').slick({
          infinite: true,
          arrows: false,
          dots: false,
          swipe: false,
        });
      });
    }
  }

})(jQuery, Drupal, once);
