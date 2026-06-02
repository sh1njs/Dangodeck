(function () {
  var browser = document.querySelector('.browser');
  if (!browser) return;

  var grid = browser.querySelector('[data-grid]');
  var countEl = browser.querySelector('[data-count]');
  var emptyEl = browser.querySelector('[data-empty]');
  var loaderEl = browser.querySelector('[data-loader]');
  var sentinel = browser.querySelector('[data-sentinel]');
  var endEl = browser.querySelector('[data-end]');

  var searchInput = browser.querySelector('[data-search]');
  var searchClear = browser.querySelector('[data-search-clear]');
  var filterToggle = browser.querySelector('[data-filter-toggle]');
  var filterPanel = browser.querySelector('[data-filter-panel]');
  var filterDot = browser.querySelector('[data-filter-dot]');
  var elementSel = browser.querySelector('[data-filter-element]');
  var animeSel = browser.querySelector('[data-filter-anime]');
  var sortSel = browser.querySelector('[data-filter-sort]');
  var clearFilters = browser.querySelector('[data-clear-filters]');

  var LIMIT = Number(browser.getAttribute('data-limit')) || 24;

  var colors = {};
  try {
    var raw = document.getElementById('element-colors');
    if (raw) colors = JSON.parse(raw.textContent);
  } catch (e) {}

  var state = {
    page: 1,
    totalPages: Number(browser.getAttribute('data-total-pages')) || 1,
    total: Number(browser.getAttribute('data-total')) || 0,
    element: '',
    anime: '',
    sort: 'id',
    query: '',
    searchMode: false,
    loading: false,
  };

  var reqId = 0;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function elementColor(el) {
    return colors[el] || '#cccccc';
  }

  function tile(card) {
    var newTag = card.lastPatch ? '<span class="nb-tag tile-new">New</span>' : '';
    return (
      '<a href="/cards/' +
      card.id +
      '" class="card-tile">' +
      '<div class="card-thumb">' +
      '<img src="' +
      esc(card.image) +
      '" alt="' +
      esc(card.name) +
      '" loading="lazy" />' +
      '<span class="nb-tag tile-element" style="background:' +
      elementColor(card.element) +
      ';color:#1a1a1a;">' +
      esc(card.element) +
      '</span>' +
      newTag +
      '</div>' +
      '<div class="card-body">' +
      '<div class="card-title-row"><h3 class="card-name">' +
      esc(card.name) +
      '</h3>' +
      '<span class="mono text-muted card-id">#' +
      card.id +
      '</span></div>' +
      '<p class="card-anime text-muted">' +
      esc(card.anime) +
      '</p>' +
      '<div class="card-stats">' +
      '<span class="stat-chip">HP ' +
      card.stats.hp +
      '</span>' +
      '<span class="stat-chip">AT ' +
      card.stats.atk +
      '</span>' +
      '<span class="stat-chip">DF ' +
      card.stats.def +
      '</span>' +
      '<span class="stat-chip">SP ' +
      card.stats.spd +
      '</span>' +
      '</div></div></a>'
    );
  }

  function render(cards, replace) {
    var html = cards.map(tile).join('');
    if (replace) grid.innerHTML = html;
    else grid.insertAdjacentHTML('beforeend', html);
  }

  function setCount() {
    if (state.searchMode) {
      countEl.textContent =
        state.total +
        ' search result' +
        (state.total === 1 ? '' : 's') +
        ' for “' +
        state.query +
        '”';
    } else {
      countEl.textContent = state.total + ' cards';
    }
  }

  function updateEnd() {
    var done =
      !state.searchMode &&
      !state.loading &&
      state.page >= state.totalPages &&
      grid.children.length > 0;
    endEl.hidden = !done;
    if (done) endEl.textContent = 'End of catalog — ' + state.total + ' cards.';
  }

  function loadList(nextPage, replace) {
    var id = ++reqId;
    state.loading = true;
    loaderEl.hidden = false;
    var params = new URLSearchParams();
    params.set('page', nextPage);
    params.set('limit', LIMIT);
    params.set('sort', state.sort);
    if (state.element) params.set('element', state.element);
    if (state.anime) params.set('anime', state.anime);

    fetch('/api/cards?' + params.toString())
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        if (id !== reqId) return;
        var data = json.data;
        render(data.items, replace);
        state.page = data.page;
        state.totalPages = data.totalPages;
        state.total = data.total;
        finish();
      })
      .catch(finish);

    function finish() {
      if (id !== reqId) return;
      state.loading = false;
      loaderEl.hidden = true;
      emptyEl.hidden = grid.children.length > 0;
      setCount();
      updateEnd();
    }
  }

  function loadSearch(q) {
    var id = ++reqId;
    state.searchMode = true;
    state.loading = true;
    loaderEl.hidden = false;
    endEl.hidden = true;
    fetch('/api/cards/search?q=' + encodeURIComponent(q) + '&limit=48')
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        if (id !== reqId) return;
        var items = json.data || [];
        render(items, true);
        state.total = items.length;
        state.totalPages = 1;
        done();
      })
      .catch(done);

    function done() {
      if (id !== reqId) return;
      state.loading = false;
      loaderEl.hidden = true;
      emptyEl.hidden = grid.children.length > 0;
      setCount();
    }
  }

  var debounce;
  searchInput.addEventListener('input', function () {
    var q = searchInput.value.trim();
    searchClear.hidden = q === '';
    state.query = q;
    clearTimeout(debounce);
    debounce = setTimeout(function () {
      if (!q) {
        state.searchMode = false;
        loadList(1, true);
      } else {
        loadSearch(q);
      }
    }, 300);
  });

  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    searchClear.hidden = true;
    state.query = '';
    state.searchMode = false;
    loadList(1, true);
  });

  filterToggle.addEventListener('click', function () {
    filterPanel.hidden = !filterPanel.hidden;
  });

  function onFilterChange() {
    state.element = elementSel.value;
    state.anime = animeSel.value;
    state.sort = sortSel.value;
    var active = Boolean(state.element || state.anime);
    filterDot.hidden = !active;
    clearFilters.hidden = !active;
    if (!state.searchMode) loadList(1, true);
  }

  elementSel.addEventListener('change', onFilterChange);
  animeSel.addEventListener('change', onFilterChange);
  sortSel.addEventListener('change', onFilterChange);

  clearFilters.addEventListener('click', function () {
    elementSel.value = '';
    animeSel.value = '';
    onFilterChange();
  });

  if (sentinel && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(
      function (entries) {
        if (
          entries[0].isIntersecting &&
          !state.searchMode &&
          !state.loading &&
          state.page < state.totalPages
        ) {
          loadList(state.page + 1, false);
        }
      },
      { rootMargin: '400px' }
    );
    obs.observe(sentinel);
  }

  updateEnd();
})();
