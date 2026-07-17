(function () {
  "use strict";

  /* Mobile nav toggle */
  var nav = document.querySelector(".nav");
  var toggle = document.getElementById("nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("nav--open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav__links a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("nav--open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Contact form (front-end only placeholder) */
  var form = document.getElementById("contact-form");
  var note = document.getElementById("form-note");
  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      note.textContent = "Təşəkkürlər! Mesajınız qeydə alındı, tezliklə sizinlə əlaqə saxlayacağıq.";
      form.reset();
    });
  }

  /* Team carousel dots (mobile) */
  var track = document.getElementById("team-track");
  var dotsWrap = document.getElementById("team-dots");
  if (track && dotsWrap) {
    var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll(".dot"));
    var cards = Array.prototype.slice.call(track.children);

    function updateActive() {
      var trackRect = track.getBoundingClientRect();
      var closest = 0;
      var closestDist = Infinity;
      cards.forEach(function (card, i) {
        var rect = card.getBoundingClientRect();
        var dist = Math.abs(rect.left - trackRect.left);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      dots.forEach(function (d, i) { d.classList.toggle("dot--active", i === closest); });
    }

    var mq = window.matchMedia("(max-width: 640px)");
    function syncMode() {
      if (mq.matches) {
        dotsWrap.style.display = "flex";
        track.style.display = "flex";
        track.style.overflowX = "auto";
        track.style.scrollSnapType = "x mandatory";
        cards.forEach(function (c) {
          c.style.flex = "0 0 80%";
          c.style.scrollSnapAlign = "start";
        });
        track.addEventListener("scroll", updateActive, { passive: true });
        updateActive();
      } else {
        dotsWrap.style.display = "none";
        track.style.display = "grid";
        track.style.overflowX = "";
        cards.forEach(function (c) { c.style.flex = ""; });
      }
    }
    mq.addEventListener("change", syncMode);
    syncMode();
  }
})();
