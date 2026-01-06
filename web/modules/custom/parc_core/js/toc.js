(function ($, Drupal, once) {
  Drupal.behaviors.tableOfContents = {
    attach: (context) => {
      const anchors = document.querySelectorAll('.js-toc-chapter-title');
      const links = document.querySelectorAll('.toc__items a');

      updateActiveToc();

      window.addEventListener('scroll', (event) => {
        updateActiveToc();
      });

      function updateActiveToc() {
        if (typeof(anchors) != 'undefined' && anchors != null && typeof(links) != 'undefined' && links != null) {
          let scrollTop = window.scrollY;

          links.forEach((link, index) => {
            link.classList.remove("active");
          });

          let highlighted = false;
          for (var i = anchors.length - 1; i >= 0; i--) {
            if (scrollTop > $(anchors[i]).offset().top - 250) {
              highlighted = true;
              links[i].classList.add('active');
              break;
            }
          }
        }
      }
    }
  };
})(jQuery, Drupal, once);
