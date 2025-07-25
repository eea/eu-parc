(function ($, Drupal, once) {
  Drupal.behaviors.parcLabMap = {
    attach: function (context, settings) {
      $(once('parcLabMap', '.lab-map-type-header__button')).each(function () {
        var $this = $(this);
        var $mapSwitcher = $('.lab-map-type__switcher');

        $this.on('click', function (e) {
          e.preventDefault();
          $mapSwitcher.toggleClass('active');
          $this.toggleClass('active');
        });
      });
    }
  };

  Drupal.behaviors.parcLabMapCheckbox = {
    attach: function (context, settings) {
      $(once('parcLabMapCheckbox', '.lab-checkbox.active')).each(function () {
        var $this = $(this);
        var $checkbox = $this.find('input[type="radio"]');
        $checkbox.prop('checked', true);
      });
      $(once('parcLabMapCheckboxNavigate', '.lab-checkbox')).each(function () {
        var $this = $(this);
        var $checkbox = $this.find('input[type="radio"]');
        $id = $checkbox.attr('id');
        var $a = $('a[data-id="' + $id + '"]');
        $this.on('click', function (e) {
          e.preventDefault();
          if ($a.length && $a.attr('href')) {
            window.location.href = $a.attr('href');
          }
        });
      });
    }
  };
})(jQuery, Drupal, once)
