((Drupal, once) => {
  Drupal.behaviors.swiperCarousel = {
    attach(context) {
      once("swiperCarousel", ".carousel.swiper", context).forEach((el) => {
        const next = el.parentElement.querySelector('.swiper-button-next');
        const prev = el.parentElement.querySelector('.swiper-button-prev');
        const isVideos = el.dataset.type === 'videos';
        const isHighlights = el.dataset.type === 'highlights';

        let options = {
          spaceBetween: isVideos || isHighlights ? 24 : 10,
          loop: true,
          speed: 500,
          allowTouchMove: isVideos,
          autoplay: false,
          observer: true,
          observeParents: true,
          navigation: {
            nextEl: next,
            prevEl: prev,
          },
          arrows: true,
          dots: false,
          slidesPerView: 1,
          breakpointsBase: 'window',
          breakpoints: {
            480: {
              slidesPerView: 2,
            },
            768: {
              slidesPerView: 3,
            },
            1200: {
              slidesPerView: 4,
            },
          }
        };

        if (isHighlights) {
          options.breakpoints[1800] = {slidesPerView: 3};
          options.breakpoints[1200].slidesPerView = 2;
          options.breakpoints[768].slidesPerView = 2;
          options.breakpoints[480].slidesPerView = 1;
        }

        const swiper = new Swiper(el, options)
      });
    },
  };
})(Drupal, once);
