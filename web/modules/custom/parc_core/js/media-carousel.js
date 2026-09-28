(function ($, Drupal, once) {

  Drupal.behaviors.parcMediaCarousel = {
    attach: function (context, settings) {
      $(once('parcMediaCarousel', '.parc-media-carousel', context)).each(function () {
        var $carousel = $(this);
        var $slides = $carousel.find('.slides');
        var $caption = $carousel.find('.caption-item');

        function updateCaption(index) {
          var caption = $slides.find('.slideshow-item').eq(index).attr('data-caption') || '';
          $caption.text(caption);
        }

        $slides.on('init', function (event, slick) {
          updateCaption(slick.currentSlide);
        });

        $slides.on('afterChange', function (event, slick, currentSlide) {
          updateCaption(currentSlide);
        });

        $slides.slick({
          infinite: true,
          arrows: true,
          dots: true,
          swipe: true,
          appendArrows: $carousel.find('.parc-media-carousel__viewport'),
          appendDots: $carousel.find('.parc-media-carousel__dots'),
          prevArrow: '<button type="button" class="carousel-arrow carousel-arrow--prev" aria-label="Previous"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 1L1.5 8L8.5 15" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>',
          nextArrow: '<button type="button" class="carousel-arrow carousel-arrow--next" aria-label="Next"><svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1L8.5 8L1.5 15" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>',
        });
      });
    }
  };

})(jQuery, Drupal, once);
