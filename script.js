/* ============================================================
   CONFIG
   ============================================================ */
const SERVER_DOMAIN = "caffemc.xyz";
const JAVA_PORT = "25565";
const BEDROCK_PORT = "19132";
const COPY_IP = SERVER_DOMAIN;

// If you deploy the included Cloudflare Worker, point this at it
// e.g. "https://coffemc-api.yourname.workers.dev"
// Leave empty to call mcsrvstat.us directly from the browser.
const WORKER_URL = "";

let checking = false;

/* ============================================================
   COPY SERVER IP
   ============================================================ */
function copyIP(){
  navigator.clipboard.writeText(COPY_IP);
  const msg = document.getElementById("copied");
  if(!msg) return;
  msg.classList.add("show");
  setTimeout(() => {
    msg.classList.remove("show");
  }, 2200);
}

/* ============================================================
   TOGGLE MOBILE MENU
   ============================================================ */
function toggleMenu(){
  const menu = document.getElementById("menu");
  if(!menu) return;
  menu.classList.toggle("show");
}

document.addEventListener("click", function(e){
  const menu = document.getElementById("menu");
  const button = document.querySelector(".menu-btn");
  if(!menu || !button) return;
  if(!menu.contains(e.target) && !button.contains(e.target)){
    menu.classList.remove("show");
  }
});

/* ============================================================
   SERVER STATUS + LIVE PLAYER LIST (Java + Bedrock)
   ============================================================ */
async function checkServer(){
  if(checking) return;
  checking = true;

  const els = {
    playersJava:    document.getElementById("playersJava"),
    playersBedrock: document.getElementById("playersBedrock"),
    dotJava:        document.getElementById("statusDotJava"),
    dotBedrock:     document.getElementById("statusDotBedrock"),
    onlineEl:       document.getElementById("onlineCount"),
    maxEl:          document.getElementById("maxCount"),
    gridEl:         document.getElementById("playerGrid"),
    emptyEl:        document.getElementById("playersEmpty"),
    emptyCount:     document.getElementById("emptyCount"),
    emptyNote:      document.getElementById("emptyNote"),
  };

  if(els.playersJava)    els.playersJava.textContent = "Checking...";
  if(els.playersBedrock) els.playersBedrock.textContent = "Checking...";

  try{
    let javaData, bedrockData;

    if(WORKER_URL){
      const url = `${WORKER_URL.replace(/\/$/, "")}/api/status?t=${Date.now()}`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if(!res.ok) throw new Error("API Error");
      const data = await res.json();
      javaData = data.java;
      bedrockData = data.bedrock;
    }else{
      const [javaRes, bedrockRes] = await Promise.all([
        fetch(`https://api.mcsrvstat.us/3/${SERVER_DOMAIN}?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`https://api.mcsrvstat.us/bedrock/3/${SERVER_DOMAIN}:${BEDROCK_PORT}?t=${Date.now()}`, { cache: "no-store" })
      ]);
      javaData    = javaRes.ok    ? await javaRes.json()    : { online: false };
      bedrockData = bedrockRes.ok ? await bedrockRes.json() : { online: false };
    }

    applyStatus(javaData, els.playersJava, els.dotJava);
    applyStatus(bedrockData, els.playersBedrock, els.dotBedrock);

    const javaOnline    = javaData?.online    ? (javaData.players?.online ?? 0)    : 0;
    const javaMax       = javaData?.online    ? (javaData.players?.max ?? 0)       : 0;
    const bedrockOnline = bedrockData?.online ? (bedrockData.players?.online ?? 0) : 0;
    const bedrockMax    = bedrockData?.online ? (bedrockData.players?.max ?? 0)    : 0;

    const totalOnline = javaOnline + bedrockOnline;
    const totalMax    = javaMax + bedrockMax;
    const anyOnline   = !!(javaData?.online || bedrockData?.online);

    if(els.onlineEl) els.onlineEl.textContent = totalOnline;
    if(els.maxEl)    els.maxEl.textContent = totalMax;

    const list = [
      ...(javaData?.players?.list ?? []),
      ...(bedrockData?.players?.list ?? [])
    ];

    if(anyOnline){
      renderPlayerList(totalOnline, list, els);
    }else{
      renderOfflineState(els);
    }
  }catch(err){
    console.error("Server check failed:", err);
    if(els.playersJava)    els.playersJava.textContent = "Offline";
    if(els.playersBedrock) els.playersBedrock.textContent = "Offline";
    if(els.dotJava)    els.dotJava.classList.remove("online");
    if(els.dotBedrock) els.dotBedrock.classList.remove("online");
    if(els.onlineEl) els.onlineEl.textContent = "0";
    if(els.maxEl)    els.maxEl.textContent = "0";
    renderOfflineState(els);
  }finally{
    checking = false;
  }
}

function applyStatus(data, textEl, dotEl){
  if(data && data.online === true){
    const online = data.players?.online ?? 0;
    const max    = data.players?.max ?? 0;
    if(textEl) textEl.textContent = `${online}/${max}`;
    if(dotEl) dotEl.classList.add("online");
  }else{
    if(textEl) textEl.textContent = "Offline";
    if(dotEl) dotEl.classList.remove("online");
  }
}

function renderPlayerList(online, list, els){
  const { gridEl, emptyEl, emptyCount, emptyNote } = els;
  if(!gridEl || !emptyEl) return;

  if(Array.isArray(list) && list.length > 0){
    gridEl.innerHTML = "";
    gridEl.style.display = "grid";
    emptyEl.style.display = "none";

    list.forEach(name => {
      const card = document.createElement("div");
      card.className = "player-card";

      const img = document.createElement("img");
      img.src = `https://mc-heads.net/avatar/${encodeURIComponent(name)}/48`;
      img.alt = "";
      img.loading = "lazy";

      const span = document.createElement("span");
      span.textContent = name;

      card.appendChild(img);
      card.appendChild(span);
      gridEl.appendChild(card);
    });
    return;
  }

  // online but no name list exposed by the server
  gridEl.style.display = "none";
  emptyEl.style.display = "flex";
  if(emptyCount) emptyCount.textContent = online;
  if(emptyNote) emptyNote.textContent = online > 0
    ? "Player list is private — only the count is shown."
    : "Be the first one in — the world is waiting.";
}

function renderOfflineState(els){
  const { gridEl, emptyEl, emptyCount, emptyNote } = els;
  if(!gridEl || !emptyEl) return;
  gridEl.style.display = "none";
  emptyEl.style.display = "flex";
  if(emptyCount) emptyCount.textContent = "0";
  if(emptyNote) emptyNote.textContent = "The server looks offline right now — try again shortly.";
}

checkServer();
setInterval(checkServer, 30000);

/* ============================================================
   STORE: CATEGORY TABS
   ============================================================ */
function switchTab(tab){
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === `tab-${tab}`);
  });
}

/* ============================================================
   STORE: CHECKOUT MODAL
   ============================================================ */
let currentItem = null;

const editionCopy = {
  java: {
    label: "Java username",
    placeholder: "e.g. SteveBuilds22",
    hint: "Case-sensitive — double check spelling before continuing.",
  },
  bedrock: {
    label: "Bedrock gamertag",
    placeholder: "e.g. Steve B 22",
    hint: "Enter your Xbox/gamertag exactly as it appears in-game.",
  },
};

function getSelectedEdition(){
  const checked = document.querySelector('input[name="edition"]:checked');
  return checked ? checked.value : "java";
}

function updateEditionCopy(){
  const edition = getSelectedEdition();
  const copy = editionCopy[edition] || editionCopy.java;
  const labelEl = document.getElementById("mcUsernameLabel");
  const inputEl = document.getElementById("mcUsername");
  const hintEl  = document.getElementById("mcUsernameHint");
  if(labelEl) labelEl.textContent = copy.label;
  if(inputEl) inputEl.placeholder = copy.placeholder;
  if(hintEl)  hintEl.textContent = copy.hint;
}

document.querySelectorAll('input[name="edition"]').forEach(input => {
  input.addEventListener("change", updateEditionCopy);
});

function goToStep(step){
  document.querySelectorAll(".modal-step").forEach(panel => {
    panel.classList.remove("active");
  });
  document.querySelectorAll(".step-dots span").forEach(dot => {
    dot.classList.remove("done");
  });

  const target = document.getElementById(`checkoutStep${step}`);
  if(target) target.classList.add("active");

  for(let i = 1; i <= step; i++){
    const dot = document.getElementById(`dot${i}`);
    if(dot) dot.classList.add("done");
  }
}

function openCheckout(name, price){
  if(typeof isLoggedIn === "function" && !isLoggedIn()){
    window.location.href = `login.html?next=${encodeURIComponent("store.html")}`;
    return;
  }

  currentItem = { name, price };

  const overlay  = document.getElementById("checkoutOverlay");
  const nameEl   = document.getElementById("checkoutItemName");
  const priceEl  = document.getElementById("checkoutItemPrice");
  const msgEl    = document.getElementById("checkoutMsg");
  const step2Msg = document.getElementById("step2Msg");
  const form     = document.getElementById("checkoutForm");

  if(!overlay) return;
  if(nameEl)  nameEl.textContent = name;
  if(priceEl) priceEl.textContent = price;
  if(msgEl)   { msgEl.textContent = ""; msgEl.className = "form-msg"; }
  if(step2Msg){ step2Msg.textContent = ""; step2Msg.className = "form-msg"; }
  if(form)    form.reset();

  const emailEl = document.getElementById("mcEmail");
  if(emailEl && typeof getStoredUser === "function"){
    const user = getStoredUser();
    if(user && user.email){
      emailEl.value = user.email;
      emailEl.readOnly = true;
    }
  }

  updateEditionCopy();
  goToStep(1);
  overlay.classList.add("show");
}

function closeCheckout(){
  const overlay = document.getElementById("checkoutOverlay");
  if(overlay) overlay.classList.remove("show");
}

document.addEventListener("click", function(e){
  const overlay = document.getElementById("checkoutOverlay");
  if(!overlay) return;
  if(e.target === overlay) overlay.classList.remove("show");
});

document.addEventListener("keydown", function(e){
  if(e.key === "Escape") closeCheckout();
});

const checkoutForm = document.getElementById("checkoutForm");
if(checkoutForm){
  checkoutForm.addEventListener("submit", async function(e){
    e.preventDefault();

    const edition  = getSelectedEdition();
    const username = document.getElementById("mcUsername").value.trim();
    const email    = document.getElementById("mcEmail").value.trim();
    const msgEl    = document.getElementById("checkoutMsg");
    const submitBtn = checkoutForm.querySelector("button[type=submit]");

    if(!currentItem || !username || !email) return;

    // basic per-edition username check
    const javaPattern = /^[A-Za-z0-9_]{3,16}$/;
    if(edition === "java" && !javaPattern.test(username)){
      msgEl.textContent = "That doesn't look like a valid Java username (3-16 letters, numbers, or _).";
      msgEl.className = "form-msg err";
      return;
    }
    if(edition === "bedrock" && username.length < 1){
      msgEl.textContent = "Enter your Bedrock gamertag.";
      msgEl.className = "form-msg err";
      return;
    }

    if(typeof isLoggedIn === "function" && !isLoggedIn()){
      window.location.href = `login.html?next=${encodeURIComponent("store.html")}`;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
    msgEl.textContent = "";
    msgEl.className = "form-msg";

    let orderId;
    try{
      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item: currentItem.name,
          price: currentItem.price,
          edition,
          username
        })
      });
      const data = await res.json();

      if(!res.ok){
        msgEl.textContent = data.error || "Could not create your order. Please try again.";
        msgEl.className = "form-msg err";
        submitBtn.disabled = false;
        submitBtn.textContent = "Continue to Payment";
        if(res.status === 401){
          window.location.href = `login.html?next=${encodeURIComponent("store.html")}`;
        }
        return;
      }

      orderId = data.order.id;
    }catch(err){
      console.error("Order creation failed:", err);
      msgEl.textContent = "Couldn't reach the server. Please try again in a moment.";
      msgEl.className = "form-msg err";
      submitBtn.disabled = false;
      submitBtn.textContent = "Continue to Payment";
      return;
    }

    // build the payment QR
    const qrData = encodeURIComponent(
      `CoffeMC | ${currentItem.name} | ${currentItem.price} | Order ${orderId}`
    );
    const qrImage   = document.getElementById("qrImage");
    const qrAmount  = document.getElementById("qrAmount");
    const qrNote    = document.getElementById("qrItemNote");
    const confirmEmail = document.getElementById("confirmEmail");
    const orderIdText  = document.getElementById("orderIdText");

    if(qrImage)  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}`;
    if(qrAmount) qrAmount.textContent = currentItem.price;
    if(qrNote)   qrNote.textContent = `${currentItem.name} — ${edition === "java" ? "Java" : "Bedrock"} (${username})`;
    if(confirmEmail) confirmEmail.textContent = email;
    if(orderIdText)  orderIdText.textContent = orderId;

    goToStep(2);

    submitBtn.disabled = false;
    submitBtn.textContent = "Continue to Payment";
  });
}

const doneBtn = document.getElementById("doneBtn");
if(doneBtn){
  doneBtn.addEventListener("click", function(){
    window.location.href = "index.html";
  });
}

/* ============================================================
   SOFT ANTI-INSPECT
   ============================================================ */
(function(){
  document.addEventListener("contextmenu", function(e){
    e.preventDefault();
  });
  document.addEventListener("keydown", function(e){
    const key = e.key.toLowerCase();
    if(key === "f12"){ e.preventDefault(); return false; }
    if(e.ctrlKey && e.shiftKey && ["i","j","c"].includes(key)){
      e.preventDefault(); return false;
    }
    if(e.ctrlKey && key === "u"){ e.preventDefault(); return false; }
    if(e.ctrlKey && key === "s"){ e.preventDefault(); return false; }
  });
})();