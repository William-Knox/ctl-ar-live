/* Hyphen review · Thursday 2026-08-20. Signed frame. Actions toast only — do not post. */
(function () {
  "use strict";
  var START_ID = "0428-170954";

  var LEDGER_LABS = {
    "Called in": 1,
    "Report transmittal": 1,
    "Invoiced": 1,
    "Inquiry": 1,
    "Replied": 1,
    "Paid": 1,
    "Completed": 1,
    "Notes entered": 1,
    "Today": 1
  };
  var KEEP_LEFTOVER = { "0508-171401": 1, "0506-171278": 1 };
  var LOCKED_TREE = {
    "Leftover lab": 1,
    "Quantity shortfall": 1,
    "Notes error": 1,
    "Amount off": 1,
    "Write-off": 1,
    "Unpaid complete": 1,
    "No PO": 1,
    "Paid to apply": 1
  };
  var BUILDERS = [
    { value: "LENNAR HOMES", label: "Lennar" },
    { value: "MHI HOMES", label: "MHI" },
    { value: "Toll Brothers, Inc.", label: "Toll" },
    { value: "K. Hovnanian of Houston", label: "K. Hovnanian" },
    { value: "TriPointe Homes", label: "TriPointe Homes" }
  ];
  var ISSUES = [
    "Leftover lab",
    "Quantity shortfall",
    "Notes error",
    "Amount off",
    "Write-off",
    "Unpaid complete",
    "No PO",
    "Paid to apply"
  ];

  function isLeftoverSet(issue, billed, open) {
    if (issue === "Leftover lab" || issue === "Quantity shortfall" || issue === "Notes error" || issue === "Amount off") return true;
    if (issue === "Write-off" && Number(billed) > Number(open) && Number(open) > 0) return true;
    return false;
  }
  function leftoverWalkNickname(iss) {
    var compact = String(iss || "").toLowerCase().replace(/[\s_]+/g, "");
    return compact === "billedwrong" || compact === ("fl" + "agged");
  }
  function lockIssue(raw, doc) {
    var id = String(doc || "");
    if (KEEP_LEFTOVER[id]) return "Leftover lab";
    var iss = String(raw == null ? "" : raw);
    if (LOCKED_TREE[iss]) return iss;
    if (leftoverWalkNickname(iss)) return "Write-off";
    return iss;
  }
  function signedLedger(list) {
    return (list || []).filter(function (e) {
      return e && LEDGER_LABS[e.lab];
    }).map(function (e) {
      return {
        when: e.when || "",
        lab: e.lab,
        what: e.what || "",
        today: !!(e.today || e.lab === "Today")
      };
    });
  }
  function todayWhat(open, days) {
    return "Open " + money(open) + ". " + days + " days past due.";
  }
  function ensureToday(list, open, days) {
    var what = todayWhat(open, days);
    var out = (list || []).map(function (e) {
      if (e.today || e.lab === "Today") {
        return { when: "Today", lab: "Today", what: what, today: true };
      }
      return e;
    });
    if (!out.some(function (e) { return e.today || e.lab === "Today"; })) {
      out.push({ when: "Today", lab: "Today", what: what, today: true });
    }
    return out;
  }
  function stripTimeline(s) {
    s = String(s == null ? "" : s);
    var i = s.search(/Timeline of Events/i);
    if (i >= 0) s = s.slice(0, i);
    s = s.replace(/\s*If you have any questions[\s\S]*$/i, "");
    s = s.replace(/\s*please feel free[\s\S]*$/i, "");
    return s.replace(/\s+$/g, "").trim();
  }
  function isTimelineDump(s) {
    s = String(s == null ? "" : s);
    if (!/Timeline of Events/i.test(s)) return false;
    return s.split(/\n/).length > 2 || /Called in|Invoiced|Report transmittal/i.test(s);
  }
  function standingPara(r) {
    var lead = stripTimeline(r.letterLead || "");
    if (lead) return lead;
    var paras = r.paras || [];
    var i, p;
    for (i = 0; i < paras.length; i++) {
      p = String(paras[i] || "").trim();
      if (!p) continue;
      if (isTimelineDump(p)) continue;
      if (/feel free/i.test(p)) continue;
      p = stripTimeline(p);
      if (p) return p;
    }
    var raw = stripTimeline(r.letter || "");
    if (!raw) return "";
    return raw.split(/\n\n+/)[0].trim();
  }
  function letterAllowed(issue, mail, letter) {
    if (!letter) return false;
    if (issue === "Paid to apply" || issue === "Write-off") return false;
    if (mail === "awaiting") return false;
    if (/^Do not send a builder letter/i.test(letter)) return false;
    return true;
  }
  function mapRow(d) {
    var issue = lockIssue(d.issue, d.docNumber);
    var billed = Number(d.totalAmt) || 0;
    var open = Number(d.balance != null ? d.balance : d.open_balance) || 0;
    var leftover = d.leftover_set === true || isLeftoverSet(issue, billed, open);
    var hyphen;
    if (issue === "Unpaid complete") hyphen = "unpaid";
    else if (d.status === "partial") hyphen = "short";
    else if (d.found) hyphen = "found";
    else hyphen = "notfound";
    var letter = d.chase_letter || "";
    return {
      id: d.docNumber,
      days: Number(d.daysPastDue) || 0,
      open: open,
      billed: billed,
      community: d.customer || "",
      addr: d.service_address || "",
      parent: d.parent || "",
      hyphen: hyphen,
      issue: issue,
      mail: d.mail || "not_sent",
      packet: d.packet || "hold",
      leftover: leftover,
      po: d.builder_order_number || "",
      due: d.dueDate || "",
      analysis: d.chase_analysis || "",
      ledger: ensureToday(signedLedger(d.ledger || d.chase_timeline || []), open, Number(d.daysPastDue) || 0),
      letter: letter,
      letterLead: d.chase_letter_lead || "",
      letterOk: letterAllowed(issue, d.mail || "not_sent", letter),
      subject: d.chase_subject || "",
      fromName: d.chase_from_name || d.chase_from || "",
      fromEmail: d.chase_from || "",
      toName: d.chase_to_name || "",
      toEmail: d.chase_to || "",
      cc: d.chase_cc || [],
      last_sent: d.last_sent || d.chase_last_sent || "",
      attachments: d.chase_attachments || [],
      paras: d.chase_letter_paras || [],
      close: d.chase_letter_close || ""
    };
  }

  var DATA = (window.DATA || []).map(mapRow);
  var leftoverN = DATA.filter(function (r) { return r.leftover; }).length;

  var state = {
    box: "chase",
    leftover: false,
    search: "",
    why: new Set(),
    days: new Set(),
    builders: new Set(),
    hyphen: new Set(),
    selected: START_ID,
    sortKey: "days",
    sortDir: "desc"
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function money(n) {
    return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
  }
  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove("on"); }, 3200);
  }
  function dayBucket(d) {
    if (d <= 15) return "0-15";
    if (d <= 30) return "16-30";
    return "30+";
  }
  function inBox(r) {
    if (state.box === "chase") return r.mail !== "awaiting";
    if (state.box === "apply") return r.issue === "Paid to apply";
    if (state.box === "writeoff") return r.issue === "Write-off" && r.mail !== "awaiting";
    if (state.box === "awaiting") return r.mail === "awaiting";
    return false;
  }
  function boxCount(box) {
    var prev = state.box;
    state.box = box;
    var n = DATA.filter(inBox).length;
    state.box = prev;
    return n;
  }
  function filtered() {
    var q = state.search.trim().toLowerCase();
    return DATA.filter(function (r) {
      if (!inBox(r)) return false;
      if (state.leftover && !r.leftover) return false;
      if (state.why.size && !state.why.has(r.issue)) return false;
      if (state.days.size && !state.days.has(dayBucket(r.days))) return false;
      if (state.builders.size && !state.builders.has(r.parent)) return false;
      if (state.hyphen.size && !state.hyphen.has(r.hyphen)) return false;
      if (q) {
        var blob = (r.id + " " + r.addr + " " + r.community + " " + r.parent + " " + r.issue).toLowerCase();
        if (blob.indexOf(q) < 0) return false;
      }
      return true;
    }).slice().sort(function (a, b) {
      var ka = a[state.sortKey], kb = b[state.sortKey];
      var cmp = 0;
      if (typeof ka === "number" || typeof kb === "number") cmp = (Number(ka) || 0) - (Number(kb) || 0);
      else cmp = String(ka || "").localeCompare(String(kb || ""));
      return state.sortDir === "desc" ? -cmp : cmp;
    });
  }
  function pickStart(rows) {
    if (!rows.length) return "";
    if (rows.some(function (r) { return r.id === START_ID; })) return START_ID;
    var i, r;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (r.ledger.length && r.letterOk) return r.id;
    }
    for (i = 0; i < rows.length; i++) {
      if (rows[i].ledger.length) return rows[i].id;
    }
    return rows[0].id;
  }
  function rowBy(id) {
    return DATA.filter(function (r) { return r.id === id; })[0];
  }
  function footerMode(r) {
    if (!r.analysis) return "empty";
    if (state.box === "awaiting" || r.mail === "awaiting") return "awaiting";
    if (state.box === "apply" || r.issue === "Paid to apply") return "pta";
    if (state.box === "writeoff" || r.issue === "Write-off") return "writeoff";
    if (r.letterOk) return "draft";
    return "hold";
  }
  function showEsme(r) {
    return r.issue === "Write-off" && !!r.analysis;
  }
  function showLetterCol(r) {
    if (showEsme(r)) return true;
    if (r.letterOk) return true;
    if (r.mail === "awaiting" && !!(r.letter || r.letterLead || (r.paras && r.paras.length))) return true;
    return false;
  }

  function erowsHtml(list) {
    return (list || []).map(function (e) {
      return '<div class="erow' + (e.today ? " today" : "") + '">' +
        '<div class="when">' + esc(e.when) + "</div>" +
        '<div class="lab">' + esc(e.lab) + "</div>" +
        '<div class="what">' + esc(e.what) + "</div></div>";
    }).join("");
  }
  function letterMeta(r) {
    var to = (r.toName ? r.toName + " · " : "") + (r.toEmail || "");
    var fr = (r.fromName ? r.fromName + " · " : "") + (r.fromEmail || "billings@coastaltestinglabs.com");
    var cc = (r.cc || []).map(function (c) { return c.name || c.email; }).filter(Boolean).join(", ");
    return '<div class="meta">' +
      "<div><b>From</b> " + esc(fr) + "</div>" +
      "<div><b>To</b> " + esc(to || "—") + "</div>" +
      (r.subject ? "<div><b>Subj</b> " + esc(r.subject) + "</div>" : "") +
      (cc ? "<div><b>CC</b> " + esc(cc) + "</div>" : "") +
      "</div>";
  }
  function closeNeed(issue) {
    if (issue === "No PO") return "a PO";
    if (issue === "Unpaid complete") return "payment";
    if (issue === "Leftover lab" || issue === "Quantity shortfall" || issue === "Amount off" || issue === "Notes error") return "an EPO";
    return "payment";
  }
  function fallbackClose(r) {
    return "If you have any questions or concerns about the work at " +
      (r.addr || "") + ", the " + money(r.open) + " invoice, or " +
      closeNeed(r.issue) + ", reply to this email. We will work it with you from there.";
  }
  function letterClose(r) {
    var c = String(r.close || "").replace(/\s+/g, " ").trim();
    if (c && !/feel free/i.test(c)) return c;
    return fallbackClose(r);
  }
  function letterAskAndLedger(r) {
    var standing = standingPara(r);
    var closer = letterClose(r);
    return (standing ? "<p>" + esc(standing) + "</p>" : "") +
      '<div class="tl-h">Timeline of Events</div>' +
      '<div class="tl">' + erowsHtml(r.ledger) + "</div>" +
      (closer ? "<p>" + esc(closer) + "</p>" : "") +
      '<div class="sig"><b>Billings</b><span>billings@coastaltestinglabs.com</span></div>';
  }
  function letterHtml(r) {
    if (showEsme(r)) {
      return '<span class="kind esme">Esme · not sent</span>' +
        '<div class="meta"><b>From</b> William Knox · william@coastaltestinglabs.com<br>' +
        "<b>To</b> Esmeralda · esmeralda@coastaltestinglabs.com<br>No builder CC. Not a builder letter.</div>" +
        "<p>" + esc(r.id) + " · " + esc(r.parent) + " · " + esc(r.community) + " · " + money(r.open) + " open</p>" +
        "<p>" + esc(r.analysis) + "</p>" +
        '<div class="sig"><b>William Knox</b><span>william@coastaltestinglabs.com</span></div>';
    }
    if (r.letterOk) {
      return '<span class="kind">Builder · not sent</span>' + letterMeta(r) + letterAskAndLedger(r);
    }
    if (r.mail === "awaiting" && (r.letter || r.letterLead || (r.paras && r.paras.length))) {
      return '<span class="kind sent">Already sent</span>' + letterMeta(r) + letterAskAndLedger(r);
    }
    return "";
  }
  function footerHtml(r) {
    var mode = footerMode(r);
    var btns = "";
    var note = "";
    if (mode === "empty") {
      btns = '<button class="act ghost" type="button" id="cHold">Hold</button>' +
        '<button class="act ghost" type="button" id="cNext">Next</button>';
      note = "Hold. Empty analysis stays Hold. Do not invent.";
    } else if (mode === "awaiting") {
      btns = '<button class="act ghost" type="button" id="cHold">Hold</button>' +
        '<button class="act ghost" type="button" id="cNext">Next</button>';
      note = "Awaiting. Hold / Next only. No Send now.";
    } else if (mode === "pta") {
      btns = '<button class="act ghost" type="button" id="cHold">Hold</button>' +
        '<button class="act ghost" type="button" id="cNext">Next</button>';
      note = "Paid to apply. No Draft. No Send now.";
    } else if (mode === "writeoff") {
      btns = '<button class="act primary" type="button" id="cDraft">Put in Drafts</button>' +
        '<button class="act ghost" type="button" id="cHold">Hold</button>' +
        '<button class="act ghost" type="button" id="cNext">Next</button>';
      note = "Write-off. Esme note — compact Put in Drafts. No builder letter. We do not write off in QBO.";
    } else if (mode === "draft") {
      btns = '<div class="split">' +
        '<button class="act primary" type="button" id="cDraft">Put in Drafts</button>' +
        '<button class="act primary split-arrow" type="button" id="cMore" aria-haspopup="menu" aria-expanded="false" aria-label="More send options">▾</button>' +
        '<div class="split-menu" id="cReadyMenu" hidden>' +
        '<button type="button" class="send" id="cSend">Send now<span class="hint">Sends this letter from billings@. Does not wait in Drafts.</span></button>' +
        "</div></div>" +
        '<button class="act ghost" type="button" id="cHold">Hold</button>' +
        '<button class="act ghost" type="button" id="cNext">Next</button>';
      note = "Unsent chase. Draft split. Put in Drafts + Send now.";
    } else {
      btns = '<button class="act ghost" type="button" id="cHold">Hold</button>' +
        '<button class="act ghost" type="button" id="cNext">Next</button>';
      note = "Hold / Next.";
    }
    return '<div class="acts">' + btns + '<p class="act-note">' + esc(note) + "</p></div>";
  }
  function bindFooter(r, rows) {
    function goNext() {
      var idx = -1;
      rows.forEach(function (x, i) { if (x.id === r.id) idx = i; });
      if (idx >= 0 && idx < rows.length - 1) {
        state.selected = rows[idx + 1].id;
        render();
      } else toast("Mock only. End of this filtered queue.");
    }
    function goPrev() {
      var idx = -1;
      rows.forEach(function (x, i) { if (x.id === r.id) idx = i; });
      if (idx > 0) {
        state.selected = rows[idx - 1].id;
        render();
      }
    }
    if ($("casePrev")) $("casePrev").addEventListener("click", goPrev);
    if ($("caseNext")) $("caseNext").addEventListener("click", goNext);
    if ($("cHold")) $("cHold").addEventListener("click", function () { toast("Mock only. Hold."); });
    if ($("cNext")) $("cNext").addEventListener("click", goNext);
    if ($("cDraft")) $("cDraft").addEventListener("click", function () {
      toast(r.issue === "Write-off" ? "Mock only. Esme note put in Drafts. No builder letter." : "Mock only. Put in Drafts.");
    });
    if ($("cMore")) $("cMore").addEventListener("click", function () {
      var m = $("cReadyMenu");
      m.hidden = !m.hidden;
      $("cMore").setAttribute("aria-expanded", m.hidden ? "false" : "true");
    });
    if ($("cSend")) $("cSend").addEventListener("click", function () {
      $("cReadyMenu").hidden = true;
      toast("Mock only. Send now.");
    });
  }

  function renderList(rows) {
    var wrap = $("list");
    var body = rows.map(function (r, i) {
      return '<tr class="' + (i % 2 ? "alt" : "") + (r.id === state.selected ? " sel" : "") + '" data-id="' + esc(r.id) + '">' +
        '<td class="num"><span class="dpd' + (r.days > 0 ? " late" : "") + '">' + r.days + "</span></td>" +
        '<td class="inv">' + esc(r.id) + "</td>" +
        '<td class="addr">' + esc(r.addr) + "</td>" +
        '<td><span class="pill why">' + esc(r.issue) + "</span></td>" +
        '<td class="num money">' + money(r.open) + "</td></tr>";
    }).join("");
    wrap.innerHTML =
      '<table id="grid"><thead><tr>' +
      '<th class="num w-dpd">Days</th>' +
      "<th class=\"w-inv\">Invoice</th>" +
      "<th>Address</th>" +
      '<th class="w-why">Issue</th>' +
      '<th class="num w-open">Open $</th>' +
      "</tr></thead><tbody id=\"tbody\">" + body + "</tbody></table>" +
      (rows.length ? "" : '<div class="empty-state">No invoices match these filters.</div>');
  }

  function renderCase(rows) {
    var el = $("case");
    var r = rows.filter(function (x) { return x.id === state.selected; })[0];
    if (!r) {
      el.innerHTML = '<div class="note missing">No invoice in this filtered queue.</div>';
      return;
    }
    var idx = rows.indexOf(r);
    var hasLed = r.ledger.length > 0;
    var hasLet = showLetterCol(r);
    var letterInner = letterHtml(r);
    var analysis = r.analysis
      ? '<p class="note"><b>Analysis.</b> ' + esc(r.analysis) + "</p>"
      : '<p class="note missing"><b>No analysis.</b> Empty analysis stays Hold. Do not invent.</p>';
    var top =
      '<div class="case-top"><div>' +
      '<div class="case-id">' + esc(r.id) + " · " + esc(r.addr) + "</div>" +
      '<div class="case-sub">' + esc(r.parent) + " · " + esc(r.community) + " · " + money(r.open) + " open · " +
      '<span class="dpd' + (r.days > 0 ? " late" : "") + '">' + r.days + "</span> days past due</div></div>" +
      '<div class="case-nav">' +
      '<button type="button" id="casePrev"' + (idx <= 0 ? " disabled" : "") + ">Prev</button>" +
      '<button type="button" id="caseNext"' + (idx >= rows.length - 1 ? " disabled" : "") + ">Next</button>" +
      "</div></div>";

    var cols = [];
    if (hasLed) {
      cols.push('<div class="col"><div class="sec-h">Timeline of Events</div><div class="card">' + erowsHtml(r.ledger) + "</div></div>");
    }
    if (hasLet) {
      var rlab = showEsme(r) ? "Esme note" : "Letter";
      cols.push('<div class="col"><div class="sec-h">' + rlab + '</div><div class="card letter">' + letterInner + "</div></div>");
    }
    var cls = "case-body" + (cols.length === 1 ? " one" : "") + (cols.length === 0 ? " empty" : "");
    var body = '<div class="' + cls + '">' + cols.join("") + "</div>";

    el.innerHTML = top + analysis + body + footerHtml(r);
    bindFooter(r, rows);
  }

  function refreshChrome(rows) {
    $("countN").textContent = String(rows.length);
    var open = rows.reduce(function (s, r) { return s + r.open; }, 0);
    $("countOpen").textContent = money(open);
    $("loN").textContent = String(leftoverN);
    $("loChip").classList.toggle("on", state.leftover);
    $("loChip").setAttribute("aria-pressed", state.leftover ? "true" : "false");
    document.querySelectorAll(".seg button[data-box]").forEach(function (b) {
      var on = b.getAttribute("data-box") === state.box;
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if ($("nChase")) $("nChase").textContent = String(boxCount("chase"));
    if ($("nApply")) $("nApply").textContent = String(boxCount("apply"));
    if ($("nWrite")) $("nWrite").textContent = String(boxCount("writeoff"));
    if ($("nAwait")) $("nAwait").textContent = String(boxCount("awaiting"));
    var asof = $("asof");
    var boxLab = { chase: "Chase", apply: "Apply", writeoff: "Write-off", awaiting: "Awaiting" }[state.box];
    asof.textContent = boxLab + " · Thursday 2026-08-20";
    var issueCounts = {};
    DATA.filter(inBox).forEach(function (r) {
      issueCounts[r.issue] = (issueCounts[r.issue] || 0) + 1;
    });
    document.querySelectorAll('.menu[data-menu="why"] label').forEach(function (lab) {
      var inp = lab.querySelector("input");
      var n = lab.querySelector(".n");
      if (inp && n) n.textContent = String(issueCounts[inp.value] || 0);
    });
    var dirty = state.leftover || state.search || state.why.size || state.days.size || state.builders.size || state.hyphen.size;
    $("clearBtn").classList.toggle("show", !!dirty);
    document.querySelectorAll(".menu").forEach(function (m) {
      var name = m.getAttribute("data-menu");
      var on = false;
      if (name === "why") on = state.why.size > 0;
      if (name === "days") on = state.days.size > 0;
      if (name === "builder") on = state.builders.size > 0;
      if (name === "more") on = state.hyphen.size > 0;
      m.querySelector(".menu-btn").classList.toggle("on", on);
    });
  }

  function render() {
    var rows = filtered();
    if (!rows.some(function (r) { return r.id === state.selected; })) {
      state.selected = pickStart(rows);
    }
    refreshChrome(rows);
    renderList(rows);
    renderCase(rows);
    if (state.selected) {
      try { history.replaceState(null, "", "#" + state.selected); } catch (e) {}
    }
  }

  function closeMenus() {
    document.querySelectorAll(".menu-pop").forEach(function (p) { p.hidden = true; });
  }

  function boot() {
    var hash = (location.hash || "").replace("#", "");
    if (hash && DATA.some(function (r) { return r.id === hash; })) state.selected = hash;
    else state.selected = pickStart(filtered());

    $("q").addEventListener("input", function () { state.search = this.value; render(); });
    $("loChip").addEventListener("click", function () {
      state.leftover = !state.leftover;
      render();
    });
    $("clearBtn").addEventListener("click", function () {
      state.search = "";
      state.leftover = false;
      state.why.clear();
      state.days.clear();
      state.builders.clear();
      state.hyphen.clear();
      $("q").value = "";
      document.querySelectorAll(".menu-pop input[type=checkbox]").forEach(function (c) { c.checked = false; });
      render();
    });
    document.querySelectorAll(".seg button[data-box]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.box = b.getAttribute("data-box");
        render();
      });
    });
    document.querySelectorAll(".menu-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var pop = btn.parentElement.querySelector(".menu-pop");
        var open = !pop.hidden;
        closeMenus();
        pop.hidden = open;
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".menu")) closeMenus();
    });
    document.querySelectorAll(".menu-pop input[type=checkbox]").forEach(function (box) {
      box.addEventListener("change", function () {
        var v = box.value;
        if (box.hasAttribute("data-hy")) {
          if (box.checked) state.hyphen.add(v); else state.hyphen.delete(v);
        } else {
          var menu = box.closest(".menu").getAttribute("data-menu");
          var set = menu === "why" ? state.why : menu === "days" ? state.days : state.builders;
          if (box.checked) set.add(v); else set.delete(v);
        }
        render();
      });
    });
    document.querySelectorAll(".menu-foot .all").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var menu = btn.closest(".menu");
        var boxes = menu.querySelectorAll("input[type=checkbox]");
        var select = btn.getAttribute("data-select");
        var which = select || btn.getAttribute("data-clear");
        var on = !!select;
        boxes.forEach(function (c) { c.checked = on; });
        if (which === "why") {
          state.why.clear();
          if (on) boxes.forEach(function (c) { state.why.add(c.value); });
        }
        if (which === "days") {
          state.days.clear();
          if (on) boxes.forEach(function (c) { state.days.add(c.value); });
        }
        if (which === "builders") {
          state.builders.clear();
          if (on) boxes.forEach(function (c) { state.builders.add(c.value); });
        }
        if (which === "more") {
          state.hyphen.clear();
          if (on) boxes.forEach(function (c) { state.hyphen.add(c.value); });
        }
        render();
      });
    });
    $("list").addEventListener("click", function (e) {
      var node = e.target.closest("tr");
      if (!node) return;
      var id = node.getAttribute("data-id");
      if (!id) return;
      state.selected = id;
      render();
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
