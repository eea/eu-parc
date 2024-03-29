(function ($, Drupal, once) {

  Drupal.behaviors.videoPlay = {
    attach: function (context, settings) {
      $(once('videoPlay', '.video-slideshow video')).each(function () {
        $(this).click(function(){
          $(this).closest('.video-slideshow').toggleClass('playing');
          this.paused ? this.play() : this.pause();
        });
      });
    }
  }

})(jQuery, Drupal, once);
