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

        const details = [...document.querySelectorAll('details')];
        document.addEventListener('click', function(e) {
          if (!details.some(f => f.contains(e.target))) {
            details.forEach(f => f.removeAttribute('open'));
          } else {
            details.forEach(f => !f.contains(e.target) ? f.removeAttribute('open') : '');
          }
        })
    }
  };

  Drupal.behaviors.mainNav = {
    attach: function (context, settings) {
      let mainSidebar = $('.region-nav-main #mainSidebar', context);

      mainSidebar.on('show.bs.collapse', function () {
        $('body').addClass('overlay-is-navbar-collapse');
      });

      mainSidebar.on('hide.bs.collapse', function () {
        $('body').removeClass('overlay-is-navbar-collapse');
      });

      $('.nav-link.is-active[data-drupal-link-system-path="<front>"]', context).on('click', function(){
        mainSidebar.collapse('hide');
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

  Drupal.behaviors.thematicAreas = {
    attach: function (context, settings) {
      var section_id;
      var page = $('html,body');

      $(once('governanceSvgClick', '.governance-svg')).click(function (e) {
        section_id = $(this).attr('data-section-id');
        history.pushState(null,null, section_id);
        section_id = section_id + '-section';
        e.preventDefault();
        $(this).parent().find('.governance-svg.active').removeClass('active');
        $(this).addClass('active');

        $('.governance-content').removeClass('show');
        $(section_id).addClass('show');

        scrollPageToTitle();
      });

      if (window.location.hash) {
        $(once('scrollToPageTitle', '.governance-title')).each(function () {
          scrollToGovernanceItem();
        });
      }

      $(window).on('hashchange', function() {
        if ($('.governance-title').length) {
          scrollToGovernanceItem();
        }
      });

      function scrollPageToTitle() {
        let governance_title = $('.governance-title');
        if (governance_title) {
          $(once('governanceScrollOn', 'html,body')).on("scroll mousedown wheel DOMMouseScroll mousewheel keyup touchmove", function () {
            page.stop();
          });

          page.animate({scrollTop: governance_title.offset().top - 80}, 400, function () {
            $(once('governanceScrollOff', 'html,body')).off("scroll mousedown wheel DOMMouseScroll mousewheel keyup touchmove");
          });
        }
      }

      function scrollToGovernanceItem() {
        var hash = window.location.hash.substring(1);

        $('.governance-content').removeClass('show');
        $('#' + hash + '-section').addClass('show');

        $('.governance-svg.active').removeClass('active');
        $('[data-section-id="#' + hash + '"]').addClass('active');

        scrollPageToTitle();
      }
    }
  };

  Drupal.behaviors.parcSearchApiAutocomplete = {
    attach: function (context, settings) {
      var $autocomplete = $(once('parcAutocomplete', '.block-views-exposed-filter-blocksearch-block-1 input.form-autocomplete', context));
      $autocomplete.autocomplete( "option", "position", { my : "right top-7", at: "right bottom" } );
    }
  };

  Drupal.behaviors.survey = {
    attach: function (context, settings) {
      $('.survey-result-percent').each(function () {
        var $this = $(this);
        var parent = $this.parent();
        var percent = parent.attr('data-percent');
        var parentHeight = parent.outerHeight();
        var maxHeight = parentHeight - 20;
        console.log(maxHeight);

        var height = Math.round((percent / 100) * maxHeight);

        $this.attr('style', `max-height: ${height}px`);

      });
    }
  }
})(jQuery, Drupal, once);

