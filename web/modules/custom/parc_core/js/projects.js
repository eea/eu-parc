(function ($, Drupal, once) {

  Drupal.behaviors.parcProjects = {
    attach: function (context, settings) {
// draw a curvy line between point (startX,startY) and point (endX,endY)
      function drawCurve(startX, startY, endX, endY, id) {

        // exemple of a path: M318,345 L330,345 C450,345 380,124 504,124 L519,124

        // M
        var AX = startX;
        console.log(AX);
        var AY = startY;

        // L
        var BX = Math.abs(endX - startX) * 0.05 + startX;
        var BY = startY;

        // C
        var CX = startX + Math.abs(endX - startX) * 0.33;
        var CY = startY;
        var DX = endX - Math.abs(endX - startX) * 0.33;
        var DY = endY;
        var EX = - Math.abs(endX - startX) * 0.05 + endX;
        var EY = endY;

        // L
        var FX = endX;
        var FY = endY;

        // setting up the path string
        var path = 'M' + AX + ',' + AY;
        path += ' L' + BX + ',' + BY;
        path +=  ' ' + 'C' + CX + ',' + CY;
        path += ' ' + DX + ',' + DY;
        path += ' ' + EX + ',' + EY;
        path += ' L' + FX + ',' + FY;


        // applying the new path to the element
        document.getElementById(id).setAttribute("d", path);

      }

//drawCurve(200,400, 519,124);
      drawCurve(100,100, 500,500, 'myPath');
      drawCurve(100,120, 500,480, 'myPath2');
      drawCurve(100,200, 500,410, 'myPath3');
    }
  }

})(jQuery, Drupal, once);
