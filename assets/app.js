// Con-DSO project page: headline numbers, ATE explorer (Table I), ablation (Table II), YouTube facade. No dependencies.
(function () {
  "use strict";
  var D = window.CONDSO;
  if (!D) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var OURS = "Con-DSO", BASE = "RGBD-DSO";
  var digits = function (unit) { return unit === "cm" ? 2 : 3; };

  var tip = el("div", { class: "tip", role: "tooltip", hidden: "" });
  document.body.appendChild(tip);
  var hideTip = function () { tip.hidden = true; };
  window.addEventListener("scroll", hideTip, { passive: true });
  function hover(node, html) {
    var show = function () {
      tip.innerHTML = html; tip.hidden = false;
      var r = node.getBoundingClientRect();
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 12, Math.max(12, r.left)) + "px";
      tip.style.top = (r.bottom + 8 + tip.offsetHeight > window.innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + "px";
    };
    node.addEventListener("mouseenter", show); node.addEventListener("focus", show);
    node.addEventListener("mouseleave", hideTip); node.addEventListener("blur", hideTip);
  }
  // items: [{name, v, ours, note}]; sorted lower-is-better unless keepOrder
  function bars(box, items, dg, unit, keepOrder) {
    box.innerHTML = "";
    if (!keepOrder) items = items.slice().sort(function (a, b) { return a.v - b.v; });
    var max = Math.max.apply(null, items.map(function (x) { return x.v; })) || 1;
    items.forEach(function (x, i) {
      var row = el("div", { class: "bar-row" + (x.ours ? " ours" : ""), tabindex: "0" },
        '<span class="bar-name">' + esc(x.name) + '</span><span class="bar-track"><span class="bar" style="width:' + Math.max(0.6, 100 * x.v / max).toFixed(1) + '%"></span></span><span class="bar-val">' + x.v.toFixed(dg) + "</span>");
      hover(row, "<strong>" + esc(x.name) + "</strong>: " + x.v.toFixed(dg) + " " + unit + (!keepOrder && i === 0 ? " · lowest" : "") + (x.note ? "<br>" + esc(x.note) : ""));
      box.appendChild(row);
    });
    return items;
  }
  function chips(container, opts, get, set) {
    container.innerHTML = "";
    opts.forEach(function (o) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": String(get() === o[0]) }, esc(o[1]));
      b.addEventListener("click", function () { set(o[0]); });
      container.appendChild(b);
    });
  }

  // ---- headline (computed from Table I averages) ----
  var names = Object.keys(D.datasets);
  var red = {};
  names.forEach(function (g) { var a = D.datasets[g].avg; red[g] = 100 * (1 - a[OURS] / a[BASE]); });
  var lower = names.filter(function (g) { return red[g] > 0; }).length;
  [[lower + " / " + names.length, "benchmarks where Con-DSO has a lower average ATE than RGBD-DSO"],
   ["−" + Math.round(red["RGB-D Scenes V2"]) + "%", "average ATE vs RGBD-DSO on RGB-D Scenes V2 (unreliable depth)"],
   ["−" + Math.round(red["TUM RGB-D"]) + "%", "average ATE vs RGBD-DSO on TUM RGB-D dynamic sequences"],
   [D.runtime_ms[0].toFixed(0) + "–" + D.runtime_ms[1].toFixed(0) + " ms", "per frame across the evaluated datasets"]].forEach(function (h) {
    $("#headline").appendChild(el("div", {}, "<dt>" + esc(h[0]) + "</dt><dd>" + esc(h[1]) + "</dd>"));
  });

  // ---- ATE explorer ----
  var ds = "TUM RGB-D", seq = "avg";
  names.forEach(function (g) {
    var b = el("button", { type: "button", class: "tab", role: "tab", "data-d": g }, esc(g));
    b.addEventListener("click", function () { ds = g; seq = "avg"; draw(); });
    $("#ds-tabs").appendChild(b);
  });
  function draw() {
    var d = D.datasets[ds], unit = d.unit, dg = digits(unit);
    $("#ds-tabs").querySelectorAll(".tab").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.d === ds)); });
    chips($("#seq-tabs"), [["avg", "Average"]].concat(Object.keys(d.seqs).map(function (s) { return [s, s]; })), function () { return seq; }, function (v) { seq = v; draw(); });
    var row = seq === "avg" ? d.avg : d.seqs[seq];
    var missing = D.methods.filter(function (m) { return row[m] === null; });
    var items = D.methods.filter(function (m) { return row[m] !== null; }).map(function (m) {
      return { name: m, v: row[m], ours: m === OURS, note: m === "SR-SLAM" || m === "ORB-SLAM3" ? "full SLAM with loop closure" : "" };
    });
    var sorted = bars($("#ate-chart .bars"), items, dg, unit);
    $("#ate-title").textContent = "ATE RMSE · " + ds + " · " + (seq === "avg" ? (ds === "OpenLORIS" ? "average of the three complete sequences" : "average") : seq);
    $("#ate-sub").textContent = unit + " · lower is better" + (missing.length ? " · not reported: " + missing.join(", ") + (ds === "OpenLORIS" && (seq === "home") ? " (RGBD-DSO tracks only 20% of frames)" : "") : "");
    var ours = row[OURS], best = sorted.filter(function (x) { return x.name !== OURS; })[0];
    var good = ours <= best.v;
    var vsBase = row[BASE] !== null ? " · vs RGBD-DSO " + row[BASE].toFixed(dg) + " " + unit + " (" + (ours < row[BASE] ? "−" : "+") + Math.abs(100 * (1 - ours / row[BASE])).toFixed(1) + "%)" : "";
    $("#ate-verdict").innerHTML = (good ? "Con-DSO is lowest here: " + ours.toFixed(dg) + " " + unit + " (next: " + esc(best.name) + " " + best.v.toFixed(dg) + ")" :
      "A baseline is lower here: <strong>" + esc(best.name) + "</strong> " + best.v.toFixed(dg) + " vs Con-DSO " + ours.toFixed(dg) + " " + unit) + esc(vsBase) + ".";
    $("#ate-verdict").className = "verdict " + (good ? "is-good" : "is-other");
    // full table for the dataset, best per row in bold
    var rowsT = Object.keys(d.seqs).map(function (s) { return [s, d.seqs[s]]; }).concat([["Average", d.avg]]);
    $("#ate-table").innerHTML = "<caption>ATE RMSE (" + unit + ") from Table I. Best per row in bold; – not reported." + (ds === "OpenLORIS" ? " Average over cafe, office and market (complete for all methods)." : "") + "</caption><thead><tr><th>Sequence</th>" +
      D.methods.map(function (m) { return "<th>" + esc(m) + "</th>"; }).join("") + "</tr></thead><tbody>" + rowsT.map(function (r) {
        var vals = D.methods.map(function (m) { return r[1][m]; }).filter(function (v) { return v !== null; });
        var mn = Math.min.apply(null, vals);
        return '<tr class="' + (r[0] === "Average" ? "group" : "") + '"><td>' + esc(r[0]) + "</td>" + D.methods.map(function (m) {
          var v = r[1][m]; if (v === null) return '<td class="numc">–</td>';
          var s = v.toFixed(dg); return '<td class="numc">' + (v === mn ? "<strong>" + s + "</strong>" : s) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody>";
  }
  draw();

  // ---- ablation (rows in the paper's order) ----
  var ab = 0;
  function drawAbl() {
    chips($("#abl-tabs"), D.ablation.map(function (r, i) { return [i, r.dataset]; }), function () { return ab; }, function (v) { ab = v; drawAbl(); });
    var r = D.ablation[ab], dg = digits(r.unit);
    $("#abl-title").textContent = "Ablation · " + r.dataset + " (" + r.unit + ")";
    bars($("#abl-chart .bars"), [
      { name: "−P −W", v: r["-P-W"] },
      { name: "+P", v: r["+P"] },
      { name: "+P +W (Con-DSO)", v: r["+P+W"], ours: true }], dg, r.unit, true);
    var p = r["+P"] > r["-P-W"];
    $("#abl-note").textContent = p ? "Here pixel selection alone is worse than neither module (" + r["-P-W"].toFixed(dg) + " → " + r["+P"].toFixed(dg) + " " + r.unit + "); adding decoupled weighting gives the lowest error." :
      "Each module lowers the error; both together give the lowest error.";
  }
  drawAbl();

  // ---- YouTube facade ----
  var yt = $("#yt");
  yt.querySelector("button").addEventListener("click", function () {
    yt.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + yt.dataset.id + '?autoplay=1&rel=0" title="Con-DSO video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  });

  var links = document.querySelectorAll(".toc a");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id); }); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { so.observe(s); });
  }
  var copy = $("#copy-bib");
  copy.addEventListener("click", function () {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText($("#bibtex").textContent).then(function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); }, function () {});
  });
})();
