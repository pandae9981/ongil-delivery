// 오는길택배 · 화면 전환과 인터랙션
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let touched = false;
  addEventListener("pointerdown", () => (touched = true), { once: true });
  const buzz = (p = 8) => { if (touched && navigator.vibrate) navigator.vibrate(p); };
  const setAll = (sel, text) => $$(sel).forEach((el) => (el.textContent = text));
  const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  const state = { nick: "졸린 수달", phone: "050-1234-5678", rolled: false };

  /* =========================================================
     화면 전환 (앞으로: 오른쪽에서 밀려옴 / 뒤로: 반대 방향)
     ========================================================= */
  let current = $("#s0");
  let stack = [];
  let run = 0;
  const enter = {};

  function go(id, { back = false, reset = false } = {}) {
    const next = $("#" + id);
    if (!next || next === current) return;
    buzz(6);
    if (!back) {
      next.style.transition = "none";
      next.classList.remove("is-behind");
      void next.offsetWidth;
      next.style.transition = "";
      current.classList.add("is-behind");
      stack.push(current.id);
    }
    current.classList.remove("is-active");
    next.classList.remove("is-behind");
    next.classList.add("is-active");
    current = next;
    if (reset) stack = ["s0"];
    const c = $(".content", next);
    if (c) c.scrollTop = 0;
    const my = ++run;
    if (enter[id]) enter[id](() => my === run);
  }

  document.addEventListener("click", (e) => {
    const goEl = e.target.closest("[data-go]");
    if (goEl) return go(goEl.dataset.go);
    if (e.target.closest("[data-back]")) {
      const prev = stack.pop();
      if (prev) go(prev, { back: true });
    }
  });

  /* 토스트 */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  /* 숫자가 0부터 올라가는 카운트업 */
  function countUp(el, to, dur = 700) {
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* =========================================================
     00 스플래시 — 불편함 댓글이 쌓였다가 해결책이 등장
     ========================================================= */
  let tilesTimer;
  function startTiles() {
    clearInterval(tilesTimer);
    const tiles = $$("#tiles i");
    const shuffle = () => {
      tiles.forEach((t) => t.classList.remove("on", "soft"));
      const idx = [...tiles.keys()].sort(() => Math.random() - 0.5);
      idx.slice(0, 3).forEach((i) => tiles[i].classList.add("on"));
      idx.slice(3, 5).forEach((i) => tiles[i].classList.add("soft"));
    };
    shuffle();
    tilesTimer = setInterval(() => (current.id === "s0" ? shuffle() : clearInterval(tilesTimer)), 650);
  }
  function finishSplash() {
    $$(".comment").forEach((c) => c.classList.add("out"));
    $("#splash-main").classList.add("show");
    setTimeout(() => $("#splash-hl").classList.add("on"), 350);
    setTimeout(() => $("#splash-cta").classList.add("show"), 650);
    $("#skip").style.display = "none";
    startTiles();
  }
  enter.s0 = async (alive) => {
    const cs = $$(".comment");
    cs.forEach((c) => c.classList.remove("show", "out"));
    $("#splash-main").classList.remove("show");
    $("#splash-cta").classList.remove("show");
    $("#splash-hl").classList.remove("on");
    $("#skip").style.display = "";
    for (const c of cs) {
      await sleep(700);
      if (!alive()) return;
      c.classList.add("show");
      buzz(4);
    }
    await sleep(1300);
    if (!alive()) return;
    cs.forEach((c, i) => setTimeout(() => c.classList.add("out"), i * 90));
    await sleep(450);
    if (!alive()) return;
    finishSplash();
  };
  $("#skip").addEventListener("click", () => { run++; finishSplash(); });

  /* =========================================================
     01 배송지 선택
     ========================================================= */
  const options = $$("[data-delivery]");
  const nextBtn = $("#s1-next");
  function swapLabel(btn, text) {
    const l = $(".label", btn);
    if (l.textContent === text) return;
    retrigger(l, "swap");
    setTimeout(() => (l.textContent = text), 160);
  }
  options.forEach((opt) =>
    opt.addEventListener("click", () => {
      buzz(6);
      options.forEach((o) => {
        const on = o === opt;
        o.classList.toggle("is-selected", on);
        o.setAttribute("aria-checked", on);
      });
      swapLabel(nextBtn, opt.dataset.delivery === "safe" ? "다음 · 수령 장소 지정" : "다음 · 결제 정보 확인");
    })
  );
  nextBtn.addEventListener("click", () => {
    const safe = $("[data-delivery].is-selected").dataset.delivery === "safe";
    setSafe(safe);
    go(safe ? "s2" : "s3");
  });

  /* =========================================================
     02 보관함 위치 — 핀 선택, 카운트업, 확인 시트
     ========================================================= */
  const LOCKERS = [
    { name: "중앙역 보관함", tag: "가까운 거점", desc: "1번 출구 앞 · 퇴근 동선 · 24시간", avail: 4, sizes: [2, 1, 1], x: 42, y: 52 },
    { name: "시청 앞 보관함", tag: "여유 많음", desc: "시청역 3번 출구 · 도보 6분 · 24시간", avail: 9, sizes: [5, 3, 1], x: 18, y: 20 },
    { name: "공원 입구 보관함", tag: "", desc: "중앙공원 정문 · 도보 9분 · 06–24시", avail: 2, sizes: [1, 1, 0], x: 86, y: 40 },
    { name: "편의점 보관함", tag: "만석", desc: "○○마트 앞 · 도보 4분 · 24시간", avail: 0, sizes: [0, 0, 0], x: 62, y: 82 },
  ];
  let lockerIdx = 0;
  const map = $("#map");
  LOCKERS.forEach((L, i) => {
    const b = document.createElement("button");
    b.className = "pin" + (L.avail === 0 ? " full" : "");
    b.style.left = L.x + "%";
    b.style.top = L.y + "%";
    b.setAttribute("aria-label", L.name);
    b.innerHTML = '<svg width="18" height="18"><use href="#i-box"/></svg>';
    b.addEventListener("click", () => selectLocker(i));
    map.appendChild(b);
  });
  function showLocker(L) {
    $("#lk-name").textContent = L.name;
    $("#lk-desc").textContent = L.desc;
    const tag = $("#lk-tag");
    tag.textContent = L.tag;
    tag.style.display = L.tag ? "" : "none";
    $$("#locker-card > *").forEach((el) => retrigger(el, "swap-in"));
    $("#lk-bar").style.width = "0%";
    requestAnimationFrame(() => ($("#lk-bar").style.width = (L.avail / 12) * 100 + "%"));
    countUp($("#lk-avail"), L.avail);
    const [s, m, l] = L.sizes;
    $("#lk-sizes").innerHTML = `<span>소형 ${s}칸</span><span>중형 ${m}칸</span><span>대형 ${l}칸</span>`;
    setAll(".lk-name-text", L.name);
  }
  function selectLocker(i) {
    const L = LOCKERS[i];
    const pins = $$(".pin", map);
    if (L.avail === 0) {
      retrigger(pins[i], "shake");
      buzz([30, 40, 30]);
      toast(`${L.name}은 지금 빈 칸이 없어요`);
      return;
    }
    buzz(8);
    lockerIdx = i;
    pins.forEach((p, k) => p.classList.toggle("is-selected", k === i));
    showLocker(L);
  }
  selectLocker(0);
  enter.s2 = async (alive) => {
    await sleep(300);
    if (alive()) showLocker(LOCKERS[lockerIdx]);
  };

  const updatePickup = () => {
    const day = $('[data-group="day"] .is-selected').textContent;
    const time = $('[data-group="time"] .is-selected').textContent;
    setAll(".pickup-text", `${day} ${time}`);
  };
  $$(".chips").forEach((group) =>
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || chip.classList.contains("is-selected")) return;
      buzz(6);
      $$(".chip", group).forEach((c) => c.classList.toggle("is-selected", c === chip));
      updatePickup();
    })
  );

  const dim = $("#dim");
  const sheet = $("#sheet");
  const openSheet = () => { dim.classList.add("show"); sheet.classList.add("show"); buzz(8); };
  const closeSheet = () => { dim.classList.remove("show"); sheet.classList.remove("show"); };
  $("#s2-next").addEventListener("click", openSheet);
  $("#sheet-cancel").addEventListener("click", closeSheet);
  dim.addEventListener("click", closeSheet);
  $("#sheet-ok").addEventListener("click", () => { closeSheet(); setTimeout(() => go("s3"), 180); });

  /* =========================================================
     03 안심 배송 정보 — 슬롯머신 닉네임, 송장 뒤집기
     ========================================================= */
  const chkAll = $("#chk-all");
  const chkNick = $("#chk-nick");
  const chkPhone = $("#chk-phone");
  const REAL = { name: "홍길동", phone: "010-1234-5678" };
  const NICKS = ["졸린 수달", "배고픈 펭귄", "수줍은 고양이", "용감한 다람쥐", "느긋한 판다", "반짝이는 해달", "조용한 여우", "씩씩한 오리", "포근한 알파카", "신난 고슴도치"];
  const r4 = () => String(Math.floor(Math.random() * 9000) + 1000);
  const randPhone = () => `050-${r4()}-${r4()}`;
  const pick = (arr, not) => { let v; do { v = arr[Math.floor(Math.random() * arr.length)]; } while (v === not); return v; };

  function setText(el, text) {
    if (el.textContent === text) return;
    el.textContent = text;
    retrigger(el, "flip");
  }
  function render() {
    const nick = chkNick.checked;
    const phone = chkPhone.checked;
    chkAll.checked = nick && phone;
    chkAll.indeterminate = nick !== phone;
    $("#field-nick").classList.toggle("is-off", !nick);
    $("#field-phone").classList.toggle("is-off", !phone);
    const nameEl = $("#inv-name");
    setText(nameEl, nick ? state.nick : REAL.name);
    nameEl.className = (nick ? "c-blue " : "") + nameEl.className.replace(/c-blue\s?/, "").trim();
    $("#inv-phone-label").textContent = phone ? "안심번호" : "연락처";
    const phoneEl = $("#inv-phone");
    setText(phoneEl, phone ? state.phone : REAL.phone);
    phoneEl.className = (phone ? "c-blue " : "") + phoneEl.className.replace(/c-blue\s?/, "").trim();
    const msg = $("#safe-msg");
    const allSafe = nick && phone;
    msg.style.color = allSafe ? "var(--teal-500)" : "var(--red-500)";
    $("span", msg).textContent = allSafe ? "실명·실제 번호는 송장에 인쇄되지 않아요" : "실명이나 실제 번호가 송장에 그대로 인쇄돼요";
    setAll(".nick-text", nick ? state.nick : REAL.name);
  }
  function setSafe(on) {
    chkNick.checked = chkPhone.checked = on;
    render();
  }
  chkAll.addEventListener("change", () => { buzz(6); setSafe(chkAll.checked); });
  chkNick.addEventListener("change", () => { buzz(6); render(); });
  chkPhone.addEventListener("change", () => { buzz(6); render(); });

  const rolling = new Set();
  async function roll(el, field, gen, final) {
    if (rolling.has(el)) return false;
    rolling.add(el);
    field.classList.add("rolling");
    for (let i = 0; i < 12; i++) {
      el.textContent = gen();
      retrigger(el, "tick");
      await sleep(40 + i * i * 1.4);
    }
    el.textContent = final;
    el.classList.remove("tick");
    retrigger(el, "land");
    buzz(12);
    field.classList.remove("rolling");
    rolling.delete(el);
    return true;
  }
  async function rerollNick(final) {
    retrigger($("#reroll-nick"), "spin");
    const v = final || pick(NICKS, state.nick);
    if (await roll($("#nick-val"), $("#field-nick"), () => pick(NICKS), v)) { state.nick = v; render(); }
  }
  async function rerollPhone(final) {
    retrigger($("#reroll-phone"), "spin");
    const v = final || randPhone();
    if (await roll($("#phone-val"), $("#field-phone"), randPhone, v)) { state.phone = v; render(); }
  }
  $("#reroll-nick").addEventListener("click", () => rerollNick());
  $("#reroll-phone").addEventListener("click", () => rerollPhone());
  enter.s3 = async (alive) => {
    if (state.rolled) return;
    state.rolled = true;
    await sleep(500);
    if (!alive()) return;
    rerollNick(state.nick);
    await sleep(150);
    rerollPhone(state.phone);
  };

  const widths = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2];
  $("#barcode").innerHTML = widths.map((w, i) => `<i style="width:${w * 1.6}px;${i % 2 ? "background:transparent" : ""}"></i>`).join("");

  /* =========================================================
     04 배송 추적 — 상자가 경로를 따라 이동 → 비밀번호 카드 등장
     ========================================================= */
  const PW = "482913";
  async function rollPw(alive) {
    const spans = $$("#pw-num span");
    await Promise.all(spans.map(async (s, i) => {
      const until = performance.now() + 350 + i * 130;
      while (performance.now() < until) {
        if (!alive()) return;
        s.textContent = Math.floor(Math.random() * 10);
        await sleep(45);
      }
      s.textContent = PW[i];
      retrigger(s, "land");
    }));
    if (alive()) buzz(10);
  }
  enter.s4 = async (alive) => {
    const fill = $("#track-fill"), truck = $("#truck"), status = $("#track-status"), notice = $("#notice");
    const nodes = $$("#s4 .node"), labels = $$("#track-labels span");
    notice.classList.remove("show");
    fill.style.width = "0%";
    truck.style.left = "0%";
    nodes.forEach((n) => n.classList.remove("on"));
    labels.forEach((l) => l.classList.remove("on"));
    $$("#pw-num span").forEach((s) => (s.textContent = "•"));
    status.style.color = "";
    status.textContent = "택배사 집하 완료";
    nodes[0].classList.add("on");
    labels[0].classList.add("on");
    const steps = [
      [50, 1, "중간 허브 도착 · 안심배송 분류"],
      [100, 2, "보관함 05번 칸 보관 완료"],
    ];
    for (const [pct, k, text] of steps) {
      await sleep(900);
      if (!alive()) return;
      truck.classList.add("hop");
      fill.style.width = pct + "%";
      truck.style.left = pct + "%";
      await sleep(1000);
      if (!alive()) return;
      nodes[k].classList.add("on");
      labels[k].classList.add("on");
      status.textContent = text;
      buzz(6);
    }
    truck.classList.remove("hop");
    status.style.color = "var(--teal-500)";
    buzz([10, 40, 10]);
    notice.classList.add("show");
    setTimeout(() => notice.scrollIntoView({ behavior: "smooth", block: "end" }), 150);
    await sleep(450);
    rollPw(alive);
  };

  /* =========================================================
     05 수령 — 보관함 칸 깜빡임 → 05번 확정, 키패드 입력
     ========================================================= */
  const USED = ["02", "07", "10"];
  const lockerEl = $("#locker");
  const codeEl = $("#code");
  const codeLabel = $("#code-label");
  let code = "";
  let locked = false;

  const keypad = $("#keypad");
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "초기화", "0", "지움"].forEach((k) => {
    const b = document.createElement("button");
    b.className = "key press" + (k.length > 1 ? " fn" : "");
    b.textContent = k;
    b.addEventListener("click", () => (k === "지움" ? del() : k === "초기화" ? clearCode() : input(k)));
    keypad.appendChild(b);
  });

  function paintCode() {
    $$("span", codeEl).forEach((s, i) => {
      s.textContent = code[i] || "";
      s.classList.toggle("cur", i === code.length && !locked);
      if (i === code.length - 1 && code[i]) retrigger(s, "filled");
      else if (!code[i]) s.classList.remove("filled");
    });
  }
  function clearCode() {
    code = "";
    codeEl.classList.remove("ok", "bad", "shake");
    paintCode();
  }
  function del() {
    if (locked) return;
    buzz(5);
    code = code.slice(0, -1);
    codeEl.classList.remove("bad");
    paintCode();
  }
  function input(d) {
    if (locked || code.length >= 6) return;
    buzz(5);
    codeEl.classList.remove("bad");
    code += d;
    paintCode();
    if (code.length === 6) setTimeout(checkCode, 180);
  }
  async function checkCode() {
    if (code === PW) {
      locked = true;
      codeEl.classList.add("ok");
      codeLabel.textContent = "05번 칸 문이 열렸어요!";
      codeLabel.style.color = "var(--teal-500)";
      const mine = $(".cell.mine", lockerEl);
      if (mine) { mine.classList.remove("mine"); mine.classList.add("open"); }
      buzz([15, 50, 15]);
      toast("택배를 꺼내 주세요 📦");
      const my = run;
      await sleep(1500);
      if (my === run) go("s6");
    } else {
      locked = true;
      codeEl.classList.add("bad");
      retrigger(codeEl, "shake");
      buzz([30, 40, 30]);
      codeLabel.textContent = "비밀번호가 달라요. 다시 입력해 주세요";
      codeLabel.style.color = "var(--red-500)";
      await sleep(700);
      locked = false;
      clearCode();
    }
  }
  $("#autofill").addEventListener("click", async () => {
    if (locked) return;
    clearCode();
    for (const d of PW) { input(d); await sleep(130); }
  });
  document.addEventListener("keydown", (e) => {
    if (current.id !== "s5") return;
    if (/^[0-9]$/.test(e.key)) input(e.key);
    else if (e.key === "Backspace") del();
  });

  enter.s5 = async (alive) => {
    locked = false;
    clearCode();
    codeLabel.textContent = "비밀번호 6자리를 입력하세요";
    codeLabel.style.color = "";
    const sub = $("#s5 .center .t-footnote");
    sub.textContent = "기사님이 배정한 칸을 찾고 있어요";
    lockerEl.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return `<span class="cell ${USED.includes(n) ? "used" : ""}">${n}</span>`;
    }).join("");
    const cells = $$(".cell", lockerEl);
    const free = cells.filter((c) => !c.classList.contains("used"));
    const end = performance.now() + 1500;
    await sleep(300);
    while (performance.now() < end) {
      if (!alive()) return;
      cells.forEach((c) => c.classList.remove("flash"));
      free.sort(() => Math.random() - 0.5).slice(0, 2).forEach((c) => c.classList.add("flash"));
      await sleep(90);
    }
    cells.forEach((c) => c.classList.remove("flash"));
    cells[4].classList.add("mine");
    sub.textContent = "기사님이 배정한 칸 · 05번";
    buzz(10);
  };

  /* =========================================================
     06 수령 완료 — 송장 글자가 흩어지며 파기
     ========================================================= */
  enter.s6 = async (alive) => {
    const shred = $("#shred"), hero = $("#done-hero"), sum = $("#summary"), after = $("#after");
    [shred, hero, sum, after].forEach((el) => el.classList.remove("burst", "gone", "show"));
    $("#shred-status").textContent = "송장 정보를 파기하고 있어요…";
    const texts = [$("#inv-name").textContent, $("#inv-phone").textContent, "05번 · " + PW];
    $$(".shred-text").forEach((el, i) => {
      el.innerHTML = [...texts[i]].map((c) => `<span class="ch">${c}</span>`).join("");
    });
    const now = new Date();
    $("#done-time").textContent = `오늘 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    await sleep(700);
    if (!alive()) return;
    $$("#shred .ch").forEach((s, i) => {
      const dx = (Math.random() - 0.5) * 180;
      const dy = -20 - Math.random() * 80;
      const r = (Math.random() - 0.5) * 140;
      s.style.transitionDelay = i * 22 + "ms";
      s.style.transform = `translate(${dx}px, ${dy}px) rotate(${r}deg) scale(.3)`;
    });
    shred.classList.add("burst");
    buzz(8);
    await sleep(1000);
    if (!alive()) return;
    $("#shred-status").textContent = "파기 완료";
    await sleep(250);
    shred.classList.add("gone");
    await sleep(350);
    if (!alive()) return;
    hero.classList.add("show");
    sum.classList.add("show");
    after.classList.add("show");
    buzz([10, 30, 20]);
  };
  $("#s6-done").addEventListener("click", () => go("s1", { reset: true }));

  /* 시작 */
  render();
  updatePickup();
  enter.s0(() => run === 0);
})();
