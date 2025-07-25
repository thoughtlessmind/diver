document.querySelectorAll("*").forEach(function (element) {
  element.style.outline =
    "1px solid #" + (~~(Math.random() * (1 << 24))).toString(16);
});
