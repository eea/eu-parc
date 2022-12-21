/**
 * @file
 * Description.
*/

(function ($, Drupal, once) {
  Drupal.behaviors.general = {
    attach: function (context, settings) {
      // const divs = container.querySelectorAll(".card-styled-border svg");

      var randomOffset = Math.random()*100;
      var speedDemping = 0.05+Math.random()*0.3;

      var onScroll = function() {
        var listArray = $('.card-styled-border svg').children('g');

        listArray.each(function( index ) {
          var g = $(this).find('path');
          console.log('element', g.attr('style'));

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
})(jQuery, Drupal, once);
