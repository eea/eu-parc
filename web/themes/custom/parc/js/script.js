/**
 * @file
 * Description.
*/

(function ($, Drupal, once) {
  Drupal.behaviors.general = {
    attach: function (context, settings) {
      var randomOffset = Math.random()*100;
      var speedDemping = 0.05+Math.random()*0.3;

      var onScroll = function() {
        var listArray = $('.card-styled-border svg').children('g');

        listArray.each(function( index ) {
          var g = $(this).find('path');

          if(index%2 ==0) {
            g.attr('style', 'stroke-dashoffset: ' + (randomOffset + (window.scrollY*speedDemping)));
          } else {
            g.attr('style', 'stroke-dashoffset: ' + (randomOffset - (window.scrollY*speedDemping)));
          }
        });
      }

      addEventListener('scroll', onScroll);

      // carousel parc effects.
      $(once('general', '.carousel-item.active svg', context))
        .each(function () {
          let svg = $(this);
          setInterval(() => {
            svg.children('g').each(function () {
              $(this).addClass("static").removeClass("animate");

              if(Math.random() > 0.75) {
               $(this).addClass("animate").removeClass("static");
              }
            });
          }, 3000);
        });
    }
  };

  Drupal.behaviors.mainNav = {
    attach: function (context, settings) {
      $('#mainSidebar').on('show.bs.collapse', function () {
        $('body').addClass('overlay-is-navbar-collapse');
      });

      $('#mainSidebar').on('hide.bs.collapse', function () {
        $('body').removeClass('overlay-is-navbar-collapse');
      });

      var lastScrollTop = 0;

      document.addEventListener("scroll", function(){ // or window.addEventListener("scroll"....
        var st = window.pageYOffset || document.documentElement.scrollTop;

        if (st > lastScrollTop && st > 120){
          $('#header').addClass('vh');
        } else {
          $('#header').removeClass('vh');
        }
        lastScrollTop = st <= 0 ? 0 : st;
      }, false);
    }
  };
})(jQuery, Drupal, once);
