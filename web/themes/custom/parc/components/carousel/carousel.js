((Drupal, once) => {
  Drupal.behaviors.swiperCarousel = {
    attach(context) {
      once("swiperCarousel", ".carousel", context).forEach((el) => {
        const next = el.parentElement.querySelector('.swiper-button-next');
        const prev = el.parentElement.querySelector('.swiper-button-prev');

        let options = {
          spaceBetween: 10,
          loop: true,
          speed: 500,
          allowTouchMove: false,
          autoplay: false,
          navigation: {
            nextEl: next,
            prevEl: prev,
          },
          arrows: true,
          dots: false,
          slidesPerView: 1,
          breakpointsBase: 'container',
          breakpoints: {
            320: {
              slidesPerView: 2,
            },
            700: {
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
