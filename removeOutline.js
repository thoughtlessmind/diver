/**
 * Removes the outline from all elements on the page.
 */
function removeOutline() {
  document.querySelectorAll("*").forEach(function (element) {
    element.style.removeProperty("outline");
  });
}

removeOutline();
