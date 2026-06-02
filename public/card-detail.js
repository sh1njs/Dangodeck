// Interactive stat calculator for the card detail page. Uses the same config
// (multipliers) as the server so calculated stats match the API exactly.
(function () {
  var cfgEl = document.getElementById('stat-config');
  var baseEl = document.getElementById('base-stats');
  var calcEl = document.querySelector('[data-stat-calc]');
  if (!cfgEl || !baseEl || !calcEl) return;

  var cfg = JSON.parse(cfgEl.textContent);
  var base = JSON.parse(baseEl.textContent);
  var keys = ['hp', 'atk', 'def', 'spd'];

  var rarityMultByKey = {};
  cfg.rarities.forEach(function (r) {
    rarityMultByKey[r.key] = r.mult;
  });

  var params = {
    rarity: cfg.defaults.rarity,
    level: cfg.defaults.level,
    evo: cfg.defaults.evo,
    ascension: cfg.defaults.ascension,
  };

  var barsEl = document.querySelector('[data-stat-bars]');
  var color = (barsEl && barsEl.getAttribute('data-element-color')) || '#888';
  var multBadge = document.querySelector('[data-stat-mult]');
  var levelInput = calcEl.querySelector('[data-level-input]');
  var levelOut = calcEl.querySelector('[data-level-out]');

  function multipliers() {
    var rarity = rarityMultByKey[params.rarity] != null ? rarityMultByKey[params.rarity] : 1;
    var level = 1 + (params.level - 1) * cfg.level.perLevel;
    var evo = cfg.evo.mults[params.evo - 1] != null ? cfg.evo.mults[params.evo - 1] : 1;
    var asc = cfg.ascension.mults[params.ascension] != null ? cfg.ascension.mults[params.ascension] : 1;
    return { rarity: rarity, level: level, evo: evo, ascension: asc, total: rarity * level * evo * asc };
  }

  function render() {
    var m = multipliers();
    var calc = {};
    keys.forEach(function (k) {
      calc[k] = Math.round(base[k] * m.total);
    });
    var max = Math.max(calc.hp, calc.atk, calc.def, calc.spd, 100);
    var isBase = Math.abs(m.total - 1) < 1e-9;

    keys.forEach(function (k) {
      var row = barsEl.querySelector('[data-stat-row="' + k + '"]');
      if (!row) return;
      var fill = row.querySelector('[data-stat-fill]');
      var value = row.querySelector('[data-stat-value]');
      var baseTag = row.querySelector('[data-stat-base]');
      fill.style.width = (calc[k] / max) * 100 + '%';
      fill.style.background = color;
      value.textContent = calc[k];
      if (isBase) {
        baseTag.hidden = true;
      } else {
        baseTag.hidden = false;
        baseTag.textContent = 'base ' + base[k];
      }
    });

    if (multBadge) {
      if (isBase) {
        multBadge.hidden = true;
      } else {
        multBadge.hidden = false;
        multBadge.textContent = '×' + m.total.toFixed(2);
      }
    }
  }

  function setActive(container, attr, val) {
    container.querySelectorAll('[' + attr + ']').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute(attr) === String(val));
    });
  }

  var rarityChips = calcEl.querySelector('[data-rarity-chips]');
  rarityChips.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-rarity]');
    if (!btn) return;
    params.rarity = btn.getAttribute('data-rarity');
    setActive(rarityChips, 'data-rarity', params.rarity);
    render();
  });

  var evoChips = calcEl.querySelector('[data-evo-chips]');
  evoChips.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-evo]');
    if (!btn) return;
    params.evo = Number(btn.getAttribute('data-evo'));
    setActive(evoChips, 'data-evo', params.evo);
    render();
  });

  var ascChips = calcEl.querySelector('[data-asc-chips]');
  ascChips.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-asc]');
    if (!btn) return;
    params.ascension = Number(btn.getAttribute('data-asc'));
    setActive(ascChips, 'data-asc', params.ascension);
    render();
  });

  levelInput.addEventListener('input', function () {
    params.level = Number(levelInput.value);
    levelOut.textContent = params.level;
    render();
  });

  function syncControls() {
    setActive(rarityChips, 'data-rarity', params.rarity);
    setActive(evoChips, 'data-evo', params.evo);
    setActive(ascChips, 'data-asc', params.ascension);
    levelInput.value = params.level;
    levelOut.textContent = params.level;
  }

  var rollBtn = calcEl.querySelector('[data-stat-roll]');
  rollBtn.addEventListener('click', function () {
    var r = cfg.rarities[Math.floor(Math.random() * cfg.rarities.length)];
    params.rarity = r.key;
    params.level = cfg.level.min + Math.floor(Math.random() * (cfg.level.max - cfg.level.min + 1));
    params.evo = cfg.evo.min + Math.floor(Math.random() * (cfg.evo.max - cfg.evo.min + 1));
    params.ascension =
      cfg.ascension.min + Math.floor(Math.random() * (cfg.ascension.max - cfg.ascension.min + 1));
    syncControls();
    render();
  });

  var resetBtn = calcEl.querySelector('[data-stat-reset]');
  resetBtn.addEventListener('click', function () {
    params.rarity = cfg.defaults.rarity;
    params.level = cfg.defaults.level;
    params.evo = cfg.defaults.evo;
    params.ascension = cfg.defaults.ascension;
    syncControls();
    render();
  });

  render();
})();
