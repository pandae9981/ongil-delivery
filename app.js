// 오는길택배 · 화면 전환과 인터랙션
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- 화면 전환 ---------- */
  function go(id) {
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
    const content = $(`#${id} .content`);
    if (content) content.scrollTop = 0;
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) go(t.dataset.go);
  });

  /* ---------- 01 배송지 선택 ---------- */
  const options = $$("[data-delivery]");
  const nextBtn = $("#s1-next");
  options.forEach((opt) =>
    opt.addEventListener("click", () => {
      options.forEach((o) => {
        const on = o === opt;
        o.classList.toggle("is-selected", on);
        o.setAttribute("aria-checked", on);
      });
      nextBtn.textContent = opt.dataset.delivery === "safe" ? "다음 · 수령 장소 지정" : "다음 · 결제 정보 확인";
    })
  );
  nextBtn.addEventListener("click", () => {
    const safe = $("[data-delivery].is-selected").dataset.delivery === "safe";
    setSafe(safe);
    go(safe ? "s2" : "s3");
  });

  /* ---------- 02 픽업 시간 칩 ---------- */
  const updatePickup = () => {
    const day = $('[data-group="day"] .is-selected').textContent;
    const time = $('[data-group="time"] .is-selected').textContent;
    $$(".pickup-text").forEach((el) => (el.textContent = `${day} ${time}`));
  };
  $$(".chips").forEach((group) =>
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      $$(".chip", group).forEach((c) => c.classList.toggle("is-selected", c === chip));
      updatePickup();
    })
  );

  /* ---------- 03 안심 배송 정보 ---------- */
  const chkAll = $("#chk-all");
  const chkNick = $("#chk-nick");
  const chkPhone = $("#chk-phone");
  const REAL = { name: "홍길동", phone: "010-1234-5678" };
  const SAFE = { name: "졸린 수달", phone: "050-1234-5678" };

  function render() {
    const nick = chkNick.checked;
    const phone = chkPhone.checked;
    chkAll.checked = nick && phone;
    chkAll.indeterminate = nick !== phone;
    $("#field-nick").classList.toggle("is-off", !nick);
    $("#field-phone").classList.toggle("is-off", !phone);

    const nameEl = $("#inv-name");
    nameEl.textContent = nick ? SAFE.name : REAL.name;
    nameEl.className = nick ? "c-blue" : "";
    $("#inv-phone-label").textContent = phone ? "안심번호" : "연락처";
    const phoneEl = $("#inv-phone");
    phoneEl.textContent = phone ? SAFE.phone : REAL.phone;
    phoneEl.className = phone ? "c-blue" : "";

    const msg = $("#safe-msg");
    const allSafe = nick && phone;
    msg.style.color = allSafe ? "var(--teal-500)" : "var(--red-500)";
    $("span", msg).textContent = allSafe
      ? "실명·실제 번호는 송장에 인쇄되지 않아요"
      : "실명이나 실제 번호가 송장에 그대로 인쇄돼요";
    $$(".nick-text").forEach((el) => (el.textContent = nick ? SAFE.name : REAL.name));
  }
  function setSafe(on) {
    chkNick.checked = chkPhone.checked = on;
    render();
  }
  chkAll.addEventListener("change", () => setSafe(chkAll.checked));
  chkNick.addEventListener("change", render);
  chkPhone.addEventListener("change", render);

  // 송장 바코드
  const widths = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2];
  $("#barcode").innerHTML = widths
    .map((w, i) => `<i style="width:${w * 1.6}px;${i % 2 ? "background:transparent" : ""}"></i>`)
    .join("");

  /* ---------- 05 보관함 배치도 ---------- */
  const used = ["02", "07", "10"];
  $("#locker").innerHTML = Array.from({ length: 12 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    const cls = n === "05" ? "mine" : used.includes(n) ? "used" : "";
    return `<span class="cell ${cls}">${n}</span>`;
  }).join("");

  $("#s5-done").addEventListener("click", () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    $("#done-time").textContent = `오늘 ${hh}:${mm}`;
    go("s6");
  });

  render();
  updatePickup();
})();
