document.querySelectorAll('.product-image-controls').forEach(function (group) {
  group.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-product-image]');
    if (!button || !group.contains(button)) return;
    var image = document.getElementById(button.getAttribute('aria-controls'));
    if (!image) return;
    image.src = button.dataset.productImage;
    image.alt = button.dataset.imageAlt;
    group.querySelectorAll('button').forEach(function (item) {
      item.setAttribute('aria-pressed', String(item === button));
    });
  });
});
