(function () {
  var URL = "https://cuxjgqpvkuicovvkxwsg.supabase.co";
  var KEY = "sb_publishable_qkSJU8DR-XPrcZyNIhqpaA_DnYlPwmG";
  if (!window.supabase) return;
  var sb = window.supabase.createClient(URL, KEY);
  var loginBox = document.getElementById("login-box");
  var modBox = document.getElementById("mod-box");
  var liste = document.getElementById("mod-liste");
  var filtre = "pending";
  var LBL = { pending: "En attente", piste_serieuse: "Piste sérieuse", contestee: "Contestée", ecartee: "Écartée" };
  function esc(s){ return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); }

  async function show() {
    var s = await sb.auth.getSession();
    if (s.data.session) { loginBox.hidden = true; modBox.hidden = false; charger(); }
    else { loginBox.hidden = false; modBox.hidden = true; }
  }

  document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = new FormData(e.target);
    var msg = document.getElementById("login-msg");
    var r = await sb.auth.signInWithPassword({ email: f.get("email"), password: f.get("password") });
    if (r.error) { msg.hidden = false; msg.className = "hyp-msg err"; msg.textContent = "Connexion impossible : " + r.error.message; }
    else show();
  });
  document.getElementById("logout").addEventListener("click", async function () { await sb.auth.signOut(); show(); });
  document.querySelectorAll("#mod-filtres .chip").forEach(function (c) {
    c.addEventListener("click", function () {
      document.querySelectorAll("#mod-filtres .chip").forEach(function (x){ x.setAttribute("aria-pressed","false"); });
      c.setAttribute("aria-pressed","true"); filtre = c.dataset.f; charger();
    });
  });

  async function charger() {
    liste.innerHTML = '<p class="hyp-vide">Chargement…</p>';
    var q = sb.from("hypotheses").select("*").order("created_at", { ascending: false });
    if (filtre === "pending") q = q.eq("statut", "pending");
    var r = await q;
    if (r.error) { liste.innerHTML = '<p class="hyp-vide">Erreur : ' + esc(r.error.message) + '</p>'; return; }
    if (!r.data.length) { liste.innerHTML = '<p class="hyp-vide">Rien à modérer.</p>'; return; }
    liste.innerHTML = r.data.map(function (h) {
      var d = new Date(h.created_at).toLocaleString("fr-FR");
      return '<article class="hyp-carte" data-id="' + h.id + '">'
        + '<div class="hyp-haut"><span class="hyp-statut s-' + h.statut + '">' + (LBL[h.statut]||h.statut) + '</span>'
        + '<span class="hyp-meta">' + esc(h.dossier_titre || h.dossier_slug) + ' — ' + esc(h.pseudo) + ' · ' + d + '</span></div>'
        + '<p class="hyp-texte">' + esc(h.texte) + '</p>'
        + (h.source ? '<p class="hyp-src">Source : ' + esc(h.source) + '</p>' : '')
        + '<div class="mod-actions">'
        + '<button class="btn act" data-a="piste_serieuse">Publier</button> '
        + '<button class="btn-ghost act" data-a="contestee">Contestée</button> '
        + '<button class="btn-ghost act" data-a="ecartee">Écarter</button> '
        + '<button class="btn-ghost act" data-a="delete">Supprimer</button>'
        + '</div></article>';
    }).join("");
  }

  liste.addEventListener("click", async function (e) {
    var b = e.target.closest(".act"); if (!b) return;
    var carte = b.closest(".hyp-carte"); var id = carte.dataset.id; var a = b.dataset.a;
    carte.querySelectorAll(".act").forEach(function (x){ x.disabled = true; });
    var r = (a === "delete") ? await sb.from("hypotheses").delete().eq("id", id)
                             : await sb.from("hypotheses").update({ statut: a }).eq("id", id);
    if (r.error) { alert("Erreur : " + r.error.message); carte.querySelectorAll(".act").forEach(function (x){ x.disabled = false; }); }
    else charger();
  });

  sb.auth.onAuthStateChange(function () { show(); });
  show();
})();
