/**
 * @file
 * Description.
*/

let scrollpos = window.scrollY
const header = document.getElementById("header")

header.style.setProperty('--header-height', header.offsetHeight + 'px');

window.addEventListener('scroll', function() {
  scrollpos = window.scrollY;

  if (scrollpos >= 50) {
    header.classList.add(...["h-sticky", "shadow-sm"])
  } else {
    header.classList.remove(...["h-sticky", "shadow-sm"])
  }
});
