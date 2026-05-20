((Drupal, once) => {
  Drupal.behaviors.swiperCarousel = {
    attach(context) {
      once("swiperCarousel", ".carousel.swiper", context).forEach((el) => {
        const next = el.parentElement.querySelector('.swiper-button-next');
        const prev = el.parentElement.querySelector('.swiper-button-prev');

        let options = {
          spaceBetween: 10,
          loop: true,
          speed: 500,
          allowTouchMove: false,
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

        const swiper = new Swiper(el, options)
      });
    },
  };
})(Drupal, once);
