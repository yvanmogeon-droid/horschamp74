(function () {
  var SUPABASE_URL = "https://cuxjgqpvkuicovvkxwsg.supabase.co";
  var SUPABASE_KEY = "sb_publishable_qkSJU8DR-XPrcZyNIhqpaA_DnYlPwmG";
  if (!window.supabase) return;
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  var root = document.getElementById("registre");
  if (!root) return;
  var slug = root.dataset.slug, titre = root.dataset.titre;
  var liste = document.getElementById("hyp-liste");
  var LBL = { piste_serieuse: "Piste sérieuse", contestee: "Contestée", ecartee: "Écartée" };

  function esc(s){ return (s||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); }

  async function charger() {
    var r = await sb.from("hypotheses")
      .select("id,texte,pseudo,source,statut,soutiens,created_at")
      .eq("dossier_slug", slug).neq("statut","pending")
      .order("created_at",{ascending:true});
    if (r.error) { liste.innerHTML = '<p class="hyp-vide">Impossible de charger les hypothèses pour le moment.</p>'; return; }
    var data = r.data || [];
    if (!data.length) { liste.innerHTML = '<p class="hyp-vide">Personne n\'a encore trouvé. Sois le premier à proposer une hypothèse.</p>'; return; }
    liste.innerHTML = data.map(function (h) {
      var d = new Date(h.created_at).toLocaleDateString("fr-FR");
      var src = h.source ? '<p class="hyp-src">Source : '+esc(h.source)+'</p>' : '';
      return '<article class="hyp-carte">'
        + '<div class="hyp-haut"><span class="hyp-statut s-'+h.statut+'">'+(LBL[h.statut]||"")+'</span>'
        + '<span class="hyp-meta">'+esc(h.pseudo)+' · '+d+'</span></div>'
        + '<p class="hyp-texte">'+esc(h.texte)+'</p>'+src
        + '<button class="hyp-soutenir" data-id="'+h.id+'">Soutenir · <b>'+(h.soutiens||0)+'</b></button>'
        + '</article>';
    }).join("");
  }

  liste.addEventListener("click", async function (e) {
    var b = e.target.closest(".hyp-soutenir"); if (!b) return;
    b.disabled = true;
    var r = await sb.rpc("soutenir", { hid: b.dataset.id });
    if (!r.error) { var bb = b.querySelector("b"); bb.textContent = (parseInt(bb.textContent,10)||0)+1; }
    else b.disabled = false;
  });

  var form = document.getElementById("hyp-form");
  var msg = document.getElementById("hyp-msg");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var f = new FormData(form);
    var row = { dossier_slug: slug, dossier_titre: titre,
      texte: (f.get("texte")||"").trim(), pseudo: (f.get("pseudo")||"").trim(),
      source: ((f.get("source")||"").trim() || null), statut: "pending" };
    if (!row.texte || !row.pseudo) return;
    var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
    var r = await sb.from("hypotheses").insert(row);
    msg.hidden = false;
    if (r.error) { msg.textContent = "Oups, l'envoi a échoué. Réessaie."; msg.className = "hyp-msg err"; btn.disabled = false; }
    else { form.reset(); msg.textContent = "Merci ! Ton hypothèse a bien été envoyée. Elle sera vérifiée avant d'apparaître sur le dossier."; msg.className = "hyp-msg ok"; btn.disabled = false; }
  });

  charger();
})();
