/**
 * @file
 * Contains definition of the behaviour AOS.js.
 */
(function (Drupal) {
  Drupal.behaviors.aosInit = {
    attach: function () {
      AOS.init();
    }
  };
})(Drupal);
