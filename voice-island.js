(() => {
  // =========================
  // Voice-Island Player Monitor
  // =========================

  if (location.hostname !== 'voice-island.com') {
    alert('กรุณาเปิดหน้า Live Map ของ Voice-Island ก่อน');
    return;
  }

  // ถ้าเคยรันสคริปต์นี้แล้ว ให้หยุดตัวเก่าก่อน
  window.voiceIslandHP?.stop();

  // -------------------------
  // ตั้งค่าผู้เล่น
  // -------------------------

  const SEARCH_VALUE = prompt(
    'ใส่ชื่อ Player หรือ Player ID ของคุณ\n\nตัวอย่าง:\nMeow Meow\nหรือ\n123456'
  )?.trim();

  if (!SEARCH_VALUE) {
    alert('ไม่ได้ใส่ชื่อหรือ ID');
    return;
  }

  let active = true;
  let lastTime = 0;
  let message = 'รอข้อมูลจากหน้าแผนที่…';
  let foundPlayer = null;

  // -------------------------
  // สร้างหน้าต่างแสดงผล
  // -------------------------

  const panel = document.createElement('div');

  panel.style.cssText = `
    position: fixed;
    top: 120px;
    right: 20px;
    z-index: 2147483647;

    background: rgba(21, 21, 21, .96);
    color: white;

    padding: 18px;

    border: 2px solid #dda24a;
    border-radius: 12px;

    font: 16px/1.7 sans-serif;

    white-space: pre-line;

    width: 310px;
    max-height: 75vh;

    overflow: auto;

    box-shadow: 0 4px 24px #0008;
  `;

  const title = document.createElement('div');

  title.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    color: #dda24a;
    margin-bottom: 8px;
  `;

  title.textContent = '🦖 Voice-Island Monitor';

  const label = document.createElement('div');

  const close = document.createElement('button');

  close.textContent = 'ปิด / หยุด';

  close.style.cssText = `
    margin-top: 14px;
    padding: 7px 14px;

    background: #dda24a;
    color: #151515;

    border: 0;
    border-radius: 6px;

    cursor: pointer;

    font-weight: bold;
  `;

  panel.append(title, label, close);
  document.body.append(panel);

  // -------------------------
  // Helper
  // -------------------------

  function percent(value) {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return 'ไม่มีข้อมูล';
    }

    // API ส่งแบบ 0 - 1
    if (value >= 0 && value <= 1) {
      return `${Math.round(value * 100)}%`;
    }

    // ถ้าส่งมาเป็น 0 - 100
    if (value >= 0 && value <= 100) {
      return `${Math.round(value)}%`;
    }

    return `${value} (ค่าดิบ)`;
  }

  function coord(value) {
    return (
      typeof value === 'number' &&
      Number.isFinite(value)
    )
      ? value.toFixed(1)
      : 'ไม่มีข้อมูล';
  }

  function normalize(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  // -------------------------
  // แสดงผล
  // -------------------------

  function render() {
    const age = lastTime
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - lastTime) / 1000
          )
        )
      : null;

    let text = message;

    if (age !== null) {
      text += `\n\n⏱ อายุข้อมูล: ${age} วินาที`;

      if (age > 20) {
        text += '\n⚠ ข้อมูลอาจค้าง';
      }
    }

    label.textContent = text;
  }

  // -------------------------
  // ตรวจว่าเป็น endpoint /players
  // -------------------------

  function isPlayers(url) {
    try {
      const parsed = new URL(
        url,
        location.href
      );

      return /\/players\/?$/.test(
        parsed.pathname
      );
    } catch {
      return false;
    }
  }

  // -------------------------
  // หา Player
  // -------------------------

  function findPlayers(players) {
    const search = normalize(SEARCH_VALUE);

    return players.filter(player => {
      // หาโดยชื่อ
      const nameMatch =
        normalize(player?.name) === search;

      // ID ที่อาจใช้ใน API
      const possibleIds = [
        player?.id,
        player?.player_id,
        player?.playerId,
        player?.steam_id,
        player?.steamId,
        player?.account_id,
        player?.accountId,
        player?.user_id,
        player?.userId
      ];

      const idMatch = possibleIds.some(
        id => normalize(id) === search
      );

      return nameMatch || idMatch;
    });
  }

  // -------------------------
  // อ่าน JSON จาก /players
  // -------------------------

  function read(data) {
    if (!active) return;

    if (!Array.isArray(data?.players)) {
      return;
    }

    const matches = findPlayers(
      data.players
    );

    lastTime =
      Date.parse(data.updated_at) ||
      Date.now();

    if (matches.length === 0) {
      foundPlayer = null;

      message =
        `🔎 กำลังค้นหา: ${SEARCH_VALUE}\n\n` +
        'ไม่พบ Player ในข้อมูลรอบนี้';

      render();
      return;
    }

    if (matches.length > 1) {
      foundPlayer = null;

      message =
        `⚠ พบ Player ที่ตรงกับ "${SEARCH_VALUE}" ` +
        `${matches.length} รายการ\n\n` +
        'ควรใช้ Player ID เพื่อระบุตัวให้แน่นอน';

      render();
      return;
    }

    const p = matches[0];

    foundPlayer = p;

    const gender =
      p.gender === 'Male'
        ? 'ผู้'
        : p.gender === 'Female'
          ? 'เมีย'
          : p.gender ?? 'ไม่มีข้อมูล';

    const prime =
      p.prime_elder === true
        ? 'ใช่'
        : p.prime_elder === false
          ? 'ไม่ใช่'
          : 'ไม่มีข้อมูล';

    const id =
      p.id ??
      p.player_id ??
      p.playerId ??
      p.steam_id ??
      p.steamId ??
      p.account_id ??
      p.accountId ??
      p.user_id ??
      p.userId ??
      'ไม่มีข้อมูล';

    message = [
      `🦖 ${p.name ?? SEARCH_VALUE}`,
      `🆔 ID: ${id}`,
      '',
      `ชนิด: ${p.class ?? 'ไม่มีข้อมูล'}`,
      `เพศ: ${gender}`,
      '',
      `❤️ HP: ${percent(p.health)}`,
      `⚡ Stamina: ${percent(p.stamina)}`,
      `🍖 Hunger: ${percent(p.hunger)}`,
      `💧 Thirst: ${percent(p.thirst)}`,
      `🌱 Growth: ${percent(p.growth)}`,
      `👑 Prime Elder: ${prime}`,
      '',
      `📍 X: ${coord(p.x)}`,
      `📍 Y: ${coord(p.y)}`,
      `📍 Z: ${coord(p.z)}`,
      '',
      'ข้อมูลมาจาก Live Map',
      'อาจล่าช้ากว่าข้อมูลภายในเกม'
    ].join('\n');

    render();
  }

  // -------------------------
  // ดัก Fetch
  // -------------------------

  const originalFetch = window.fetch;

  function wrappedFetch(...args) {
    const pending =
      originalFetch.apply(this, args);

    pending
      .then(response => {
        if (
          active &&
          isPlayers(response.url)
        ) {
          response
            .clone()
            .json()
            .then(read)
            .catch(() => {});
        }
      })
      .catch(() => {});

    return pending;
  }

  // -------------------------
  // ดัก XMLHttpRequest
  // -------------------------

  const originalSend =
    XMLHttpRequest.prototype.send;

  function wrappedSend(...args) {
    this.addEventListener(
      'load',
      function () {
        if (
          !active ||
          !isPlayers(this.responseURL)
        ) {
          return;
        }

        try {
          const data =
            this.responseType === 'json'
              ? this.response
              : JSON.parse(
                  this.responseText
                );

          read(data);
        } catch {
          // ไม่ใช่ JSON
        }
      },
      { once: true }
    );

    return originalSend.apply(
      this,
      args
    );
  }

  // -------------------------
  // เปิดระบบดักข้อมูล
  // -------------------------

  window.fetch = wrappedFetch;
  XMLHttpRequest.prototype.send =
    wrappedSend;

  // อัปเดตเวลาในกล่องทุกวินาที
  const timer = setInterval(
    render,
    1000
  );

  // -------------------------
  // หยุด Script
  // -------------------------

  function stop() {
    if (!active) return;

    active = false;

    clearInterval(timer);

    if (
      window.fetch === wrappedFetch
    ) {
      window.fetch =
        originalFetch;
    }

    if (
      XMLHttpRequest.prototype.send ===
      wrappedSend
    ) {
      XMLHttpRequest.prototype.send =
        originalSend;
    }

    panel.remove();

    if (
      window.voiceIslandHP?.stop === stop
    ) {
      delete window.voiceIslandHP;
    }
  }

  // เปิด API เล็ก ๆ ไว้ควบคุมจาก Console
  window.voiceIslandHP = {
    stop,

    getPlayer() {
      return foundPlayer;
    },

    getSearchValue() {
      return SEARCH_VALUE;
    }
  };

  close.onclick = stop;

  render();

  console.log(
    '[Voice-Island Monitor] กำลังค้นหา:',
    SEARCH_VALUE
  );
})();
