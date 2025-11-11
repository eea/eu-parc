/**
 * Add expand class to elements
 */
(function (Drupal, once) {
  Drupal.behaviors.parcExpand = {
    attach: function (context, settings) {
      once('parc-expand', '.js-expand', context).forEach(function (el) {
        el.addEventListener('click', function (event) {
          // Ignore clicks on links inside the element
          if (event.target.closest('a')) {
            return;
          }

          const targetValue = el.getAttribute('data-expand-target');
          if (!targetValue) return;

          const targets = context.querySelectorAll(`[data-expand="${targetValue}"]`);
          el.classList.toggle('expand');
          if (targets.length) {
            targets.forEach(function (target) {
              target.classList.toggle('expand');
            });
          }
        });
      });
    }
  };
})(Drupal, once);
