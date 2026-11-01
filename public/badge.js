/*
 * Gentle-during-treatment badge. Add to a product page:
 *
 *   <div data-gentle-badge data-ingredients="Aqua, Glycerin, ..."></div>
 *   <script src="https://between-cycles.vercel.app/badge.js" async></script>
 *
 * Or point at text already on the page:
 *   <div data-gentle-badge data-ingredients-from="#ingredients"></div>
 *
 * Pages that render later can call window.GentleBadge.scan().
 * Only the public ingredient text is sent; no cookies, no tracking.
 */
(function () {
  var script = document.currentScript;
  var api = (script && script.src ? new URL(script.src).origin : location.origin) + "/api/check";
  var COLORS = {
    ok: ["#e6f4ec", "#1d6b45", "✓"],
    caution: ["#fdf1dc", "#8a5300", "!"],
    avoid: ["#fbe7e5", "#a3312a", "×"],
  };
  var CSS =
    ":host{all:initial;display:block;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2a2e}" +
    ".pill{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:5px 12px 5px 5px;font:inherit;font-weight:600;cursor:pointer;text-align:left}" +
    ".dot{display:inline-grid;place-items:center;flex:none;width:22px;height:22px;border-radius:50%;color:#fff;font-size:13px}" +
    ".chev{font-weight:400;opacity:.75;text-decoration:underline;text-underline-offset:2px}" +
    ".panel{margin-top:8px;border:1px solid #e3e7e8;border-radius:14px;padding:12px 14px;background:#fff;max-width:440px}" +
    ".panel p{margin:0 0 6px}.flag{margin:10px 0 0}.flag b{display:block}.src{font-size:12px;color:#5d6b70}" +
    "a{color:inherit}.foot{margin-top:10px;font-size:12px;color:#5d6b70}";

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function render(host, r) {
    var root = host.shadowRoot || host.attachShadow({ mode: "open" });
    root.textContent = "";
    var c = COLORS[r.verdict];
    root.appendChild(el("style", {}, CSS));
    var pill = el("button", { class: "pill", type: "button", "aria-expanded": "false", style: "background:" + c[0] + ";color:" + c[1] });
    pill.appendChild(el("span", { class: "dot", style: "background:" + c[1], "aria-hidden": "true" }, c[2]));
    pill.appendChild(document.createTextNode(r.label + " "));
    pill.appendChild(el("span", { class: "chev" }, "Why?"));
    var panel = el("div", { class: "panel", hidden: "" });
    panel.appendChild(el("p", {}, r.summary));
    r.flags.forEach(function (f) {
      var d = el("div", { class: "flag" });
      d.appendChild(el("b", {}, f.name + (f.verdict === "caution" ? " (ask first)" : "")));
      d.appendChild(el("span", {}, f.reason + " "));
      var s = el("span", { class: "src" });
      f.sources.forEach(function (x, i) {
        if (i) s.appendChild(document.createTextNode(" · "));
        s.appendChild(el("a", { href: x.url, target: "_blank", rel: "noreferrer" }, x.publisher));
      });
      d.appendChild(s);
      panel.appendChild(d);
    });
    if (r.helpful.length) {
      var names = r.helpful.map(function (h) { return h.name.toLowerCase(); }).join(", ");
      panel.appendChild(el("p", { class: "flag" }, "Also has: " + names + "."));
    }
    var foot = el("div", { class: "foot" });
    foot.appendChild(document.createTextNode(r.disclaimer + " "));
    foot.appendChild(el("a", { href: r.method, target: "_blank", rel: "noreferrer" }, "How we check"));
    panel.appendChild(foot);
    pill.addEventListener("click", function () {
      var open = panel.hasAttribute("hidden");
      if (open) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
      pill.setAttribute("aria-expanded", String(open));
    });
    root.appendChild(pill);
    root.appendChild(panel);
  }

  function ingredientsFor(host) {
    var from = host.getAttribute("data-ingredients-from");
    if (from) {
      var src = document.querySelector(from);
      return src ? src.textContent : "";
    }
    return host.getAttribute("data-ingredients") || "";
  }

  function scan() {
    var hosts = document.querySelectorAll("[data-gentle-badge]:not([data-gentle-done])");
    Array.prototype.forEach.call(hosts, function (host) {
      var text = (ingredientsFor(host) || "").trim();
      if (!text) return;
      host.setAttribute("data-gentle-done", "");
      fetch(api + "?ingredients=" + encodeURIComponent(text), { credentials: "omit" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (r) { if (r && r.verdict) render(host, r); })
        .catch(function () {});
    });
  }

  window.GentleBadge = { scan: scan };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
