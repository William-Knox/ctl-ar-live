/* Hyphen sign-off mocks · 2026-08-26. Shared UI only. Does not send mail. */
(function () {
  "use strict";

  var BKEY = "hyphen-builders";

  function $(id) { return document.getElementById(id); }
  function money(n) {
    return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function builderLab(p) {
    if (p === "LENNAR HOMES") return "Lennar";
    if (p === "MHI HOMES") return "MHI";
    if (p === "Toll Brothers, Inc.") return "Toll";
    if (p === "K. Hovnanian of Houston") return "K. Hovnanian";
    if (p === "TriPointe Homes") return "TriPointe";
    return p || "—";
  }
  function dayBucket(d) {
    if (d <= 15) return "0-15";
    if (d <= 30) return "16-30";
    return "30+";
  }
  function matchIssue(r, issue) {
    if (!issue) return true;
    if (issue === "Leftover") return !!r.leftover;
    return r.issue === issue;
  }
  function matchBuilder(r, builders) {
    if (!builders || !builders.length) return true;
    return builders.indexOf(r.parent) >= 0;
  }
  function pct(n, max) {
    if (!max) return 0;
    return Math.max(0, Math.min(100, Math.round((n / max) * 100)));
  }

  function checkedIn(menu) {
    var pop = document.querySelector('.menu[data-menu="' + menu + '"] .menu-pop');
    if (!pop) return [];
    var boxes = pop.querySelectorAll("input[type=checkbox]");
    var on = [];
    boxes.forEach(function (c) {
      if (c.checked) on.push(c.value);
    });
    if (menu === "builder" && on.length && on.length === boxes.length) return [];
    return on;
  }
  function saveBuilders() {
    try { sessionStorage.setItem(BKEY, JSON.stringify(checkedIn("builder"))); } catch (e) {}
  }
  function restoreBuilders() {
    var saved;
    try { saved = JSON.parse(sessionStorage.getItem(BKEY) || "[]"); } catch (e) { saved = []; }
    if (!saved || !saved.length) return;
    var pop = document.querySelector('.menu[data-menu="builder"] .menu-pop');
    if (!pop) return;
    pop.querySelectorAll("input[type=checkbox]").forEach(function (c) {
      c.checked = saved.indexOf(c.value) >= 0;
    });
  }

  var openChart = { metric: "money", group: "issue" };
  var ISSUE_ORDER = [
    "Leftover lab", "Quantity shortfall", "Notes error", "Amount off",
    "Write-off", "Unpaid complete", "No PO", "Paid to apply",
    "Pending Notes", "Pending client acceptance"
  ];
  var AGE_BANDS = ["0–30", "31–60", "61–90", "90+"];

  function ageBand(days) {
    if (days <= 30) return "0–30";
    if (days <= 60) return "31–60";
    if (days <= 90) return "61–90";
    return "90+";
  }

  function paintBars(host, rows, wide) {
    if (!host) return;
    var max = 0;
    rows.forEach(function (r) { if (r.open > max) max = r.open; });
    host.innerHTML = rows.map(function (r) {
      var cls = wide ? "hbar wide-lab" : "hbar";
      return '<div class="' + cls + '"><span class="hbar-lab">' + esc(r.lab) +
        '</span><span class="hbar-track"><i style="width:' + pct(r.open, max) +
        '%"></i></span><span class="hbar-n">' + money(r.open) + "</span></div>";
    }).join("");
  }

  function openChartRows(rows, lockedAging) {
    if (openChart.group === "aging") {
      var acc = {};
      AGE_BANDS.forEach(function (b) { acc[b] = { lab: b, open: 0, n: 0 }; });
      (rows || []).forEach(function (r) {
        var b = ageBand(r.days);
        acc[b].open += r.open;
        acc[b].n += 1;
      });
      if (lockedAging && openChart.metric === "money") {
        lockedAging.forEach(function (r) {
          if (acc[r.lab]) acc[r.lab].open = r.open;
        });
      }
      return AGE_BANDS.map(function (b) { return acc[b]; });
    }
    var by = {};
    (rows || []).forEach(function (r) {
      var lab = r.issue || "—";
      if (!by[lab]) by[lab] = { lab: lab, open: 0, n: 0 };
      by[lab].open += r.open;
      by[lab].n += 1;
    });
    var list = ISSUE_ORDER.map(function (lab) { return by[lab]; }).filter(Boolean);
    if (!list.length) {
      list = Object.keys(by).map(function (k) { return by[k]; })
        .sort(function (a, b) { return b.open - a.open; });
    }
    return list;
  }

  function paintOpenChart(rows, lockedAging) {
    var host = $("openBars");
    if (!host) return;
    var list = openChartRows(rows, lockedAging);
    var useCount = openChart.metric === "count";
    var max = 0;
    list.forEach(function (r) {
      var v = useCount ? r.n : r.open;
      if (v > max) max = v;
    });
    host.innerHTML = list.map(function (r) {
      var v = useCount ? r.n : r.open;
      return '<div class="hbar wide-lab"><span class="hbar-lab">' + esc(r.lab) +
        '</span><span class="hbar-track"><i style="width:' + pct(v, max) +
        '%"></i></span><span class="hbar-n">' + (useCount ? String(r.n) : money(r.open)) +
        "</span></div>";
    }).join("");
    if ($("openTitle")) {
      $("openTitle").textContent = openChart.group === "aging" ? "Open by Aging" : "Open by Issue";
    }
  }

  function markOpenToggles() {
    document.querySelectorAll("[data-open-metric]").forEach(function (b) {
      var on = b.getAttribute("data-open-metric") === openChart.metric;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-open-group]").forEach(function (b) {
      var on = b.getAttribute("data-open-group") === openChart.group;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function paintHome() {
    var S = window.SAMPLE;
    if (!S || !document.body.classList.contains("home")) return;
    var issue = $("homeIssue") ? $("homeIssue").value : "";
    var builders = checkedIn("builder");
    var sliced = !!(issue || builders.length);
    var open, needs, waiting, lateN, lateOpen, aging, buildersBars, boxes, extraRows;
    extraRows = (S.book || []).filter(function (r) {
      return matchIssue(r, issue) && matchBuilder(r, builders);
    });
    if (!sliced) {
      var a = S.all;
      open = a.open;
      needs = a.needs;
      waiting = a.waiting;
      lateN = a.lateN;
      lateOpen = a.lateOpen;
      aging = a.aging;
      buildersBars = a.builders;
      boxes = a.boxes;
    } else {
      open = 0;
      needs = 0;
      waiting = 0;
      lateN = 0;
      lateOpen = 0;
      var age = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
      var byB = {};
      var byBox = { chase: 0, apply: 0, writeoff: 0, awaiting: 0 };
      extraRows.forEach(function (r) {
        open += r.open;
        if (r.box === "chase") needs += 1;
        if (r.box === "awaiting") waiting += 1;
        if (r.days >= 30) { lateN += 1; lateOpen += r.open; }
        if (r.days <= 30) age["0–30"] += r.open;
        else if (r.days <= 60) age["31–60"] += r.open;
        else if (r.days <= 90) age["61–90"] += r.open;
        else age["90+"] += r.open;
        var bl = builderLab(r.parent);
        byB[bl] = (byB[bl] || 0) + r.open;
        if (byBox[r.box] != null) byBox[r.box] += r.open;
      });
      aging = [
        { lab: "0–30", open: age["0–30"] },
        { lab: "31–60", open: age["31–60"] },
        { lab: "61–90", open: age["61–90"] },
        { lab: "90+", open: age["90+"] }
      ];
      buildersBars = Object.keys(byB).map(function (k) {
        return { lab: k, open: byB[k] };
      }).sort(function (x, y) { return y.open - x.open; }).slice(0, 5);
      boxes = [
        { lab: "Chase", href: "app-open.html", sub: "Needs you. Queue and case.", open: byBox.chase },
        { lab: "Apply", href: "apply.html", sub: "Paid to apply. Esme note.", open: byBox.apply },
        { lab: "Write-off", href: "writeoff.html", sub: "One bucket. Esme note.", open: byBox.writeoff },
        { lab: "Awaiting", href: "awaiting.html", sub: "Waiting on them.", open: byBox.awaiting }
      ];
    }
    if ($("kpiOpen")) $("kpiOpen").textContent = money(open);
    if ($("kpiNeeds")) $("kpiNeeds").textContent = String(needs);
    if ($("kpiWait")) $("kpiWait").textContent = String(waiting);
    if ($("kpiLateN")) $("kpiLateN").textContent = String(lateN);
    if ($("kpiLateOpen")) $("kpiLateOpen").textContent = money(lateOpen);
    paintBars($("agingBars"), aging);
    paintBars($("builderBars"), buildersBars);
    var boxMax = 0;
    boxes.forEach(function (b) { if (b.open > boxMax) boxMax = b.open; });
    document.querySelectorAll(".home-box").forEach(function (el, i) {
      var b = boxes[i];
      if (!b) return;
      var bar = el.querySelector(".hbar-track i");
      var n = el.querySelector(".hbar-n");
      if (bar) bar.style.width = pct(b.open, boxMax) + "%";
      if (n) n.textContent = money(b.open);
    });
    paintOpenChart(extraRows, sliced ? null : aging);
    markOpenToggles();
  }

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
      refresh();
    });
  }

  document.querySelectorAll(".menu-foot .all").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var pop = b.closest(".menu-pop");
      if (!pop) return;
      var on = b.hasAttribute("data-select");
      pop.querySelectorAll("input[type=checkbox]").forEach(function (c) { c.checked = on; });
      saveBuilders();
      refresh();
    });
  });

  function openNamed(id) {
    var back = $(id);
    if (!back) return;
    back.classList.add("on");
    back.setAttribute("aria-hidden", "false");
  }
  function closeNamed(id) {
    var back = $(id);
    if (!back) return;
    back.classList.remove("on");
    back.setAttribute("aria-hidden", "true");
  }
  function bindPopup(id, cancelId, confirmId) {
    var cancel = $(cancelId);
    if (cancel) cancel.addEventListener("click", function (e) {
      e.preventDefault();
      closeNamed(id);
    });
    var confirm = $(confirmId);
    if (confirm) confirm.addEventListener("click", function (e) {
      e.preventDefault();
      closeNamed(id);
    });
    var back = $(id);
    if (back) {
      back.addEventListener("click", function (e) {
        if (e.target === back) closeNamed(id);
      });
    }
  }

  document.querySelectorAll("[data-open-drafts]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openNamed("draftsPopup");
    });
  });
  bindPopup("draftsPopup", "draftsCancel", "draftsConfirm");
  bindPopup("sendPopup", "sendCancel", "sendConfirm");

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
  function openSend(e) {
    e.preventDefault();
    e.stopPropagation();
    var m = $("cReadyMenu");
    if (m) m.hidden = true;
    openNamed("sendPopup");
  }
  var send = $("cSend");
  if (send) send.addEventListener("click", openSend);
  document.querySelectorAll("[data-open-send]").forEach(function (b) {
    b.addEventListener("click", openSend);
  });

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
      var startX = 0, startW = 560, dragging = false;
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

  var queueState = { sortDir: "desc", selected: "0428-170954" };

  function fillCommunities() {
    var pop = document.querySelector('.menu[data-menu="community"] .menu-pop');
    var S = window.SAMPLE;
    if (!pop || !S || !S.queue) return;
    if (pop.querySelector("label")) return;
    var seen = {};
    var labs = [];
    S.queue.forEach(function (r) {
      var c = r.community || "";
      if (!c || seen[c]) return;
      seen[c] = 1;
      labs.push(c);
    });
    labs.sort(function (a, b) { return a.localeCompare(b); });
    var foot = pop.querySelector(".menu-foot");
    labs.forEach(function (c) {
      var lab = document.createElement("label");
      lab.innerHTML = '<input type="checkbox" value="' + esc(c) + '" /> ' + esc(c);
      pop.insertBefore(lab, foot);
    });
  }
  function queueRows() {
    var S = window.SAMPLE;
    if (!S || !S.queue || document.body.getAttribute("data-queue") === "empty") return [];
    var q = ($("q") && $("q").value || "").trim().toLowerCase();
    var leftoverOn = !!(lo && lo.classList.contains("on"));
    var days = checkedIn("days");
    var builders = checkedIn("builder");
    var comms = checkedIn("community");
    var issues = checkedIn("why");
    var rows = S.queue.filter(function (r) {
      if (leftoverOn && !r.leftover) return false;
      if (days.length && days.indexOf(dayBucket(r.days)) < 0) return false;
      if (builders.length && builders.indexOf(r.parent) < 0) return false;
      if (comms.length && comms.indexOf(r.community) < 0) return false;
      if (issues.length && issues.indexOf(r.issue) < 0) return false;
      if (q) {
        var blob = (r.id + " " + r.addr + " " + r.community + " " + r.parent + " " + r.issue).toLowerCase();
        if (blob.indexOf(q) < 0) return false;
      }
      return true;
    });
    rows.sort(function (a, b) {
      var cmp = (Number(a.days) || 0) - (Number(b.days) || 0);
      return queueState.sortDir === "desc" ? -cmp : cmp;
    });
    return rows;
  }
  var hdrLock = null;
  function lockHdr() {
    if (hdrLock) return;
    hdrLock = [];
    document.querySelectorAll(".hdr .count b").forEach(function (b) {
      hdrLock.push(b.textContent);
    });
  }
  function restoreHdr() {
    if (!hdrLock) return;
    document.querySelectorAll(".hdr .count b").forEach(function (b, i) {
      if (hdrLock[i] != null) b.textContent = hdrLock[i];
    });
  }
  function setHdr(n, open, third) {
    var bs = document.querySelectorAll(".hdr .count b");
    if (bs[0] && n != null) bs[0].textContent = String(n);
    if (bs[1] && open != null) bs[1].textContent = money(open);
    if (bs[2] && third != null) bs[2].textContent = String(third);
  }
  function paintQueue() {
    var tb = $("tbody");
    if (!tb || !window.SAMPLE || !window.SAMPLE.queue) return;
    if (document.body.getAttribute("data-queue") === "empty") return;
    var rows = queueRows();
    var empty = document.querySelector(".wrap .empty-state");
    tb.innerHTML = rows.map(function (r, i) {
      var sel = r.id === queueState.selected ? " sel" : "";
      var alt = i % 2 ? " alt" : "";
      var late = r.days >= 30 ? " late" : "";
      var pill = r.issue ? '<span class="pill why">' + esc(r.issue) + "</span>" : "";
      return '<tr class="' + (sel + alt).trim() + '" data-id="' + esc(r.id) + '">' +
        '<td class="num"><span class="dpd' + late + '">' + esc(r.days) + "</span></td>" +
        '<td class="inv">' + esc(r.id) + "</td>" +
        '<td class="addr">' + esc(r.addr) + "</td>" +
        '<td class="bld">' + esc(builderLab(r.parent)) + "</td>" +
        "<td>" + pill + "</td>" +
        '<td class="num money">' + money(r.open) + "</td></tr>";
    }).join("");
    if (empty) empty.hidden = rows.length > 0;
    var th = document.querySelector("thead th[data-sort=days]");
    if (th) {
      th.setAttribute("aria-sort", queueState.sortDir === "desc" ? "descending" : "ascending");
      var s = th.querySelector(".s");
      if (s) s.textContent = queueState.sortDir === "desc" ? "▼" : "▲";
    }
    var filtered = !!(lo && lo.classList.contains("on")) ||
      checkedIn("days").length || checkedIn("builder").length ||
      checkedIn("community").length || checkedIn("why").length ||
      !!( $("q") && $("q").value );
    if ($("tbody")) {
      if (filtered) {
        var open = 0;
        rows.forEach(function (r) { open += r.open; });
        setHdr(rows.length, open);
      } else {
        restoreHdr();
      }
    }
    var clear = $("clearBtn");
    if (clear) {
      var on = !!(lo && lo.classList.contains("on")) ||
        checkedIn("days").length || checkedIn("builder").length ||
        checkedIn("community").length || checkedIn("why").length ||
        !!( $("q") && $("q").value );
      clear.classList.toggle("show", on);
    }
  }

  function parseMoney(el) {
    if (!el) return 0;
    return Number(String(el.textContent || "").replace(/[^0-9.]/g, "")) || 0;
  }
  function paintLists() {
    var builders = checkedIn("builder");
    var empty = $("listEmpty");
    var shown = 0;
    var open = 0;
    var extra = 0;

    document.querySelectorAll("article.check[data-parent]").forEach(function (el) {
      var on = !builders.length || builders.indexOf(el.getAttribute("data-parent")) >= 0;
      el.hidden = !on;
      if (on) {
        shown += 1;
        open += parseMoney(el.querySelector(".check-tot .amt"));
        extra += el.querySelectorAll(".ainv").length;
      }
    });
    if (document.querySelector("article.check[data-parent]")) {
      if (empty) empty.hidden = shown > 0;
      if (builders.length) setHdr(extra, open, shown);
      else restoreHdr();
      return;
    }

    document.querySelectorAll("article.wo-row[data-parent]").forEach(function (el) {
      var on = !builders.length || builders.indexOf(el.getAttribute("data-parent")) >= 0;
      el.hidden = !on;
      if (on) {
        shown += 1;
        open += parseMoney(el.querySelector(".open"));
      }
    });
    if (document.querySelector("article.wo-row[data-parent]")) {
      if (empty) empty.hidden = shown > 0;
      if (builders.length) setHdr(shown, open, shown);
      else restoreHdr();
      return;
    }

    document.querySelectorAll(".stage.await tbody tr[data-parent]").forEach(function (el) {
      var on = !builders.length || builders.indexOf(el.getAttribute("data-parent")) >= 0;
      el.hidden = !on;
      if (on) {
        shown += 1;
        open += parseMoney(el.querySelector(".money"));
        extra += 1;
      }
    });
    if (document.querySelector(".stage.await tbody tr[data-parent]")) {
      if (empty) empty.hidden = shown > 0;
      if (builders.length) setHdr(shown, open, extra);
      else restoreHdr();
    }
  }

  function refresh() {
    paintHome();
    paintQueue();
    paintLists();
  }

  lockHdr();
  restoreBuilders();
  fillCommunities();
  document.querySelectorAll(".menu-pop").forEach(function (pop) {
    pop.addEventListener("click", function (e) { e.stopPropagation(); });
    pop.addEventListener("change", function () {
      saveBuilders();
      refresh();
    });
  });
  if ($("homeIssue")) {
    $("homeIssue").addEventListener("change", refresh);
  }
  document.querySelectorAll("[data-open-metric]").forEach(function (b) {
    b.addEventListener("click", function () {
      openChart.metric = b.getAttribute("data-open-metric");
      paintHome();
    });
  });
  document.querySelectorAll("[data-open-group]").forEach(function (b) {
    b.addEventListener("click", function () {
      openChart.group = b.getAttribute("data-open-group");
      paintHome();
    });
  });
  if ($("q")) $("q").addEventListener("input", refresh);
  var daysTh = document.querySelector("thead th[data-sort=days]");
  if (daysTh) {
    daysTh.addEventListener("click", function () {
      queueState.sortDir = queueState.sortDir === "desc" ? "asc" : "desc";
      paintQueue();
    });
  }
  if ($("clearBtn")) {
    $("clearBtn").addEventListener("click", function () {
      if (lo) {
        lo.classList.remove("on");
        lo.setAttribute("aria-pressed", "false");
      }
      document.querySelectorAll(".menu-pop input[type=checkbox]").forEach(function (c) {
        c.checked = false;
      });
      if ($("q")) $("q").value = "";
      saveBuilders();
      refresh();
    });
  }
  var list = $("tbody");
  if (list) {
    list.addEventListener("click", function (e) {
      var tr = e.target.closest("tr");
      if (!tr || !tr.getAttribute("data-id")) return;
      queueState.selected = tr.getAttribute("data-id");
      paintQueue();
    });
  }
  refresh();
})();
