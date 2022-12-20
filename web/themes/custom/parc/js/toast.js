/**
 * @file
 * Description.
*/

var option = {
  animation: true,
}

window.addEventListener('load', (event) => {
  var toastElList = [].slice.call(document.querySelectorAll('.toast'))
  var toastList = toastElList.map(function (toastEl) {
    return new bootstrap.Toast(toastEl, option)
  });

  for(var i=0;i<toastList.length;i++) {
    toastList[i].show();
  }
});
