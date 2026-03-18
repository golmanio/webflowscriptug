window.__ug_norm = window.__ug_norm || function (s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .trim();
};
  (function () {
    const DEBUG = false;

   const norm = window.__ug_norm;

    const debounce = (fn, wait = 200) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
    };
const MIN_PARTICIPANTS = 6;
const MAX_PARTICIPANTS = 40;
const LS_KEY = "unigames_participants";
const DEFAULT_PARTICIPANTS = 10;


function deepQueryAll(selector, root = document) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 9) {
      out.push(...node.querySelectorAll(selector));
      walk(node.documentElement);
      return;
    }
    if (node.nodeType === 1) {

      out.push(...node.querySelectorAll(selector));
      const sr = node.shadowRoot;
      if (sr) {
        out.push(...sr.querySelectorAll(selector));
        sr.querySelectorAll("*").forEach(walk);
      }
    }
  };
  walk(root);
  return Array.from(new Set(out));
}

function deepFindButtonByText(label) {
  const target = norm(label);
  const buttons = deepQueryAll("button,[role='button'],a");
  return buttons.find(b => norm(b.textContent) === target && isVisible(b)) || null;
}







function clampN(n){
  n = parseInt(n, 10);
  if (!Number.isFinite(n)) n = DEFAULT_PARTICIPANTS;
  return Math.min(MAX_PARTICIPANTS, Math.max(MIN_PARTICIPANTS, n));
}

function getParticipants(){
  const raw = localStorage.getItem(LS_KEY);
  if (raw === null || raw === undefined || raw === "") {
    localStorage.setItem(LS_KEY, String(DEFAULT_PARTICIPANTS));
    return DEFAULT_PARTICIPANTS;
  }
  const v = clampN(raw);
  if (String(v) !== String(raw)) localStorage.setItem(LS_KEY, String(v));
  return v;
}

function setParticipants(n){
  const v = clampN(n);
  localStorage.setItem(LS_KEY, String(v));
  return v;
}





    let lastParticipants = getParticipants();
    let observedCard = null;
    let cardObs = null;
	let hardResetting = false;
	let tickBurstTimer = null;
	
let lastWidgetNode = null;

function isVisible(el){
  if (!el) return false;
  const r = el.getClientRects?.();
  return !!(r && r.length) &&
    getComputedStyle(el).display !== "none" &&
    getComputedStyle(el).visibility !== "hidden";
}

function isGoodActionButton(btn){
  return btn
    && !btn.closest("#participantsBox")
    && !btn.closest("#luckyOverlay")
    && isVisible(btn);
}



function remountGuidapWidget(reason = "") {
  try { console.log("[pp] remount widget", reason); } catch {}

  const widget = document.querySelector("guidap-booking-widget");
  if (!widget) return;
  const uuid = widget.getAttribute("activity-uuid");
  const fresh = document.createElement("guidap-booking-widget");
  if (uuid) fresh.setAttribute("activity-uuid", uuid);

  widget.replaceWith(fresh);
  stableRecap = null;
  observedCard = null;
  lastWidgetNode = null;
  burstTick(3500);
}
function climbAnyTree(node, predicate) {
  let cur = node;
  for (let i = 0; i < 60 && cur; i++) {
    if (cur.nodeType === 1 && predicate(cur)) return cur;
    if (cur.parentElement) {
      cur = cur.parentElement;
      continue;
    }
    const root = cur.getRootNode?.();
    if (root && root.host) {
      cur = root.host;
      continue;
    }

    cur = cur.parentNode || null;
  }
  return null;
}




function burstTick(ms = 2500) {
  const start = Date.now();
  if (tickBurstTimer) clearInterval(tickBurstTimer);

  tickBurstTimer = setInterval(() => {
    tick();
    if (Date.now() - start > ms) {
      clearInterval(tickBurstTimer);
      tickBurstTimer = null;
    }
  }, 120);

  setTimeout(tick, 0);
  setTimeout(tick, 180);
  setTimeout(tick, 420);
  setTimeout(tick, 900);
}	
	
	
function hardReset(reason = "") {
  stableRecap = null;
  try { console.log("[pp] hardReset", reason); } catch {}
  if (hardResetting) return;
  hardResetting = true;
  stableRecap = null;
  observedCard = null;

  try { cardObs && cardObs.disconnect(); } catch {}
  cardObs = null;

  try { burstObs && burstObs.disconnect(); } catch {}
  burstObs = null;

  if (burstTimer) { clearInterval(burstTimer); burstTimer = null; }
  const start = Date.now();
  if (tickBurstTimer) clearInterval(tickBurstTimer);

  tickBurstTimer = setInterval(() => {
    tick();
    if (Date.now() - start > 2500) {
      clearInterval(tickBurstTimer);
      tickBurstTimer = null;
      hardResetting = false;
    }
  }, 120);
  setTimeout(() => tick(), 0);
  setTimeout(() => tick(), 250);
  setTimeout(() => tick(), 650);
}

function isCloseCandidate(n) {
  if (!n || n.nodeType !== 1) return false;

  const el = n;
  if (el.tagName && el.tagName.toLowerCase() === "img") {
    const alt = (el.getAttribute("alt") || "").trim().toLowerCase();
    if (alt === "close" || alt === "fermer") return true;

    const src = (el.getAttribute("src") || "");
    if (src.startsWith("data:image/svg+xml")) return true;
  }
  const btn = el.closest?.("button,[role='button']");
  if (btn) {
    const t  = (btn.textContent || "").replace(/\s+/g," ").trim().toLowerCase();
    const al = (btn.getAttribute("aria-label") || "").trim().toLowerCase();
    const ti = (btn.getAttribute("title") || "").trim().toLowerCase();
    if (t === "×" || t === "x") return true;
    if (/fermer|close|quitter|dismiss/.test(al) || /fermer|close|quitter|dismiss/.test(ti)) return true;
  }

  return false;
}


document.addEventListener("click", (e) => {
  try {
    const path = e.composedPath ? e.composedPath() : [];
    const target = e.target;
    const img = target?.closest?.("img[alt]") || (target?.tagName?.toLowerCase() === "img" ? target : null);
    const alt = (img?.getAttribute?.("alt") || "").trim().toLowerCase();

    const isCloseImg = alt === "close" || alt === "fermer";
    const isTopRight = (() => {
      try {
        const r = (img || target).getBoundingClientRect?.();
        return r && r.top < 140 && r.right > (window.innerWidth - 140);
      } catch { return false; }
    })();
    const src = (img?.getAttribute?.("src") || "");
    const isSvgDataClose = src.startsWith("data:image/svg+xml") && isTopRight;

    const isClose = (isCloseImg && isTopRight) || isSvgDataClose;

    if (isClose) {
      console.log("[pp] close detected");
      hardReset("close-x");
      burstTick(3000);
      setTimeout(() => {
        const w = document.querySelector("guidap-booking-widget");
        const txt = (w?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        const hasContinue = !!Array.from(document.querySelectorAll("button")).find(b => norm(b.textContent) === "continuer");
        const hasChoose = (document.body?.textContent || "").toLowerCase().includes("choisissez votre activité");

        if (!hasContinue && !hasChoose) {
          remountGuidapWidget("blank-after-close");
        } else {
          burstTick(2500);
        }
      }, 450);

      return;
    }
    burstTick(1200);

  } catch (err) {
    console.warn("[pp] click handler error", err);
  }
}, true);

	const TOTAL_XPATH_LASTPAGE = "/html/body/div[1]/div/div[2]/div/section/div/div[1]/div[2]/div/div/div[2]/div/div[3]/div[2]/div/div[2]/div/div[1]/div/div[2]";

	function getByXPath(xpath, root = document) {
	  try {
		return document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	  } catch { return null; }
	}

	function readTotalFromXPath() {
	  const el = getByXPath(TOTAL_XPATH_LASTPAGE);
	  if (!el) return null;
	  const t = (el.textContent || "").replace(/\s+/g, " ").trim();
	  if (!t.includes("€")) return null;
	  const m = t.match(/(\d[\d\s.\u00A0]*,\d{2})\s*€/);
	  return m ? (m[1] + " €") : null;
	}

function isFinalInfoStep() {
  const txt = norm(document.body?.innerText || "");
  const hasInfos =
    txt.includes("vos informations") ||
    txt.includes("finalisez votre commande");

  const hasForm =
    !!document.querySelector('input[name="given-name"][autocomplete="given-name"]') ||
    !!document.querySelector('input[type="email"]') ||
    !!document.querySelector('input[name="family-name"]');

  return hasInfos && hasForm;
}	

    function log(...a){ if (DEBUG) console.log("[pp]", ...a); }

    function parseEuroToNumber(str) {
      if (!str) return null;
      const cleaned = str.replace(/\s/g, "").replace("€", "").replace(/\./g, "").replace(",", ".");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }

    function formatEuroFR(n) {
      try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n); }
      catch { return (Math.round(n*100)/100).toFixed(2).replace(".", ",") + " €"; }
    }

    function climbToCard(node, mustContainWords=[]) {
      let cur = node;
      for (let i=0; i<18 && cur?.parentElement; i++) {
        cur = cur.parentElement;
        const t = norm(cur.textContent);
        const ok = mustContainWords.every(w => t.includes(norm(w)));
        if (ok) return cur;
      }
      return null;
    }

function getTotalText(card) {
  const box = document.getElementById("participantsBox");
  if (!box) return null;

  const extractEuroNumber = (txt) => {
    if (!txt) return null;

    const t = String(txt).replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();

    // accepte aussi les montants négatifs, ex: -10,00 €
    const m = t.match(/(-?\d[\d\s]*,\d{2})\s*€/);
    if (!m) return null;

    const num = Number(
      m[1]
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    return Number.isFinite(num) ? num : null;
  };

  const formatEuroText = (n) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(n);
  };

  const scope =
    box.closest(".step-cart-recap") ||
    box.closest(".reservation-recap-desktop") ||
    box.closest(".reservation-recap-mobile") ||
    box.closest(".cart-recap-bottom") ||
    card ||
    document;

  // 1) panier / finalisation : addition de toutes les lignes visibles du récap,
  // y compris les lignes négatives (coupon)
  const recapRows = Array.from(scope.querySelectorAll(".step-cart-recap-sub.is-flex"));
  if (recapRows.length) {
    const values = recapRows
      .map(row => {
        const priceEl = row.querySelector(".step-cart-recap-sub-price");
        return extractEuroNumber(priceEl?.textContent || "");
      })
      .filter(v => Number.isFinite(v));

    if (values.length) {
      const sum = values.reduce((a, b) => a + b, 0);
      return formatEuroText(sum);
    }
  }

  // 2) total desktop guidap
  const desktopTotalEl =
    scope.querySelector(".reservation-recap-desktop-total .column:last-of-type") ||
    scope.querySelector(".reservation-recap-desktop-total .column.is-flex:last-of-type");

  if (desktopTotalEl) {
    const v = extractEuroNumber(desktopTotalEl.textContent || "");
    if (Number.isFinite(v)) return formatEuroText(v);
  }

  // 3) total mobile guidap
  const mobilePriceEl = scope.querySelector(".reservation-recap-mobile-price");
  if (mobilePriceEl) {
    const v = extractEuroNumber(mobilePriceEl.textContent || "");
    if (Number.isFinite(v)) return formatEuroText(v);
  }

  // 4) fallback ligne "Total"
  const allNodes = Array.from(scope.querySelectorAll("*"));
  for (const el of allNodes) {
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (txt !== "total") continue;

    const row = el.closest("div,li,p,section,article") || el.parentElement;
    if (!row) continue;

    const v = extractEuroNumber(row.textContent || "");
    if (Number.isFinite(v)) return formatEuroText(v);
  }

  return null;
}

function hasReservationSelection(card) {
  return !!getTotalText(card);
}

function hasAnySelectedPaidOption() {
  const cards = getOptionCards().map(readOptionMeta).filter(Boolean);
  return cards.some(c => c.qty > 0);
}

function shouldForceNoTotal(card) {
  if (!card) return true;

  // Sur la dernière étape "Vos informations", on ne force jamais le "pas de total"
  // car on veut pouvoir réutiliser le dernier total valide.
  if (isFinalInfoStep()) return false;

  const optionCards = getOptionCards().map(readOptionMeta).filter(Boolean);

  // Sur la page des tarifs/options :
  // s'il y a des cartes d'options visibles mais aucune quantité sélectionnée,
  // on force "Total non détecté".
  if (optionCards.length > 0) {
    const hasSelectedOption = optionCards.some(c => c.qty > 0);
    if (!hasSelectedOption) return true;
  }

  const totalText = getTotalText(card) || readTotalFromXPath() || null;
  if (!totalText || !totalText.includes("€")) return true;

  return false;
}


function ensureBox(card) {
  if (!card) return false;
 const targetBtn =
  Array.from(card.querySelectorAll("button")).find(b => isGoodActionButton(b) && norm(b.textContent) === "continuer") ||
  Array.from(card.querySelectorAll("button")).find(b => isGoodActionButton(b) && norm(b.textContent) === "valider le panier") ||
  null;

  if (!targetBtn) return false;

  let box = document.getElementById("participantsBox");

  if (box && !card.contains(box)) {
    targetBtn.parentElement.insertBefore(box, targetBtn);
  }

  if (!box) {
    box = document.createElement("div");
    box.id = "participantsBox";
    box.style.marginTop = "12px";
    box.style.marginBottom = "12px";
	box.innerHTML = `
	  <div style="font-weight:700; margin-bottom:6px;">Nombre de participants</div>

	  <div id="participantsResponsiveRow" style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;">
		<div id="participantsSelectWrap" style="width:100%;">
		  <select id="participantsSelect"
			style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius:10px; font-size:14px;">
			${Array.from({ length: (MAX_PARTICIPANTS - MIN_PARTICIPANTS + 1) }, (_, i) => i + MIN_PARTICIPANTS).map(n => `<option value="${n}">${n}</option>`).join("")}
		  </select>
		</div>

		<div id="participantsHintWrap" style="width:100%;">
		  <div id="participantsHint"
			style="padding:10px 12px; border:1px solid #e5e7eb; border-radius:12px; background:#f9fafb;
				   color:#111827; font-size:14px; line-height:1.35;">
			<span style="color:#6b7280;">Choisis un nombre pour afficher le prix par personne.</span>
		  </div>
		</div>
	  </div>
	`;
    targetBtn.parentElement.insertBefore(box, targetBtn);
  }

  const sel = document.getElementById("participantsSelect");
  if (sel) sel.value = String(lastParticipants);

  return true;
}

function getQtyInputFromOptionCard(cardEl) {
  return cardEl?.querySelector('input[type="number"]') || null;
}

function getPlusMinusButtons(cardEl) {
  if (!cardEl) return { plus: null, minus: null };

  const buttons = Array.from(cardEl.querySelectorAll("button"));
  let plus = null;
  let minus = null;

  for (const b of buttons) {
    const aria = (b.getAttribute("aria-label") || "").trim();
    const txt = (b.textContent || "").replace(/\s+/g, " ").trim();

    if (aria === "+" || txt === "+") plus = b;
    if (aria === "-" || txt === "-") minus = b;
  }

  return { plus, minus };
}

function readOptionQty(cardEl) {
  const input = getQtyInputFromOptionCard(cardEl);
  if (!input) return 0;
  const v = parseInt(input.value || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

function waitForOptionQtyChange(cardEl, previousQty, timeoutMs = 1800) {
  return new Promise((resolve) => {
    const input = getQtyInputFromOptionCard(cardEl);
    if (!input) {
      resolve(false);
      return;
    }

    let done = false;
    let obs = null;
    let to = null;

    const finish = (ok) => {
      if (done) return;
      done = true;
      try { obs && obs.disconnect(); } catch {}
      if (to) clearTimeout(to);
      resolve(ok);
    };

    const check = () => {
      const now = readOptionQty(cardEl);
      if (now !== previousQty) finish(true);
    };

    obs = new MutationObserver(check);
    try {
      obs.observe(input, {
        attributes: true,
        attributeFilter: ["value"]
      });
    } catch {}

    input.addEventListener("input", check, { once: false });
    input.addEventListener("change", check, { once: false });

    to = setTimeout(() => {
      const now = readOptionQty(cardEl);
      finish(now !== previousQty);
    }, timeoutMs);

    requestAnimationFrame(check);
  });
}

function getOptionCards() {
  return Array.from(
    document.querySelectorAll(
      ".price-field-item .g-item, .price-field-item"
    )
  );
}



function parsePriceTextToNumber(str) {
  if (!str) return null;

  const cleaned = String(str)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace("€", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function readOptionMeta(cardEl) {
  if (!cardEl) return null;

  const root = cardEl.matches(".g-item") ? cardEl : (cardEl.querySelector(".g-item") || cardEl);

  const nameEl = root.querySelector(".quantity-item-name");
  const amountEl = root.querySelector(".quantity-item-amount");
  const detailsEl = root.querySelector(".quantity-item-details");

  const name = (nameEl?.textContent || "").replace(/\s+/g, " ").trim();
  const details = (detailsEl?.textContent || "").replace(/\s+/g, " ").trim();
  const amountText = (amountEl?.textContent || "").replace(/\s+/g, " ").trim();
  const amount = parsePriceTextToNumber(amountText);
  const qty = readOptionQty(root);

  return {
    el: root,
    name,
    details,
    amountText,
    amount,
    qty
  };
}
function computeExtraPersons(participants, threshold) {
  participants = parseInt(participants, 10);
  threshold = parseInt(threshold, 10);

  if (!Number.isFinite(participants) || !Number.isFinite(threshold)) return 0;

  // Ex: seuil 13
  // 12 => 0
  // 13 => 1
  // 22 => 10
  return Math.max(0, participants - (threshold - 1));
}
function findExtraPersonRule() {
  const cards = getOptionCards().map(readOptionMeta).filter(Boolean);

  for (const c of cards) {
    const txt = `${c.name} ${c.details}`.toLowerCase();
    const m = c.name.match(/groupe\s+(\d+)\s+personne(?:s)?\s+et\s+plus/i);
    if (!m) continue;

    const threshold = parseInt(m[1], 10);
    if (!Number.isFinite(threshold)) continue;

    const isPerPerson =
      /prix\s*\/\s*personne/i.test(txt) ||
      /par\s*personne/i.test(txt);

    if (!isPerPerson) continue;
    if (!Number.isFinite(c.amount)) continue;

    const input = getQtyInputFromOptionCard(c.el);
    const { plus, minus } = getPlusMinusButtons(c.el);

    return {
      threshold,
      pricePerPerson: c.amount,
      currentQty: readOptionQty(c.el),
      card: c,
      input,
      plus,
      minus
    };
  }

  return null;
}

let extraRuleSyncBusy = false;
let extraRuleLastWantedQty = null;
let manualParticipantsSyncUntil = 0;
let manualParticipantsWanted = null;
let manualHintFreezeUntil = 0;
let manualHintText = "";

async function syncExtraRuleQuantity(participants) {
  const rule = findExtraPersonRule();
  if (!rule || !rule.card?.el) return false;

  const wantedQty = computeExtraPersons(participants, rule.threshold);
  const currentQty = readOptionQty(rule.card.el);

  extraRuleLastWantedQty = wantedQty;

  if (currentQty === wantedQty) return false;
  if (extraRuleSyncBusy) return false;

  extraRuleSyncBusy = true;

  try {
    let guard = 0;

    while (guard < 60) {
      guard++;

      const freshRule = findExtraPersonRule();
      if (!freshRule || !freshRule.card?.el) break;

      const qtyNow = readOptionQty(freshRule.card.el);
      const target = computeExtraPersons(participants, freshRule.threshold);

      if (qtyNow === target) {
        return true;
      }

      const needPlus = qtyNow < target;
      const btn = needPlus ? freshRule.plus : freshRule.minus;

      if (!btn || btn.disabled) break;

      btn.click();

      const changed = await waitForOptionQtyChange(freshRule.card.el, qtyNow);
      if (!changed) {
        // re-check direct au cas où le DOM a rerender sans event exploitable
        const after = readOptionQty(freshRule.card.el);
        if (after === qtyNow) break;
      }
    }

    return true;
  } finally {
    extraRuleSyncBusy = false;
    setTimeout(() => tick(), 0);
    setTimeout(() => tick(), 180);
    setTimeout(() => tick(), 500);
  }
}

async function update(card) {
  const sel = document.getElementById("participantsSelect");
  const hint = document.getElementById("participantsHint");
  if (!sel || !hint || !card) return;

  const n = setParticipants(sel.value);
  lastParticipants = n;
  sel.value = String(n);

  if (isParticipantsHintFrozen()) {
    if (manualHintText) hint.innerHTML = manualHintText;
    return;
  }

  const rule = findExtraPersonRule();

  if (rule && !extraRuleSyncBusy && !isManualParticipantsSyncActive()) {
    const wantedQty = computeExtraPersons(n, rule.threshold);
    const currentQty = readOptionQty(rule.card.el);

    if (currentQty !== wantedQty) {
      hint.innerHTML = `<span style="color:#6b7280;">Mise à jour du panier en cours…</span>`;
      await syncExtraRuleQuantity(n);
    }
  }

  const finalInfoStep = isFinalInfoStep();

  if (shouldForceNoTotal(card) && !finalInfoStep) {
    lastSeenTotal = null;
    hint.innerHTML = `<span style="color:#6b7280;">Total non détecté pour l’instant.</span>`;
    return;
  }

  let totalText = getTotalText(card) || readTotalFromXPath() || null;

  // Sur la dernière page "Vos informations", si aucun total n'est visible,
  // on réutilise le dernier total valide vu précédemment.
  if (!totalText && finalInfoStep && lastSeenTotal) {
    totalText = lastSeenTotal;
  }

  if (!totalText) {
    if (!finalInfoStep) {
      lastSeenTotal = null;
    }
    hint.innerHTML = `<span style="color:#6b7280;">Total non détecté pour l’instant.</span>`;
    return;
  }

  const totalVal = parseEuroToNumber(totalText);

  if (!totalVal) {
    if (!finalInfoStep) {
      lastSeenTotal = null;
    }
    hint.innerHTML = `<span style="color:#6b7280;">Total non détecté pour l’instant.</span>`;
    return;
  }

  lastSeenTotal = totalText;

  const per = totalVal / n;

  let extraHtml = "";
  const freshRule = findExtraPersonRule();
  const isMobile = window.innerWidth <= 768;

  if (freshRule && !isMobile) {
    const extraQty = readOptionQty(freshRule.card.el);
    if (extraQty > 0) {
      extraHtml = `
        <div style="margin-top:8px; padding-top:8px; border-top:1px solid #e5e7eb; color:#374151; font-size:13px; line-height:1.35;">
          À partir de <b>${freshRule.threshold}</b> participants: <b>tarif par personne</b><br>
          <b>${extraQty}</b> Participant(s) supplémentaire(s) : <b>${extraQty}</b> × ${formatEuroFR(freshRule.pricePerPerson)}
        </div>
      `;
    }
  }

  hint.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:12px;">
      <span style="color:#374151;">Total</span>
      <span style="font-weight:900;">${formatEuroFR(totalVal)}</span>
    </div>
    <div style="margin-top:6px; font-weight:900; font-size:15px;">
      ≈ ${formatEuroFR(per)} <span style="font-weight:700; font-size:14px;">/ personne</span>
      ${isMobile ? "" : `<span style="font-weight:700; color:#6b7280; font-size:13px;">(pour ${n})</span>`}
    </div>
    ${extraHtml}
  `;
}

    function wire(card) {
      const sel = document.getElementById("participantsSelect");
      if (!sel || sel.dataset.wired) return;
      sel.dataset.wired = "1";
      // sel.addEventListener("change", () => update(card));
	  sel.addEventListener("change", () => safeUpdate(card));
    }

    function attachCardObserver(card) {
      if (cardObs) { try { cardObs.disconnect(); } catch {} }
      observedCard = card;
      // cardObs = new MutationObserver(debounce(() => update(card), 150));
	  cardObs = new MutationObserver(debounce(() => safeUpdate(card), 150));
      cardObs.observe(card, { childList:true, subtree:true, characterData:true });
    }
let stableRecap = null;

function isRecapCard(el) {
  if (!el || !el.isConnected) return false;
  const t = norm(el.textContent);

  const hasEuro = el.textContent.includes("€");
  const hasTotal = t.includes("total");
  const hasBtn =
  !!Array.from(el.querySelectorAll("button"))
    .find(b => isGoodActionButton(b) && (
      norm(b.textContent) === "continuer" ||
      norm(b.textContent) === "valider le panier"
    ));
  const panierOk = t.includes("récapitulatif") && hasTotal;
  const stepOk =
    (t.includes("votre réservation") || t.includes("votre reservation") || t.includes("nombre de participants"))
    && hasTotal;

  return hasEuro && hasBtn && (panierOk || stepOk);
}

function climbToRecapFromButton(btn) {
  let cur = btn;
  for (let i = 0; i < 28 && cur?.parentElement; i++) {
    cur = cur.parentElement;
    if (isRecapCard(cur)) return cur;
  }
  return null;
}

function findRecapCard() {
  if (isRecapCard(stableRecap)) return stableRecap;
  const cont = deepFindButtonByText("continuer");
  if (cont) {
    const card = climbToRecapFromButton(cont);
    if (card) return (stableRecap = card);
    stableRecap = document.body;
    return stableRecap;
  }

  const val = deepFindButtonByText("valider le panier");
  if (val) {
    const card = climbToRecapFromButton(val);
    if (card) return (stableRecap = card);
    stableRecap = document.body;
    return stableRecap;
  }
 
  
  
 /* const cont = Array.from(document.querySelectorAll("button"))
  .find(b => norm(b.textContent) === "continuer" && isGoodActionButton(b));
  if (cont) {
    const card = climbToRecapFromButton(cont);
    if (card) return (stableRecap = card);
  }
const val = Array.from(document.querySelectorAll("button"))
  .find(b => norm(b.textContent) === "valider le panier" && isGoodActionButton(b));
  if (val) {
    const card = climbToRecapFromButton(val);
    if (card) return (stableRecap = card);
  }*/
  const blocks = Array.from(document.querySelectorAll("div,section,article,aside"));
  const found = blocks.find(isRecapCard) || null;
  if (found) stableRecap = found;
  
  if (lastWidgetNode) {
    const card = climbAnyTree(lastWidgetNode, isRecapCard);
    if (card) {
      stableRecap = card;
      return card;
    }
  } 
  return found;
}


function tick() {
    lastParticipants = getParticipants();
	const card = findRecapCard();
	if (card) {
	  console.log("[pp] tick: card =", card.tagName, card.id || "", (card.className || "").toString().slice(0,80));
	}	
	
	  if (!card) {
		console.log("[pp] tick: no card", { lastWidgetNode: !!lastWidgetNode });
		return;
	  }	

  if (!ensureBox(card)) return;
  wire(card);

  if (observedCard !== card) attachCardObserver(card);

  // update(card);
  safeUpdate(card);
  startBurst(card, 4500);
}

let burstObs = null;
let burstTimer = null;
let inUpdate = false;
let lastSeenTotal = null;


async function safeUpdate(card) {
  if (inUpdate) return;
  inUpdate = true;
  try {
    await update(card);
  } finally {
    inUpdate = false;
  }
}

function startBurst(card, durationMs = 8000) {
  if (!card) return;
  if (burstObs) { try { burstObs.disconnect(); } catch {} burstObs = null; }
  if (burstTimer) { clearTimeout(burstTimer); burstTimer = null; }

  const t0 = performance.now();

  const handler = debounce(() => {
    const txt = getTotalText(card);
    if (!txt || !txt.includes("€")) return;
    if (txt !== lastSeenTotal) {
      lastSeenTotal = txt;
      safeUpdate(card);
    }
  }, 120);

  burstObs = new MutationObserver((muts) => {
    if (muts.some(m => m.target?.nodeType === 1 && m.target.closest?.("#participantsBox"))) return;
    handler();
  });

  burstObs.observe(card, { childList: true, subtree: true, characterData: true });

  burstTimer = setInterval(() => {
    handler();

    if (performance.now() - t0 > durationMs) {
      if (burstObs) { try { burstObs.disconnect(); } catch {} burstObs = null; }
      clearInterval(burstTimer);
      burstTimer = null;
    }
  }, 250);

  handler();
}
let lastStepRefresh = 0;

function isInPP(el) {
  return !!el?.closest?.("#participantsBox");
}

function looksLikePlusMinusButton(btn) {
  if (!btn) return false;
  const t = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (t === "+" || t === "-" || t === "plus" || t === "moins") return true;
  if (t === "add" || t === "remove") return true;

  const al = (btn.getAttribute("aria-label") || "").toLowerCase();
  const ti = (btn.getAttribute("title") || "").toLowerCase();
  if (/(plus|moins|add|remove|increase|decrease)/.test(al)) return true;
  if (/(plus|moins|add|remove|increase|decrease)/.test(ti)) return true;
  const html = (btn.innerHTML || "").toLowerCase();
  if (/(icon-plus|icon-minus|fa-plus|fa-minus|lucide-plus|lucide-minus|plus|minus)/.test(html)) {
    return true;
  }
  const parent = btn.parentElement;
  if (parent) {
    const buttons = parent.querySelectorAll("button");
    if (buttons && buttons.length === 2) {
      const hasNumber = Array.from(parent.querySelectorAll("*")).some(el => {
        const tx = (el.textContent || "").trim();
        return /^\d+$/.test(tx);
      });
      if (hasNumber) return true;
    }
  }

  return false;
}
function scheduleStepperRefresh() {
  const now = Date.now();
  if (now - lastStepRefresh < 120) return;
  lastStepRefresh = now;

  const run = () => {
    try {
      tick();
      const card = findRecapCard();
if (card) startBurst(card, 2200);
    } catch {}
  };


  setTimeout(run, 0);
  setTimeout(run, 120);
  setTimeout(run, 320);
  setTimeout(run, 700);
}

document.addEventListener("click", (e) => {
  try {
    if (isInPP(e.target)) return;

    const path = e.composedPath ? e.composedPath() : [];
    const btn = (path.find(n => n && n.tagName && n.tagName.toLowerCase() === "button")) || null;
    if (!btn) return;
    const inGuidap = !!btn.closest?.("guidap-booking-widget") || !!document.querySelector("guidap-booking-widget");
    if (!inGuidap) return;

    if (!looksLikePlusMinusButton(btn)) return;

    scheduleStepperRefresh();
  } catch {}
}, true);

function setParticipantsUI(n) {
  const v = setParticipants(n);
  lastParticipants = v;

  const sel = document.getElementById("participantsSelect");
  if (sel) sel.value = String(v);

  return v;
}
function isManualParticipantsSyncActive() {
  return Date.now() < manualParticipantsSyncUntil;
}

function lockManualParticipantsSync(participants, ms = 1200) {
  manualParticipantsWanted = clampN(participants);
  manualParticipantsSyncUntil = Date.now() + ms;
  setParticipantsUI(manualParticipantsWanted);
}
function freezeParticipantsHint(html, ms = 900) {
  manualHintText = html || "";
  manualHintFreezeUntil = Date.now() + ms;
}

function isParticipantsHintFrozen() {
  return Date.now() < manualHintFreezeUntil;
}

document.addEventListener("click", (e) => {
  try {
    if (isInPP(e.target)) return;
    if (extraRuleSyncBusy) return;

    const rule = findExtraPersonRule();
    if (!rule || !rule.card?.el) return;

    const path = e.composedPath ? e.composedPath() : [];
    const btn = path.find(n => n && n.tagName && n.tagName.toLowerCase() === "button") || null;
    if (!btn) return;

    if (!rule.card.el.contains(btn)) return;
    if (!looksLikePlusMinusButton(btn)) return;
    if (btn.disabled) return;

    const beforeQty = readOptionQty(rule.card.el);

    const isPlus =
      (btn.getAttribute("aria-label") || "").trim() === "+" ||
      (btn.textContent || "").replace(/\s+/g, " ").trim() === "+";

	const predictedQty = isPlus ? (beforeQty + 1) : Math.max(0, beforeQty - 1);
	const predictedParticipants = (rule.threshold - 1) + predictedQty;

	// fige temporairement le hint pour éviter l’effet de clignotement
	// freezeParticipantsHint(
	  // `<span style="color:#6b7280;">Mise à jour du panier en cours…</span>`,
	  // 900
	// );
	const hint = document.getElementById("participantsHint");
	freezeParticipantsHint(hint?.innerHTML || "", 250);
	lockManualParticipantsSync(predictedParticipants, 450);

    setTimeout(async () => {
      try {
        const freshRule = findExtraPersonRule();
        if (!freshRule || !freshRule.card?.el) return;

        const changed = await waitForOptionQtyChange(freshRule.card.el, beforeQty, 1200);
        const afterQty = readOptionQty(freshRule.card.el);

        // si finalement la qty réelle diffère de la prédiction, on corrige
        if (changed || afterQty !== beforeQty) {
          const realParticipants = (freshRule.threshold - 1) + afterQty;
          lockManualParticipantsSync(realParticipants, 900);
        }

        tick();
        setTimeout(() => tick(), 80);
		setTimeout(() => tick(), 180);
      } catch (err) {
        console.warn("[pp] reverse sync error", err);
      }
    }, 0);
  } catch (err) {
    console.warn("[pp] reverse sync click handler error", err);
  }
}, true);


(function ensureParticipantsMobileCSS() {
  let st = document.getElementById("participants-mobile-layout-css");
  if (!st) {
    st = document.createElement("style");
    st.id = "participants-mobile-layout-css";
    document.head.appendChild(st);
  }

  st.textContent = `
    @media (max-width: 768px) {
      #participantsResponsiveRow {
        display: flex !important;
        flex-direction: row !important;
        align-items: stretch !important;
        justify-content: space-between !important;
        gap: 8px !important;
        width: 100% !important;
      }

      #participantsSelectWrap {
        flex: 0 0 108px !important;
        width: 108px !important;
        min-width: 108px !important;
        max-width: 108px !important;
      }

      #participantsHintWrap {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
      }

      #participantsSelect {
        width: 100% !important;
        height: 44px !important;
        min-height: 44px !important;
        padding: 8px 30px 8px 10px !important;
        font-size: 16px !important;
      }

      #participantsHint {
        padding: 8px 10px !important;
        font-size: 13px !important;
        line-height: 1.25 !important;
        word-break: break-word !important;
      }

      #participantsHint b {
        font-size: inherit !important;
	  }
	  .participants-extra-mobile-hide {
	  display: none !important;
	  }
	  .participants-count-mobile-hide {
	  display: none !important;
	  }
    }
  `;
})();
const globalObs = new MutationObserver(debounce((muts) => {
	
	  if (muts.some(m => m.target?.nodeType === 1 && m.target.closest?.("#participantsBox"))) return;
	  tick();
	}, 250));

	globalObs.observe(document.documentElement, { childList:true, subtree:true });
    setTimeout(tick, 600);
    setTimeout(tick, 1600);
    setInterval(tick, 1200); 
	

	
	
  })();
  






(function(){
  const norm = window.__ug_norm;
  function isVisible(el){
    if(!el) return false;
    const cs = getComputedStyle(el);
    if(cs.display==="none" || cs.visibility==="hidden" || cs.opacity==="0") return false;
    const r = el.getBoundingClientRect?.();
    return r && r.width>2 && r.height>2;
  }
function isFinalPage(){
  const txt = (document.body?.innerText || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
  const hasA = txt.includes("finalisez votre commande");
  const hasB = txt.includes("votre panier");
  const hasGivenNameInput = document.querySelector('input[name="given-name"][autocomplete="given-name"]');
  return hasA && hasB  && hasGivenNameInput;
}

function cleanupIfNotFinal(){
  if (isFinalPage()) return;
  document.getElementById("payChoiceNote2")?.remove();
  lastMarkerAnchor = null;
  lastNoteAnchor = null;
}

    function findValidateButton(){
    return Array.from(document.querySelectorAll("button"))
      .find(b => norm(b.textContent) === "continuer" && isVisible(b)) || null;
  }

  let lastNoteAnchor = null;



function ensureNote(){
  let n = document.getElementById("payChoiceNote2");
  if(!n){
    n = document.createElement("div");
    n.id = "payChoiceNote2";
    n.style.cssText = `
      margin-top:6px;
      font-size:12.5px;
      color:#4b5563;
      opacity:.95;
      line-height:1.5;
      text-align:center;
    `;

    n.innerHTML = `
      <div style="font-weight:700;">+ de 100 000 Joueurs</div>
      <div style="margin-top:2px; font-weight:600; opacity:.9;">Animateur(s) qualifié(s)</div>
    `;
  }
  return n;
}

function mount(){
	cleanupIfNotFinal();
    if(!isFinalPage()) return;

  const btn = findValidateButton();
  if(btn && btn.parentElement){
    const anchor = btn.parentElement;
    if(anchor !== lastNoteAnchor){
      btn.insertAdjacentElement("afterend", ensureNote());
      lastNoteAnchor = anchor;
    }
  }
}
  let scheduled = false;
  function scheduleMount(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
  }

  const obs = new MutationObserver(scheduleMount);
  obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

  setTimeout(mount, 800);
})();






(function(){






  const norm = window.__ug_norm;
  function isVisible(el){
    if(!el) return false;
    const cs = getComputedStyle(el);
    if(cs.display==="none" || cs.visibility==="hidden" || cs.opacity==="0") return false;
    const r = el.getBoundingClientRect?.();
    return r && r.width>2 && r.height>2;
  }
function isFinalPage(){
  const txt = (document.body?.innerText || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
  const hasA = txt.includes("choisissez votre activité") || txt.includes("personnalisez votre activité") || txt.includes("sélectionnez vos dates et heures");
  const hasB = txt.includes("votre réservation");
  return hasA && hasB
}

function cleanupIfNotFinal(){
  if (isFinalPage()) return;
  document.getElementById("payChoiceNote0")?.remove();
  lastMarkerAnchor = null;
  lastNoteAnchor = null;
}

    function findValidateButton(){
    return Array.from(document.querySelectorAll("button"))
      .find(b => norm(b.textContent) === "continuer" && isVisible(b)) || null;
  }

  let lastNoteAnchor = null;



function ensureNote(){
  let n = document.getElementById("payChoiceNote0");
  if(!n){
    n = document.createElement("div");
    n.id = "payChoiceNote0";
    n.style.cssText = `
      margin-top:12px;
      text-align:center;
    `;

    const box = `
      display:inline-flex;
      align-items:center;
      justify-content:center;
      height:38px;                 /* + grand */
      padding:0 14px;              /* + large */
      border:1px solid rgba(0,0,0,.22);
      border-radius:0px;           /* pas d'arrondi */
      background:#fff;
      box-shadow:0 1px 0 rgba(0,0,0,.03);
      flex:0 0 auto;
    `;

    const imgStyle = `
      height:30px;                 /* + grand logo */
      width:auto;
      max-width:92px;              /* garde 1 ligne */
      display:block;
      object-fit:contain;
    `;

    n.innerHTML = `
      <div style="
        display:flex;
        gap:12px;
        justify-content:center;
        align-items:center;
        flex-wrap:nowrap;
        white-space:nowrap;
      ">
        <span style="${box}" title="Visa" aria-label="Visa">
          <img src="https://logo-marque.com/wp-content/uploads/2020/06/Visa-Logo.png"
               alt="Visa" style="${imgStyle}" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>
        </span>

        <span style="${box}" title="Mastercard" aria-label="Mastercard">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1280px-MasterCard_Logo.svg.png"
               alt="Mastercard" style="${imgStyle}" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>
        </span>

        <span style="${box}" title="ANCV" aria-label="ANCV">
          <img src="https://upload.wikimedia.org/wikipedia/fr/thumb/8/83/ANCV_logo_2010.png/250px-ANCV_logo_2010.png"
               alt="ANCV" style="${imgStyle}" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>
        </span>
      </div>
    `;
  }
  return n;
}

function mount(){
	cleanupIfNotFinal();
    if(!isFinalPage()) return;

  const btn = findValidateButton();
  if(btn && btn.parentElement){
    const anchor = btn.parentElement;
    if(anchor !== lastNoteAnchor){
      btn.insertAdjacentElement("afterend", ensureNote());
      lastNoteAnchor = anchor;
    }
  }
}
  let scheduled = false;
  function scheduleMount(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
  }

  const obs = new MutationObserver(scheduleMount);
  obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

  setTimeout(mount, 800);
})();







(function(){
  const NOTE_TEXT = "(1) Paiement au choix : acompte de 50 € ou totalité.";

  const norm = window.__ug_norm;
  function isVisible(el){
    if(!el) return false;
    const cs = getComputedStyle(el);
    if(cs.display==="none" || cs.visibility==="hidden" || cs.opacity==="0") return false;
    const r = el.getBoundingClientRect?.();
    return r && r.width>2 && r.height>2;
  }
function isFinalPage(){
  const txt = (document.body?.innerText || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
  const hasA = txt.includes("finalisez votre commande");
  const hasB = txt.includes("votre panier");
  const hasGivenNameInput =
    !!document.querySelector('input[name="given-name"][autocomplete="given-name"]');
  return hasA && hasB  && !hasGivenNameInput;
}

function cleanupIfNotFinal(){
  if (isFinalPage()) return;
  document.querySelectorAll("#payChoiceMarker").forEach(n => n.remove());

  document.getElementById("payChoiceNote")?.remove();
  lastMarkerAnchor = null;
  lastNoteAnchor = null;
}

    function findValidateButton(){
    return Array.from(document.querySelectorAll("button"))
      .find(b => norm(b.textContent) === "valider le panier" && isVisible(b)) || null;
  }
  function findTotalAmountEl(){
    const labels = Array.from(document.querySelectorAll("*"))
      .filter(el => el.childElementCount===0 && norm(el.textContent)==="total");
    for(const lab of labels){
      const row = lab.closest("div,li,p,section,article") || lab.parentElement;
      if(!row) continue;
      const candidates = Array.from(row.querySelectorAll("*"))
        .filter(x => x.childElementCount===0 && /€/.test(x.textContent||""));
      if(candidates.length){
        return candidates[candidates.length-1];
      }
      const p = row.parentElement;
      if(!p) continue;
      const kids = Array.from(p.children);
      const idx = kids.indexOf(row);
      for(let i=idx+1;i<Math.min(kids.length, idx+6);i++){
        const euros = Array.from(kids[i].querySelectorAll("*"))
          .filter(x => x.childElementCount===0 && /€/.test(x.textContent||""));
        if(euros.length) return euros[euros.length-1];
      }
    }
    return null;
  }
  let lastMarkerAnchor = null;
  let lastNoteAnchor = null;

	function ensureMarker(){
	  let m = document.getElementById("payChoiceMarker");
	  if(!m){
		m = document.createElement("span");
		m.id = "payChoiceMarker";
		m.textContent = "(1)";
		m.style.cssText = `
		  display:inline-block;
		  margin-left:3px;
		  font-size:10px;
		  font-weight:900;
		  color:#111827;
		  line-height:1;
		  position:relative;
		  top:-0.45em;          /* effet "sup" */
		  white-space:nowrap;
		  pointer-events:none;
		`;
	  }
	  return m;
	}

function ensureNote(){
  let n = document.getElementById("payChoiceNote");
  if(!n){
    n = document.createElement("div");
    n.id = "payChoiceNote";
    n.textContent = "(1) Paiement au choix : acompte de 50 € ou totalité.";
    n.style.cssText = `
	  margin-top:6px;
	  font-size:12.5px;
	  color:#4b5563;          /* un peu plus foncé */
	  opacity:.95;            /* plus visible */
	  line-height:1.2;
	  text-align:center;
	`;
  }
  return n;
}

function mount(){
	cleanupIfNotFinal();
  if(!isFinalPage()) return;

  const amountEl = findTotalAmountEl();
  if(amountEl){
    if(amountEl !== lastMarkerAnchor){
      amountEl.style.display = "inline-flex";
      amountEl.style.alignItems = "flex-start";

      amountEl.appendChild(ensureMarker());
      lastMarkerAnchor = amountEl;
    }
  }

  const btn = findValidateButton();
  if(btn && btn.parentElement){
    const anchor = btn.parentElement;
    if(anchor !== lastNoteAnchor){
      btn.insertAdjacentElement("afterend", ensureNote());
      lastNoteAnchor = anchor;
    }
  }
}

  let scheduled = false;
  function scheduleMount(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
  }

  const obs = new MutationObserver(scheduleMount);
  obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

  setTimeout(mount, 800);
})();





  
  (function () {
	  const norm = window.__ug_norm;
	  
	  
	  
	  function newToken() {
	  return Math.random().toString(36).slice(2) + Date.now().toString(36);
	}
const LUCKY_CONFIGS = {
  escape: {
    title: "Tentez votre chance ! 🎁",
    promoCode: "REDUC",
    segments: [
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-5€",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "T-shirt Unigames",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-10€",  bg: "#43A047" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "Gourde Unigames",   bg: "#66BB6A" },
    ],
    forceWinLabel: "-10€",
  },

  classique: {
    title: "Tentez votre chance ! 🎁",
    promoCode: "REDUC",
    segments: [
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-5€",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "T-shirt Unigames",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-10€",  bg: "#43A047" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "Gourde Unigames",   bg: "#66BB6A" },
    ],
    forceWinLabel: "-10€",
  },

  enfants: {
    title: "Tentez votre chance ! 🎁",
    promoCode: "ANNIV",
    segments: [
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-5€ + Sac Unigames",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-5€",   bg: "#43A047" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "Mug Unigames",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-10€",  bg: "#2E7D32" },
    ],
    forceWinLabel: "-5€ + Sac Unigames",
  },

  evg: {
    title: "Tentez votre chance ! 🎁",
    promoCode: "EVG-EVJF",
    segments: [
	
	  { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-5€",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "T-shirt Unigames",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "-10€",  bg: "#43A047" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "Gourde Unigames",   bg: "#66BB6A" },
    ],
    forceWinLabel: "-10€",
  },
  default: {
    title: "Tentez votre chance ! 🎁",
    promoCode: "testlucky",
    segments: [
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "5 €",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "5 €",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "5 €",   bg: "#66BB6A" },
      { label: "Perdu, désolé", bg: "#f3f4f6" },
      { label: "5 €",   bg: "#66BB6A" },
    ],
    forceWinLabel: "5 €",
  }
};



    const DEBUG = false;
const LUCKY_DEBUG = false;

function luckyLog(...a){ if (LUCKY_DEBUG) console.log("[lucky]", ...a); }

function getGuidapRoot(){
  return document.getElementById("guidap-popups")
    || document.querySelector("guidap-booking-widget")
    || null;
}

function collectTexts(root){
  const pick = (sel) => Array.from(root.querySelectorAll(sel)).map(n => (n.textContent || "").trim());
  const selected = pick(
    ".g-item-box.selected .package-item-name-content," +
    ".g-item-box.selected .package-item-name," +
    ".package-field-item.selected .package-item-name-content," +
    ".package-field-item.selected .package-item-name," +
    "[aria-selected='true'] .package-item-name-content," +
    "[aria-selected='true'] .package-item-name"
  );
  const names = pick(".package-item-name-content, .package-item-name");

  const labels = pick(".g-group-field-label, .g-step-page-title, .g-step-page-subtitle");
  const rootText = (root.innerText || root.textContent || "").slice(0, 1200);

  return {
    selected: norm(selected.join(" ")),
    names: norm(names.join(" ")),
    labels: norm(labels.join(" ")),
    rootText: norm(rootText),
  };
}

function detectLuckyActivity(){
  const root = getGuidapRoot();
  const t = collectTexts(root);
  const txt = [t.selected, t.names, t.labels, t.rootText].filter(Boolean).join(" ");
  const activeTab = document.querySelector("[data-w-tab].w--current")?.getAttribute("data-w-tab") || "";
  const tab = norm(activeTab);

  if (txt.includes("les tarifs enfants") || txt.includes("anniversaire") || tab.includes("anniversaire") || tab.includes("enfant")) return "enfants";
  if (txt.includes("les tarifs classique") || tab.includes("classique")) return "classique";
  if (txt.includes("evg") || txt.includes("evjf") || tab.includes("evg") || tab.includes("evjf")) return "evg";
  if (txt.includes("escape game") || tab.includes("escape")) return "escape";

  return "default";
}
let __lucky_activityKey = null;
let __lucky_pendingKey = null;
let __lucky_pendingCount = 0;

function applyLuckyKey(newKey, reason){
  if (!newKey) return;
  if (newKey === __lucky_activityKey) return;

  __lucky_activityKey = newKey;
  window.__lucky_done = false;

  luckyLog("activity changed =>", newKey, "| reason:", reason);

  const ov = document.getElementById("luckyOverlay");
  if (ov) {
    const cfg = getLuckyConfig();
    const titleEl = ov.querySelector("#luckyTitle");
    if (titleEl) titleEl.textContent = cfg.title || "🎁 Tentez votre chance 😉";
  }
}

function refreshLuckyActivity(reason=""){
  const root = getGuidapRoot();
  if (!root) return;

  const k = detectLuckyActivity();

  if (LUCKY_DEBUG) {
    const t = collectTexts(root);
    console.log("[lucky][dbg]", { k, reason, t });
  }

  if (k !== __lucky_pendingKey) {
    __lucky_pendingKey = k;
    __lucky_pendingCount = 1;
    return;
  }
  __lucky_pendingCount++;

  if (__lucky_pendingCount >= 2) {
    applyLuckyKey(k, reason);
  }
}
(function(){
  let mo = null;
  let armedRoot = null;
  let scanTimer = null;

  function disarm(){
    try { mo && mo.disconnect(); } catch {}
    mo = null;
    armedRoot = null;
  }

  function arm(){
    const root = getGuidapRoot();
    if (!root) { disarm(); return; }
    if (mo && armedRoot === root) return;

    disarm();
    armedRoot = root;

    mo = new MutationObserver(() => refreshLuckyActivity("mutation"));
    mo.observe(root, { childList:true, subtree:true, attributes:true, characterData:true });
    refreshLuckyActivity("arm0");
    setTimeout(() => refreshLuckyActivity("arm1"), 150);
    setTimeout(() => refreshLuckyActivity("arm2"), 350);
    setTimeout(() => refreshLuckyActivity("arm3"), 800);
  }

  const global = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      arm();
    }, 200);
  });
  global.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("resize", () => {
    if (getGuidapRoot()) refreshLuckyActivity("resize");
  }, { passive:true });
  window.addEventListener("popstate", arm, { passive:true });
  window.addEventListener("hashchange", arm, { passive:true });

  if (!window.__luckyHistoryPatched) {
    window.__luckyHistoryPatched = true;
    const _ps = history.pushState;
    const _rs = history.replaceState;
    history.pushState = function(...a){ const r=_ps.apply(this,a); arm(); return r; };
    history.replaceState = function(...a){ const r=_rs.apply(this,a); arm(); return r; };
  }

  arm();
})();

function getLuckyConfig(){
  const key = __lucky_activityKey || detectLuckyActivity();
  return LUCKY_CONFIGS[key] || LUCKY_CONFIGS.default;
}



    function log(...a){ if (DEBUG) console.log("[lucky]", ...a); }
	
function isVisible(el){
  if(!el) return false;
  const cs = getComputedStyle(el);
  if(cs.display==="none" || cs.visibility==="hidden" || cs.opacity==="0") return false;
  const r = el.getBoundingClientRect?.();
  return r && r.width > 2 && r.height > 2;
}

    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
	function getByXPath(xpath, root = document) {
	  try {
		return document.evaluate(
		  xpath,
		  root,
		  null,
		  XPathResult.FIRST_ORDERED_NODE_TYPE,
		  null
		).singleNodeValue;
	  } catch {
		return null;
	  }
	}

	function closestButton(el) {
	  return el?.closest ? el.closest("button") : null;
	}
    function showOverlay(on) {
      const ov = document.getElementById("luckyOverlay");
      if (!ov) return;
      ov.style.display = on ? "flex" : "none";
      document.documentElement.style.overflow = on ? "hidden" : "";
    }
    function ensureWheelUI() {
      if (document.getElementById("luckyOverlay")) return;

      const style = document.createElement("style");
      style.textContent = `


/* ── Reset & base ── */
#luckyOverlay {
  position: fixed !important;
  inset: 0 !important;
  display: none;
  align-items: center !important;
  justify-content: center !important;
  z-index: 2147483647 !important;
  background: rgba(0,0,0,0.45) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
  /* évite tout scroll horizontal */
  overflow: hidden !important;
}

#luckyOverlay,
#luckyOverlay * {
  box-sizing: border-box;
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
}

/* ── Modal ── */
#luckyModal {
  position: relative;
  width: 800px;
  /* clé : jamais plus large que l'écran, avec marge */
  max-width: min(94vw, 800px);
  background: #ffffff;
  border-radius: 24px;
  box-shadow:
    0 0 0 1px rgba(22,163,74,0.12),
    0 2px 8px rgba(0,0,0,0.08),
    0 24px 80px rgba(0,0,0,0.28);
  padding: 22px 22px 20px;
  overflow: hidden;
  border-top: 3px solid #22c55e;
}

/* bande décorative derrière le header — blanc pur */
#luckyModal::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 72px;
  background: #ffffff;
  pointer-events: none;
  z-index: 0;
}

/* ── Header ── */
#luckyTop {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

#luckyTitle {
  font-size: 17px;
  font-weight: 900;
  color: #0f1a12;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

#luckyClose {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
  line-height: 0;
  display: flex;
  align-items: center;
  transition: opacity .2s;
}
#luckyClose:hover { opacity: .75; }
#luckyClose img {
  width: 80px;
  height: auto;
  display: block;
}

/* ── Body layout ── */
#luckyBody {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 22px;
  align-items: center;
}

/* ── Canvas wrap ── */
#luckyCanvasWrap {
  position: relative;
  width: 500px;
  height: 500px;
  flex: 0 0 auto;
  /* jamais plus large que le viewport disponible */
  max-width: 100%;
}

/* Pointer SVG inline — remplace l'ancien div triangle */
#luckyPointer {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  width: 28px;
  height: 36px;
  /* flèche SVG encodée en base64 — vert doré */
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 36'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%2386efac'/%3E%3Cstop offset='50%25' stop-color='%2322c55e'/%3E%3Cstop offset='100%25' stop-color='%2315803d'/%3E%3C/linearGradient%3E%3Cfilter id='s'%3E%3CfeDropShadow dx='0' dy='2' stdDeviation='3' flood-color='%23000' flood-opacity='.45'/%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M14 36 L1 9 Q14 -2 27 9 Z' fill='url(%23g)' filter='url(%23s)'/%3E%3Ccircle cx='14' cy='9' r='4.5' fill='%23fff' stroke='%2322c55e' stroke-width='1.8'/%3E%3C/svg%3E") center/contain no-repeat;
  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
}

#luckyCanvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* ── Info panel ── */
#luckyInfo {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

#luckyInfo > p {
  margin: 0;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
}

/* ── Result box ── */
#luckyResult {
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 14px;
  color: #111827;
  line-height: 1.45;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  transition: border-color .3s, background .3s;
}

/* état gagné */
#luckyResult.lucky-win {
  border-color: #22c55e;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

/* code promo pill */
#luckyResult .luckyRow {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  max-width: 100%;
  margin-top: 8px;
}

#luckyPromoCode {
  display: inline-block;
  padding: 7px 12px;
  border: 1.5px dashed #16a34a;
  border-radius: 10px;
  background: #fff;
  font-family: 'Outfit', monospace;
  font-weight: 900;
  font-size: 15px;
  color: #15803d;
  letter-spacing: .06em;
  max-width: 100%;
  overflow-wrap: anywhere;
}

/* ── Boutons ── */
#luckyActions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

#luckySpinBtn,
#luckyContinueBtn {
  border: 0;
  cursor: pointer;
  border-radius: 50px;
  padding: 12px 22px;
  font-family: 'Outfit', system-ui, sans-serif;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: .01em;
  transition: transform .15s, box-shadow .15s, opacity .15s;
}

#luckySpinBtn {
  background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(22,163,74,0.35), 0 1px 3px rgba(0,0,0,0.1);
}
#luckySpinBtn:hover:not([disabled]) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(22,163,74,0.45);
}
#luckySpinBtn:active:not([disabled]) { transform: translateY(0); }

#luckyContinueBtn {
  display: none;
  background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
  color: #fff;
  border: 0;
  box-shadow: 0 4px 16px rgba(22,163,74,0.35);
}
#luckyContinueBtn:hover:not([disabled]) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(22,163,74,0.45);
}

#luckySpinBtn[disabled],
#luckyContinueBtn[disabled] {
  opacity: .5;
  cursor: not-allowed;
  transform: none !important;
}

#luckyCopyBtn {
  border: 0;
  cursor: pointer;
  border-radius: 50px;
  padding: 7px 14px;
  font-family: 'Outfit', system-ui, sans-serif;
  font-weight: 900;
  font-size: 13px;
  background: #111827;
  color: #fff;
  transition: background .2s, transform .15s;
}
#luckyCopyBtn:hover { background: #1f2937; transform: translateY(-1px); }

#luckyCopyState {
  margin-top: 6px;
  font-size: 12px;
  color: #16a34a;
  font-weight: 700;
}

/* ── Mobile ── */
@media (max-width: 600px) {
  #luckyOverlay {
    align-items: flex-end !important;
    padding: 0 !important;
  }
  #luckyModal {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 92vh;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 20px 20px 0 0;
    padding: 16px 14px 24px;
  }
  #luckyBody {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    overflow: hidden;
  }
  /* sur mobile : canvas = largeur du modal - padding */
  #luckyCanvasWrap {
    width: min(calc(100vw - 32px), 360px) !important;
    height: min(calc(100vw - 32px), 360px) !important;
    max-width: 500px;
    max-height: 500px;
    margin: 0 auto;
  }
  #luckyActions {
    position: sticky;
    bottom: 0;
    background: #fff;
    padding-top: 10px;
  }
  #luckySpinBtn,
  #luckyContinueBtn { width: 100%; text-align: center; }
  #luckyResult .luckyRow { flex-direction: column; align-items: stretch; }
  #luckyResult .luckyRow button { width: 100%; }
  #luckyPointer {
    width: 22px;
    height: 28px;
    top: -12px;
  }
}
      `;
      document.head.appendChild(style);
	  window.__lucky_canClose = false;
      const overlay = document.createElement("div");
      overlay.id = "luckyOverlay";
      overlay.innerHTML = `
        <div id="luckyModal" role="dialog" aria-modal="true">
          <div id="luckyTop">
            <div id="luckyTitle"></div>
            <button id="luckyClose" aria-label="Fermer" title="Fermer">
			  <img
				src="https://cdn.prod.website-files.com/669922cad4a7f6612dfadca6/669922cad4a7f6612dfade89_Logo%20large%20UniGames.svg"
				alt="UniGames"
				width="91"
				height="48"
			  />
			</button>
          </div>
          <div id="luckyBody">
            <div id="luckyCanvasWrap">
              <div id="luckyPointer"></div>
              <canvas id="luckyCanvas" width="280" height="280"></canvas>
            </div>
            <div id="luckyInfo">
              <p>La chance sera t-elle avec vous ?</p>
              <div id="luckyResult">Cliquez sur <b>Tourner</b>.</div>
              <div id="luckyActions">
                <button id="luckySpinBtn">Tourner</button>
                <button id="luckyContinueBtn">J’ai noté le code</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.documentElement.appendChild(overlay);
	try {
	  const cfg = getLuckyConfig();
	  const titleEl = overlay.querySelector("#luckyTitle");
	  if (titleEl) titleEl.textContent = cfg.title || "🎁 Tentez votre chance 😉";
	} catch {}	  
	  

		const closeBtn = overlay.querySelector("#luckyClose");
		const tryClose = () => {
		  if (!window.__lucky_canClose) return;
		  document.dispatchEvent(new CustomEvent("lucky:close"));
		};

		overlay.addEventListener("click", (e) => { if (e.target === overlay) tryClose(); });
		closeBtn.addEventListener("click", tryClose);
    }

function resizeLuckyWheel(ctx) {
  const wrap  = document.getElementById("luckyCanvasWrap");
  const canvas = document.getElementById("luckyCanvas");
  if (!wrap || !canvas || !ctx) return 280;
  const parent = wrap.parentElement; 
  const parentW = Math.floor((parent?.getBoundingClientRect().width || window.innerWidth) - 2);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
	const size = Math.max(
	  220,
	  Math.min(
		500, 
		parentW,
		Math.floor(vw * 0.92),
		Math.floor(vh * 0.55)  
	  )
	);
  wrap.style.width  = size + "px";
  wrap.style.height = size + "px";
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = "100%";
  canvas.style.height = "100%";
  canvas.width  = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return size;
}

function isVisible(el){
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function findCurrentAddToCartButton() {
  const candidates = Array.from(document.querySelectorAll("button,a,[role='button']"))
    .filter(isVisible);

  for (const c of candidates) {
    const btn = c.closest?.("button,a,[role='button']") || c;
    if (isAddToCartButton(btn)) return btn;
  }
  return null;
}
function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
function startLuckyReplayWatcher() {
  let stopped = false;
  let raf = 0;

  const update = () => {
    if (stopped) return;
    const btn = findCurrentAddToCartButton();
    if (btn) window.__luckyReplayTarget = btn;
  };

  update();

  const mo = new MutationObserver(() => {
    if (stopped) return;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      update();
    });
  });

  mo.observe(document.body, { childList: true, subtree: true, attributes: true });
  const onResize = () => update();
  window.addEventListener("resize", onResize, { passive: true });

  return () => {
    stopped = true;
    try { mo.disconnect(); } catch {}
    try { window.removeEventListener("resize", onResize); } catch {}
    if (raf) cancelAnimationFrame(raf);
  };
}

function replayAddToCartSafely(originalBtn) {
  console.log("[lucky] replayAddToCartSafely using watcher =", !!window.__luckyReplayTarget);
  const setBypass = (btn) => {
    try { btn.dataset.luckyBypass = "1"; } catch {}
    setTimeout(() => { try { delete btn.dataset.luckyBypass; } catch {} }, 0);
  };
  const live = window.__luckyReplayTarget;
  if (live && live.isConnected) {
    setBypass(live);
    const f = live.closest("form");
    if (f?.requestSubmit) { f.requestSubmit(live); return true; }
    live.click();
    return true;
  }
  if (originalBtn && originalBtn.isConnected) {
    setBypass(originalBtn);
    const f = originalBtn.closest("form");
    if (f?.requestSubmit) { f.requestSubmit(originalBtn); return true; }
    originalBtn.click();
    return true;
  }
  const btn = findCurrentAddToCartButton();
  if (!btn) return false;

  setBypass(btn);
  const f = btn.closest("form");
  if (f?.requestSubmit) { f.requestSubmit(btn); return true; }
  btn.click();
  return true;
}
let winPaletteIdx = 0;

function drawWheel(ctx, angle, segments, size) {
  const cx = size / 2, cy = size / 2;
  const r  = Math.min(cx, cy) - 6;
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap  = "butt";
  ctx.lineJoin = "miter";

  const n    = segments.length;
  const step = (Math.PI * 2) / n;
  winPaletteIdx = 0;
  const greenPalettes = [
    { inner: "#6ee7a0", outer: "#16a34a" },
    { inner: "#86efac", outer: "#22c55e" },
    { inner: "#4ade80", outer: "#15803d" }, 
    { inner: "#a7f3c0", outer: "#34d068" }, 
  ];

  function segPalette(label) {
    const isLost = label === "Perdu, désolé" || label === "Perdu, désolé";
    if (isLost) {
      return { inner: "#f0f7f0", outer: "#d4ead4" };
    }
    const pal = greenPalettes[winPaletteIdx % greenPalettes.length];
    winPaletteIdx++;
    return pal;
  }
  let winIdx = 0;
  for (let i = 0; i < n; i++) {
    const start = angle + i * step;
    const end   = start + step;
    const mid   = start + step / 2;
    const label = segments[i].label || "";
    const isLost = label === "Perdu, désolé" || label === "Perdu, désolé";

    if (!isLost) winIdx++;
    const pal = segPalette(label);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0,    lightenHex(pal.inner, 30));
    grd.addColorStop(0.38, pal.inner);
    grd.addColorStop(1,    pal.outer);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.clip();
    const glowGrd = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
    glowGrd.addColorStop(0,   "rgba(255,255,255,0)");
    glowGrd.addColorStop(0.7, "rgba(255,255,255,0)");
    glowGrd.addColorStop(1,   isLost ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.12)");
    ctx.fillStyle = glowGrd;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);
    ctx.textAlign  = "right";
    ctx.shadowBlur = 0;

    if (isLost) {
      ctx.font          = `700 ${Math.max(10, size * 0.038)}px 'Outfit',system-ui,Arial`;
      ctx.fillStyle     = "#3a7a3a";
      ctx.shadowColor   = "rgba(255,255,255,0.6)";
      ctx.shadowBlur    = 2;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(label, r - 14, 5);
    } else {
      ctx.shadowColor   = "rgba(0,80,0,0.4)";
      ctx.shadowBlur    = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      // ctx.font      = `900 ${Math.max(11, size * 0.048)}px 'Outfit',system-ui,Arial`;
	  ctx.font          = `700 ${Math.max(10, size * 0.038)}px 'Outfit',system-ui,Arial`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, r - 14, 5);
    }
    ctx.restore();
  }
  const centerR = Math.round(size * 0.058);
  const innerR  = centerR + 3;
  const outerR  = r - 5;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2, false);
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  for (let i = 0; i < n; i++) {
    const a  = angle + i * step;
    const x1 = cx + Math.cos(a) * innerR, y1 = cy + Math.sin(a) * innerR;
    const x2 = cx + Math.cos(a) * outerR, y2 = cy + Math.sin(a) * outerR;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.lineWidth   = 2.5;
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.stroke();

    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
    ctx.lineWidth   = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.70)";
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth   = 10;
  ctx.strokeStyle = "#22c55e";
  ctx.stroke();
  const ringGrd = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrd.addColorStop(0,    "#d9f99d");
  ringGrd.addColorStop(0.25, "#4ade80");
  ringGrd.addColorStop(0.5,  "#bbf7d0");
  ringGrd.addColorStop(0.75, "#22c55e");
  ringGrd.addColorStop(1,    "#d9f99d");

  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.lineWidth   = 3;
  ctx.strokeStyle = ringGrd;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
  ctx.lineWidth   = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.30)";
  ctx.stroke();
  const nailR    = Math.max(4, size * 0.018);
  const nailDist = r - 15;

  for (let i = 0; i < n; i++) {
    const a  = angle + i * step;
    const nx = cx + Math.cos(a) * nailDist;
    const ny = cy + Math.sin(a) * nailDist;
    ctx.beginPath();
    ctx.arc(nx, ny, nailR + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
    const ng = ctx.createRadialGradient(nx - nailR*.35, ny - nailR*.35, nailR*.1, nx, ny, nailR);
    ng.addColorStop(0,   "#ffffff");
    ng.addColorStop(0.4, "#86efac");
    ng.addColorStop(1,   "#22c55e");
    ctx.beginPath();
    ctx.arc(nx, ny, nailR, 0, Math.PI * 2);
    ctx.fillStyle = ng;
    ctx.fill();

    ctx.lineWidth   = .8;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.stroke();
  }
  const hubGrd = ctx.createRadialGradient(cx - centerR*.3, cy - centerR*.3, centerR*.06, cx, cy, centerR);
  hubGrd.addColorStop(0,   "#bbf7d0");
  hubGrd.addColorStop(0.4, "#4ade80");
  hubGrd.addColorStop(1,   "#16a34a");
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
  ctx.fillStyle = hubGrd;
  ctx.fill();
  ctx.lineWidth   = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.stroke();
  const hubReflet = ctx.createRadialGradient(cx - centerR*.3, cy - centerR*.35, 0, cx, cy, centerR*.85);
  hubReflet.addColorStop(0,   "rgba(255,255,255,0.50)");
  hubReflet.addColorStop(0.5, "rgba(255,255,255,0.10)");
  hubReflet.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
  ctx.fillStyle = hubReflet;
  ctx.fill();
}
function lightenHex(hex, amt) {
  const n = parseInt((hex || "#000").replace("#",""), 16);
  const r = Math.min(255, (n >> 16)        + amt);
  const g = Math.min(255, ((n >> 8) & 0xff)+ amt);
  const b = Math.min(255, (n & 0xff)       + amt);
  return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
}
    async function spinWheelButAlwaysWin5() {	
      ensureWheelUI();
		refreshLuckyActivity("before-spin");
		const cfg = getLuckyConfig();
		const PROMO_CODE = cfg.promoCode;	  

      const canvas = document.getElementById("luckyCanvas");
      const ctx = canvas.getContext("2d");
      const spinBtn = document.getElementById("luckySpinBtn");
      const contBtn = document.getElementById("luckyContinueBtn");
      const result = document.getElementById("luckyResult");

	  
		if (!window.__luckyResizeBound) {
		  window.__luckyResizeBound = true;

	  let raf = 0;

	  window.addEventListener("resize", () => {
		const ov = document.getElementById("luckyOverlay");
		if (!ov || ov.style.display !== "flex") return;

		const st = window.__luckyWheelState;
		if (!st || !st.ctx || !st.segments) return;
		if (raf) return;
		raf = requestAnimationFrame(() => {
		  raf = 0;

		  const ov2 = document.getElementById("luckyOverlay");
		  if (!ov2 || ov2.style.display !== "flex") return;

		  const spinBtn = document.getElementById("luckySpinBtn");
		  const spinning = spinBtn?.dataset?.spinning === "1";
		  requestAnimationFrame(() => {
			requestAnimationFrame(() => {
			  const ov3 = document.getElementById("luckyOverlay");
			  if (!ov3 || ov3.style.display !== "flex") return;

			  st.wheelSize = resizeLuckyWheel(st.ctx);

			  if (spinning) {
				st.pendingResize = true;
			  } else {
				drawWheel(st.ctx, st.angle || 0, st.segments, st.wheelSize);
			  }
			});
		  });
		});
	  }, { passive: true });
	  }

      showOverlay(true);
	  window.__lucky_canClose = false;
	  let wheelSize = resizeLuckyWheel(ctx);
	  window.__luckyWheelState = { ctx, angle: 0, segments: null, wheelSize };
let segments = (cfg.segments || []).slice();
if (!segments.length) segments = LUCKY_CONFIGS.default.segments.slice();

(function arrangeAlternating() {
  const perdus = segments.filter(s => s.label === "Perdu, désolé" || s.label === "perdu");
  const lots   = segments.filter(s => s.label !== "Perdu, désolé" && s.label !== "perdu");
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  shuffle(perdus);
  shuffle(lots);
  const result = [];
  const len = Math.max(perdus.length, lots.length);
  for (let i = 0; i < len; i++) {
    if (i < perdus.length) result.push(perdus[i]);
    if (i < lots.length)   result.push(lots[i]);
  }
  segments = result;
})();

      window.__luckyWheelState.segments = segments;
      const step = (Math.PI * 2) / segments.length;
	  
	const winLabel = cfg.forceWinLabel;
	let candidates;

	if (winLabel) {
	  candidates = segments.map((s,i)=> (s.label === winLabel ? i : -1)).filter(i=>i!==-1);
	} else {
	  candidates = segments.map((s,i)=> (s.label !== "Perdu, désolé" ? i : -1)).filter(i=>i!==-1);
	}
	if (!candidates.length) candidates = [0];

	const targetIndex = candidates[Math.floor(Math.random() * candidates.length)];	  

      let angle = 0;
      drawWheel(ctx, angle, segments, wheelSize);

      spinBtn.disabled = false;
      spinBtn.style.display = "inline-block";
      contBtn.style.display = "none";
      result.innerHTML = `Cliquez sur <b>Tourner</b>.`;
	  contBtn.onclick = null;

return new Promise((resolve) => {
  let done = false;

  const closeAndResolve = () => {
    if (done) return;
    if (!window.__lucky_canClose) return;
    done = true;

    showOverlay(false);
    document.removeEventListener("lucky:close", closeAndResolve);
	const st = window.__luckyWheelState;
	if (st) {
	  st.pendingResize = false;
	}
    resolve(5);
  };
  document.addEventListener("lucky:close", closeAndResolve);
  contBtn.onclick = closeAndResolve;

spinBtn.onclick = () => {
  if (spinBtn.dataset.spinning === "1") return;
  spinBtn.dataset.spinning = "1";
  spinBtn.disabled = true;
  result.textContent = "Ça tourne…";
  wheelSize = resizeLuckyWheel(ctx);
  window.__luckyWheelState.wheelSize = wheelSize;

  const pointerAngle = -Math.PI / 2;
  const targetCenter = angle + targetIndex * step + step / 2;
  const targetDelta = pointerAngle - targetCenter;
  const finalAngle = angle + 6 * (Math.PI * 2) + targetDelta;

  const start = angle;
  let t0 = 0;
  const dur = 1600;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    if (!t0) t0 = now;
    const st = window.__luckyWheelState;
    if (st?.pendingResize) {
      st.pendingResize = false;
      wheelSize = resizeLuckyWheel(ctx);
      st.wheelSize = wheelSize;
    } else if (st?.wheelSize) {
      wheelSize = st.wheelSize;
    }

    const t = Math.min(1, (now - t0) / dur);
    angle = start + (finalAngle - start) * easeOut(t);
    window.__luckyWheelState.angle = angle;

    drawWheel(ctx, angle, segments, wheelSize);

    if (t < 1) return requestAnimationFrame(frame);
    drawWheel(ctx, finalAngle, segments, wheelSize);

    window.__lucky_canClose = true;
    delete spinBtn.dataset.spinning;
	const won = segments[targetIndex]?.label || "🎉";
    result.innerHTML = `
      <b>Bravo !</b> Vous gagnez <b>${won}</b> 🎉<br>
      <span style="color:#6b7280">Votre code promo :</span>
      <div class="luckyRow" style="margin-top:8px;">
        <code id="luckyPromoCode" style="padding:6px 10px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; font-weight:900;">
          ${PROMO_CODE}
        </code>
        <button id="luckyCopyBtn" style="border:0; cursor:pointer; border-radius:999px; padding:8px 12px; font-weight:900; background:#111827; color:#fff;">
          Copier
        </button>
      </div>
      <div id="luckyCopyState" style="margin-top:6px; color:#6b7280; font-size:12px;"></div>
    `;
    requestAnimationFrame(() => {
      wheelSize = resizeLuckyWheel(ctx);
      window.__luckyWheelState.wheelSize = wheelSize;
      drawWheel(ctx, angle, segments, wheelSize);
    });

    const copyBtn = document.getElementById("luckyCopyBtn");
    const copyState = document.getElementById("luckyCopyState");
    copyBtn?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(PROMO_CODE);
        copyState.textContent = "Code copié ✅";
      } catch {
        copyState.textContent = "Copie impossible, sélectionne le code manuellement.";
      }
    });

    spinBtn.style.display = "none";
    contBtn.style.display = "inline-block";
    contBtn.disabled = false;
    contBtn.onclick = closeAndResolve;
  }

  requestAnimationFrame(frame);
};
});

    }
    function getClickableTarget(e) {
      const path = e.composedPath ? e.composedPath() : [];
      const nodes = path.length ? path : (function(){
        const a=[]; let n=e.target;
        while(n){ a.push(n); n=n.parentElement; }
        return a;
      })();

      for (const el of nodes){
        if (!el || el===document || el===window) continue;
        const tag = (el.tagName||"").toLowerCase();
        if (tag==="button") return el;
        const role = (el.getAttribute && el.getAttribute("role")) || "";
        if (role.toLowerCase()==="button") return el;
        if (tag==="a") return el;
      }
      return e.target;
    }

function isAddToCartButton(el) {
  if (!el) return false;

  const tag = (el.tagName || "").toLowerCase();
  const role = (el.getAttribute && el.getAttribute("role")) || "";
  if (!(tag === "button" || tag === "a" || role.toLowerCase() === "button")) return false;

  const t = norm(el.textContent);
  if (t.includes("ajouter au panier")) return true;
  if (t === "ajouter" || t.includes("ajouter au") || t.includes("add to cart")) return true;

  return false;
}


function getClickedActionElement(e) {
  return getClickableTarget(e);
}

function isClickOnAddToCart(e) {
  const el = getClickedActionElement(e);
  const btn = el?.closest?.("button,a,[role='button']") || el;
  return isAddToCartButton(btn) ? btn : null;
}
function getCartFingerprint() {
  const recap =
    document.querySelector("form.step-cart-recap-coupon")?.closest("div,section,article,aside") ||
    Array.from(document.querySelectorAll("div,section,article,aside")).find(el => {
      const t = (el.textContent || "").toLowerCase();
      return t.includes("récapitulatif") && t.includes("total") && t.includes("€");
    }) ||
    null;

  if (!recap) return null;
  return (recap.textContent || "").replace(/\s+/g, " ").trim();
}

function isOnCartPage() {
  return !!document.querySelector("form.step-cart-recap-coupon");
}
let lastCartFp = null;
let lastOnCart = false;

setInterval(() => {
  try {
    const onCart = isOnCartPage();

    if (onCart) {
      const fp = getCartFingerprint();
      const cartChanged = fp && fp !== lastCartFp;

      if ((!lastOnCart && onCart) || cartChanged) {
        console.log("[lucky] cart entered/changed -> reset wheel");
        lastCartFp = fp;
        window.__lucky_done = false;
      }
    }

    lastOnCart = onCart;
  } catch (e) {
    console.warn("[lucky] reset loop error", e);
  }
}, 500);

    let busy = false;

document.addEventListener("click", async (e) => {
  const addBtn = isClickOnAddToCart(e);
  if (!addBtn) return;

  const el = addBtn;

  if (el.dataset && el.dataset.luckyBypass === "1") return;
  if (busy) return;

  busy = true;
  let stopWatch = null;

  try {
    log("INTERCEPT add-to-cart:", (el.textContent || "").trim());

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    stopWatch = startLuckyReplayWatcher();
    await spinWheelButAlwaysWin5();
    if (stopWatch) { stopWatch(); stopWatch = null; }
    await nextFrame();

    console.log("[lucky] replay: el.isConnected =", !!(el && el.isConnected));
    console.log("[lucky] replayTarget isConnected =", !!(window.__luckyReplayTarget && window.__luckyReplayTarget.isConnected));
    const ok = replayAddToCartSafely(el);
    if (!ok) console.warn("[lucky] add-to-cart not replayed (button not found)");
    window.__lucky_done = true;

  } catch (err) {
    console.error("[lucky] error", err);
    if (stopWatch) { stopWatch(); stopWatch = null; }
    try {
      await nextFrame();
      const ok = replayAddToCartSafely(el);
      if (!ok) console.warn("[lucky] fallback replay failed");
    } catch {}
  } finally {
    if (stopWatch) { stopWatch(); stopWatch = null; }
    window.__luckyReplayTarget = null;	
    busy = false;
  }
}, true);


    log("installed");
  })();
  

(function(){
  const norm = window.__ug_norm || function (s) {
    return (s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[’']/g, "'")
      .trim();
  };

  const GOOGLE_ZONE_CONFIG = {
    landes: {
      label: "Google",
      url: "https://www.google.com/maps/place/UniGames+Landes+-+Bubble+Foot+%2F+Archery-Games+%2F+Laser+Game+%2F+Escape+Game+%26+Murder+Party+Landes,+45+Rte+de+Hort,+40990+Saint-Vincent-de-Paul/data=!4m2!3m1!1s0xd56a7246bac4acb:0xb7255dbddb3b9eea!18m1!1e1?utm_source=mstt_1&entry=gps&coh=192189&g_ep=CAESBzI2LjExLjYYACCenQoqnQEsOTQyNjc3MjcsOTQyOTIxOTUsOTQyOTk1MzIsMTAwNzk2NDk4LDEwMDc5Nzc2MSwxMDA3OTY1MzUsOTQyODQ0OTYsOTQyODA1NzYsOTQyMDczOTQsOTQyMDc1MDYsOTQyMDg1MDYsOTQyMTg2NTMsOTQyMjk4MzksOTQyNzUxNjgsOTQyNzk2MTksOTQyNjI3MzMsMTAwNzk2MTg2QgJGUg%3D%3D&skid=3501c5d4-1e13-45db-b7d7-1ff2600055bf",
      rating: 4.8,
      reviews: 51
    },
    pau: {
      label: "Google",
      url: "https://www.google.com/maps/place/UniGames+Pau+Lescar+-+Bubble+Foot+%2F+Archery+Game+%2F+Laser+Game+%2F+Escape+Game+%26+Murder+Party,+10+Chem.+des+3+Ponts,+64230+Lescar/data=!4m2!3m1!1s0xd564f4430cb219b:0x4c93ea9b896833c5!18m1!1e1?utm_source=mstt_1&entry=gps&coh=192189&g_ep=CAESBzI2LjExLjYYACCenQoqnQEsOTQyNjc3MjcsOTQyOTIxOTUsOTQyOTk1MzIsMTAwNzk2NDk4LDEwMDc5Nzc2MSwxMDA3OTY1MzUsOTQyODQ0OTYsOTQyODA1NzYsOTQyMDczOTQsOTQyMDc1MDYsOTQyMDg1MDYsOTQyMTg2NTMsOTQyMjk4MzksOTQyNzUxNjgsOTQyNzk2MTksOTQyNjI3MzMsMTAwNzk2MTg2QgJGUg%3D%3D&skid=3e5d3e90-0c95-4b8d-9bf2-5a1222beef44&g_st=ac",
      rating: 4.9,
      reviews: 59
    },
    bordeaux: {
      label: "Google",
      url: "https://google.com/maps/place/Bubble+Foot+Bordeaux+-+UniGames+%7C+Laser,+Archery,+Escape+%26+Murder,+16+Av.+Louis+de+Broglie,+33600+Pessac/data=!4m2!3m1!1s0xd54d92944c36b47:0xb0a5dd72a273165c!18m1!1e1?utm_source=mstt_1&entry=gps&coh=192189&g_ep=CAESBzI2LjExLjYYACCenQoqnQEsOTQyNjc3MjcsOTQyOTIxOTUsOTQyOTk1MzIsMTAwNzk2NDk4LDEwMDc5Nzc2MSwxMDA3OTY1MzUsOTQyODQ0OTYsOTQyODA1NzYsOTQyMDczOTQsOTQyMDc1MDYsOTQyMDg1MDYsOTQyMTg2NTMsOTQyMjk4MzksOTQyNzUxNjgsOTQyNzk2MTksOTQyNjI3MzMsMTAwNzk2MTg2QgJGUg%3D%3D&skid=651c1105-3552-4405-a695-15ae4bc4e4cd&g_st=ac",
      rating: 5.0,
      reviews: 351
    },
    default: {
      label: "Google",
      url: "https://maps.app.goo.gl/TON-LIEN-DEFAULT",
      rating: 5.0,
      reviews: 100
    }
  };

  const DEBUG_GOOGLE_ZONE = false;

  function gLog(...a){
    if (DEBUG_GOOGLE_ZONE) console.log("[google-zone]", ...a);
  }

  function isVisible(el){
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect?.();
    return !!(r && r.width > 2 && r.height > 2);
  }

  function findValidateButton(){
    return Array.from(document.querySelectorAll("button"))
      .find(b => norm(b.textContent) === "valider le panier" && isVisible(b)) || null;
  }

  function starsSVG(rating){
    const full = Math.floor(rating);
    const half = (rating - full) >= 0.25 && (rating - full) < 0.75 ? 1 : 0;
    const empty = 5 - full - half;

    const star = (fill) => `
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style="display:block">
        <path fill="${fill}" d="M12 17.27l5.18 3.04-1.64-5.81L20 9.24l-5.9-.5L12 3.5 9.9 8.74 4 9.24l4.46 5.22-1.64 5.81z"/>
      </svg>
    `;

    const halfStar = (gid) => `
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style="display:block">
        <defs>
          <linearGradient id="${gid}">
            <stop offset="50%" stop-color="#FBBF24"/>
            <stop offset="50%" stop-color="#E5E7EB"/>
          </linearGradient>
        </defs>
        <path fill="url(#${gid})" d="M12 17.27l5.18 3.04-1.64-5.81L20 9.24l-5.9-.5L12 3.5 9.9 8.74 4 9.24l4.46 5.22-1.64 5.81z"/>
      </svg>
    `;

    const gid = "halfGrad_" + Math.random().toString(36).slice(2);

    let html = "";
    for (let i = 0; i < full; i++) html += star("#FBBF24");
    if (half) html += halfStar(gid);
    for (let i = 0; i < empty; i++) html += star("#E5E7EB");
    return html;
  }

  function detectZone() {
    const priorityNodes = [
      ...document.querySelectorAll(".experience-cart-card-activity"),
      ...document.querySelectorAll(".activity-card-title"),
      ...document.querySelectorAll(".package-item-name-content"),
      ...document.querySelectorAll(".package-item-name"),
      ...document.querySelectorAll(".g-group-field-label"),
      ...document.querySelectorAll(".g-step-page-title"),
      ...document.querySelectorAll(".g-step-page-subtitle"),
      document.querySelector("[data-w-tab].w--current")
    ].filter(Boolean);

    const seen = [];

    for (const el of priorityNodes) {
      const txt = norm(el.textContent || "");
      if (!txt) continue;
      seen.push(txt);

      if (txt.includes("landes")) {
        gLog("zone=landes via", txt);
        return "landes";
      }
      if (txt.includes("pau")) {
        gLog("zone=pau via", txt);
        return "pau";
      }
      if (txt.includes("bordeaux")) {
        gLog("zone=bordeaux via", txt);
        return "bordeaux";
      }
    }

    const fallback = norm(document.body?.innerText || "");
    if (fallback.includes("landes")) return "landes";
    if (fallback.includes("pau")) return "pau";
    if (fallback.includes("bordeaux")) return "bordeaux";

    gLog("zone=default", seen);
    return "default";
  }

  function buildBlockHtml(cfg){
    return `
      <span style="font-weight:800; color:inherit; pointer-events:none;">${cfg.label || "Google"}</span>
      <span style="display:flex; gap:2px; align-items:center; transform:translateY(0.5px); pointer-events:none;">
        ${starsSVG(Number(cfg.rating || 5))}
      </span>
      <span style="font-weight:900; color:inherit; pointer-events:none;">
        ${Number(cfg.rating || 5).toFixed(1).replace(".", ",")}
      </span>
      <span style="color:inherit; pointer-events:none;">
        (${Number(cfg.reviews || 0).toLocaleString("fr-FR")} avis)
      </span>
    `;
  }

  function mount(){
    const btn = findValidateButton();
    if (!btn) return;

    const zone = detectZone();
    const cfg = GOOGLE_ZONE_CONFIG[zone] || GOOGLE_ZONE_CONFIG.default;

    let wrap = document.getElementById("googleReviewsBlock");

    if (!wrap) {
      wrap = document.createElement("a");
      wrap.id = "googleReviewsBlock";
      wrap.target = "_blank";
      wrap.rel = "noopener noreferrer";
      wrap.style.cssText = `
        display:flex;
        justify-content:center;
        align-items:center;
        gap:8px;
        margin-top:10px;
        width:100%;
        min-height:38px;
        text-decoration:none;
        color:#6b7280;
        font-size:14px;
        line-height:1.2;
        user-select:none;
        cursor:pointer;
        position:relative;
        z-index:20;
        pointer-events:auto;
        box-sizing:border-box;
      `;

      wrap.onmouseenter = () => { wrap.style.color = "#374151"; };
      wrap.onmouseleave = () => { wrap.style.color = "#6b7280"; };

      btn.insertAdjacentElement("afterend", wrap);
    } else if (wrap.previousElementSibling !== btn) {
      btn.insertAdjacentElement("afterend", wrap);
    }

    wrap.href = cfg.url || "#";
    wrap.innerHTML = buildBlockHtml(cfg);
  }

  let scheduled = false;
  function scheduleMount(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount();
    });
  }

  const obs = new MutationObserver(scheduleMount);
  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  mount();
  setTimeout(mount, 200);
  setTimeout(mount, 800);
  setTimeout(mount, 1500);
})();



(function(){
  function apply(){
    const wrap = document.querySelector(".cart-recap-bottom-columns.columns.is-mobile");
    if(!wrap) return;

    const firstCol = wrap.querySelector(":scope > .column:first-child");
    if(firstCol) firstCol.style.display = "none";

    wrap.style.display = "flex";
    wrap.style.justifyContent = "stretch";
    wrap.style.alignItems = "stretch";
    wrap.style.width = "100%";

    const visibleCols = Array.from(wrap.querySelectorAll(":scope > .column"))
      .filter(c => c !== firstCol && getComputedStyle(c).display !== "none");

    visibleCols.forEach(col => {
      col.style.flex = "1 1 100%";
      col.style.width = "100%";
      col.style.maxWidth = "none";
      col.style.minWidth = "0";
      col.style.textAlign = "left";
      col.style.margin = "0";
	  // col.style.overflowY = "auto";
    });
  }

  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

  apply();
  setTimeout(apply, 300);
  setTimeout(apply, 1000);
})();



(function(){
  function apply(){
    const wrap = document.querySelector(".reservation-recap-mobile.columns.is-mobile");
    if(!wrap) return;

    const firstCol = wrap.querySelector(":scope > .column:first-child");
    if(firstCol) firstCol.style.display = "none";

    wrap.style.display = "flex";
    wrap.style.justifyContent = "stretch";
    wrap.style.alignItems = "stretch";
    wrap.style.width = "100%";

    const visibleCols = Array.from(wrap.querySelectorAll(":scope > .column"))
      .filter(c => c !== firstCol && getComputedStyle(c).display !== "none");

    visibleCols.forEach(col => {
      col.style.flex = "1 1 100%";
      col.style.width = "100%";
      col.style.maxWidth = "none";
      col.style.minWidth = "0";
      col.style.textAlign = "left";
      col.style.margin = "0";
	  // col.style.overflowY = "auto";
    });
  }

  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, { childList:true, subtree:true, characterData:true });

  apply();
  setTimeout(apply, 300);
  setTimeout(apply, 1000);
})();



(function(){
const norm = window.__ug_norm;
function conditionsOk(){
  const txt = norm(document.body?.innerText || "");
  const hasGivenNameInput = !!document.querySelector('input[name="given-name"][autocomplete="given-name"]');
  return txt.includes("finalisez votre commande") && hasGivenNameInput;
}
  function hideTotalLine(){
    if(!conditionsOk()) return;

    const nodes = Array.from(document.querySelectorAll(".cart-recap-bottom-container-title"));
    for(const n of nodes){
      const label = n.querySelector(".cart-recap-bottom-label");
      if(label && norm(label.textContent) === "total"){
        n.style.display = "none";
      }
    }

	
	
  }
  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; hideTotalLine(); });
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, {childList:true, subtree:true});

  hideTotalLine();
  setTimeout(hideTotalLine, 300);
  setTimeout(hideTotalLine, 1000);
})();





(function(){
const norm = window.__ug_norm;
  function conditionsOk(){
    const txt = norm(document.body?.innerText || "");
    return txt.includes("valider le panier"); 
  }

  function hideTotalLine(){
    if(!conditionsOk()) return;

    const nodes = Array.from(document.querySelectorAll(".cart-recap-bottom-container-title"));
    for(const n of nodes){
      const label = n.querySelector(".cart-recap-bottom-label");
      if(label && norm(label.textContent) === "total"){
        n.style.display = "none";
      }
    }
    const el = document.querySelector(".step-cart-recap-sub-price");
    if(el) el.style.display = "none";
	
	
  }

  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; hideTotalLine(); });
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, {childList:true, subtree:true});

  hideTotalLine();
  setTimeout(hideTotalLine, 300);
  setTimeout(hideTotalLine, 1000);
})();


(function(){
const norm = window.__ug_norm;
  function conditionsOk(){
    const txt = norm(document.body?.innerText || "");
    return txt.includes("choisissez votre activité") && txt.includes("continuer");
  }

  function hideDesktopTotal(){
    if(!conditionsOk()) return;

    const el = document.querySelector(".reservation-recap-desktop-total");
    if(el) el.style.display = "none";
  }
  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; hideDesktopTotal(); });
  }

  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, {childList:true, subtree:true});

  hideDesktopTotal();
  setTimeout(hideDesktopTotal, 300);
  setTimeout(hideDesktopTotal, 1000);
})();

(function () {
  const XPATHS = [
    "/html/body/div[4]/div/div[2]/div/section/div/div[1]/div[1]/nav/div[2]/div[1]/span",
    "/html/body/div[3]/div/div[2]/div/section/div/div[1]/div[1]/nav/div[2]/div[1]/span",
  ];

  function getByXPath(xpath) {
    try {
      return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
        .singleNodeValue;
    } catch {
      return null;
    }
  }

  function hideCountdown() {
    let el = null;
    for (const xp of XPATHS) {
      el = getByXPath(xp);
      if (el) break;
    }
    if (!el) return;
    if (el.dataset && el.dataset.hiddenCountdown === "1") return;
    el.dataset.hiddenCountdown = "1";
    el.style.display = "none";
  }

  hideCountdown();
  const obs = new MutationObserver(hideCountdown);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(hideCountdown, 500);
  setTimeout(hideCountdown, 1500);
})();
(function () {
  const css = `
    .gdp-scoped-ui .package-item-amount,
    .guidap-mono-page-content .package-item-amount,
    .guidap-split-layout .package-item-amount{
      display:none !important;
    }
    .activity-card-price[data-hide-startingfrom="1"]{
      display:none !important;
    }
  `;

  let st = document.getElementById("hideGuidapStartingFromALL");
  if (!st) {
    st = document.createElement("style");
    st.id = "hideGuidapStartingFromALL";
    document.head.appendChild(st);
  }
  st.textContent = css;
})();


(function(){
  const RE_FROM = /^\s*(à\s*partir\s*de|a\s*partir\s*de)\b/i;

  function apply(){
    document.querySelectorAll(
      ".gdp-scoped-ui .package-item-amount," +
      ".guidap-mono-page-content .package-item-amount," +
      ".guidap-split-layout .package-item-amount"
    ).forEach(el => {
      if (el.dataset.hideStartingFromPkg === "1") return;
      el.dataset.hideStartingFromPkg = "1";
      el.style.setProperty("display","none","important");
    });

    const root =
      document.getElementById("guidap-popups") ||
      document.querySelector(".guidap-split-page") ||
      document;

    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll(".activity-card-price").forEach(el => {
      if (el.dataset.hideStartingfrom === "1") return;
      const txt = (el.textContent || "").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
      if (RE_FROM.test(txt)) {
        el.dataset.hideStartingfrom = "1";
        el.style.setProperty("display","none","important");
      }
    });
  }
  let scheduled = false;
  function schedule(){
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  }

  apply();
  const obs = new MutationObserver(schedule);
  obs.observe(document.documentElement, { childList:true, subtree:true });

  setTimeout(apply, 200);
  setTimeout(apply, 700);
  setTimeout(apply, 1400);
})();

(function () {
  const css = `
@media (max-width: 768px){
  .gdp-scoped-ui .reservation-recap-mobile,
  .gdp-scoped-ui .activity-info-reservation,
  .gdp-scoped-ui .cart-recap-bottom{
    overflow-x: scroll !important;
    height: 190px !important;
    overflow-y: hidden !important;
  }

  .gdp-scoped-ui .g-step-page-content {
    margin-bottom: 115px !important;
  }

  .gdp-scoped-ui .step-cart-recap{
    margin-bottom: 170px !important;
  }

  /* overflow: visible !important; */
}
  `;

  let st = document.getElementById("ugcart-mobile-css");
  if (!st) {
    st = document.createElement("style");
    st.id = "ugcart-mobile-css";
    document.head.appendChild(st);
  }
  st.textContent = css;
})();
