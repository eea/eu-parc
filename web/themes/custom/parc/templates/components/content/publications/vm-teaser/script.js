
function updateSlidePosition(e, direction) {
  const firstSlideWidth = e.querySelector(".cs--item").offsetWidth;

  if (direction === "prev") {
      e.scrollLeft -= firstSlideWidth;
  } else {
      e.scrollLeft += firstSlideWidth;
  }
}

let cs = document.querySelector(".carousel-scroll");

document
    .querySelector(".js-slider-prev")
    .addEventListener("click", function () {
        updateSlidePosition(cs, "prev");
    });

document
    .querySelector(".js-slider-next")
    .addEventListener("click", function () {
        updateSlidePosition(cs, "next");
    });
