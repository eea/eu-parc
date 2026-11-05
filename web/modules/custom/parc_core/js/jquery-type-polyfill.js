/**
 * @file
 * Restores $.type(), removed in jQuery 3.3+ (Drupal core ships jQuery 4.x)
 * but still required by slick-carousel (unmaintained since ~2019).
 */
(function ($) {
  if (typeof $.type === 'function') {
    return;
  }

  var class2type = {};
  ['Boolean', 'Number', 'String', 'Function', 'Array', 'Date', 'RegExp', 'Object', 'Error', 'Symbol'].forEach(function (name) {
    class2type['[object ' + name + ']'] = name.toLowerCase();
  });

  $.type = function (obj) {
    if (obj == null) {
      return obj + '';
    }
    return typeof obj === 'object' || typeof obj === 'function' ? class2type[Object.prototype.toString.call(obj)] || 'object' : typeof obj;
  };
})(jQuery);
