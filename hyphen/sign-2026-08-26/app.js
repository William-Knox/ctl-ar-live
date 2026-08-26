/* Hyphen sign-off mocks · 2026-08-26. Shared chrome only. Does not send mail. */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  document.querySelectorAll(".menu-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var menu = btn.closest(".menu");
      var pop = menu && menu.querySelector(".menu-pop");
      if (!pop) return;
      var open = pop.hidden;
      document.querySelectorAll(".menu-pop").forEach(function (p) {
        if (p !== pop && !document.body.classList.contains("filters-open")) p.hidden = true;
      });
      if (!document.body.classList.contains("filters-open")) pop.hidden = !open;
      btn.classList.toggle("on", !pop.hidden);
    });
  });

  document.addEventListener("click", function () {
    if (document.body.classList.contains("filters-open")) return;
    document.querySelectorAll(".menu-pop").forEach(function (p) { p.hidden = true; });
    document.querySelectorAll(".menu-btn.on").forEach(function (b) { b.classList.remove("on"); });
    var sm = $("cReadyMenu");
    if (sm) sm.hidden = true;
  });

  var lo = $("loChip");
  if (lo) {
    lo.addEventListener("click", function () {
      var on = !lo.classList.contains("on");
      lo.classList.toggle("on", on);
      lo.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  document.querySelectorAll(".menu-foot .all").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var pop = b.closest(".menu-pop");
      if (!pop) return;
      var on = b.hasAttribute("data-select");
      pop.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = on; });
    });
  });

  function openPopup() {
    var back = $("draftsPopup");
    if (!back) return;
    back.classList.add("on");
    back.setAttribute("aria-hidden", "false");
  }
  function closePopup() {
    var back = $("draftsPopup");
    if (!back) return;
    back.classList.remove("on");
    back.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-open-drafts]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPopup();
    });
  });
  var cancel = $("draftsCancel");
  if (cancel) cancel.addEventListener("click", function (e) {
    e.preventDefault();
    closePopup();
  });
  var confirm = $("draftsConfirm");
  if (confirm) confirm.addEventListener("click", function (e) {
    e.preventDefault();
    /* Graph draft is unbuilt. Click does not send mail. */
    closePopup();
  });
  var back = $("draftsPopup");
  if (back) {
    back.addEventListener("click", function (e) {
      if (e.target === back) closePopup();
    });
  }

  var more = $("cMore");
  if (more) {
    more.addEventListener("click", function (e) {
      e.stopPropagation();
      var m = $("cReadyMenu");
      if (!m) return;
      m.hidden = !m.hidden;
      more.setAttribute("aria-expanded", m.hidden ? "false" : "true");
    });
  }
  var send = $("cSend");
  if (send) {
    send.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var m = $("cReadyMenu");
      if (m) m.hidden = true;
      /* Mock only. Does not send mail. */
    });
  }
  /* Drag-resize the left queue so the full address is visible. */
  (function resizeQueue() {
    var gutters = document.querySelectorAll(".gutter");
    if (!gutters.length) return;
    var KEY = "hyphen-queue-w";
    var min = 280, maxBase = function () { return Math.max(360, Math.floor(window.innerWidth * 0.72)); };
    function apply(w) {
      w = Math.max(min, Math.min(maxBase(), Math.round(w)));
      document.documentElement.style.setProperty("--list-w", w + "px");
      document.querySelectorAll(".wrap, .pane-left").forEach(function (el) {
        el.classList.toggle("wide", w >= 520);
      });
      try { sessionStorage.setItem(KEY, String(w)); } catch (e) {}
      return w;
    }
    var saved = 0;
    try { saved = parseInt(sessionStorage.getItem(KEY) || "", 10); } catch (e) {}
    if (saved) apply(saved);
    gutters.forEach(function (g) {
      var startX = 0, startW = 420, dragging = false;
      function pane() {
        return document.querySelector(".wrap") || document.querySelector(".pane-left");
      }
      function down(e) {
        var p = pane();
        if (!p) return;
        dragging = true;
        g.classList.add("drag");
        startX = (e.touches ? e.touches[0].clientX : e.clientX);
        startW = p.getBoundingClientRect().width;
        e.preventDefault();
      }
      function move(e) {
        if (!dragging) return;
        var x = (e.touches ? e.touches[0].clientX : e.clientX);
        apply(startW + (x - startX));
      }
      function up() {
        if (!dragging) return;
        dragging = false;
        g.classList.remove("drag");
      }
      g.addEventListener("mousedown", down);
      g.addEventListener("touchstart", down, { passive: false });
      window.addEventListener("mousemove", move);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
      g.addEventListener("keydown", function (e) {
        var p = pane();
        if (!p) return;
        var w = p.getBoundingClientRect().width;
        if (e.key === "ArrowLeft") apply(w - 24);
        if (e.key === "ArrowRight") apply(w + 24);
      });
    });
  })();
})();
