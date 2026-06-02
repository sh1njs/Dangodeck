(function () {
  var blocks = document.querySelectorAll('[data-code-block]');
  blocks.forEach(function (block) {
    var tabs = block.querySelectorAll('.code-tab');
    var panes = block.querySelectorAll('.code-pre');
    var copyBtn = block.querySelector('[data-copy]');
    var copyLabel = block.querySelector('[data-copy-label]');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var lang = tab.getAttribute('data-lang');
        tabs.forEach(function (t) {
          t.classList.toggle('is-active', t === tab);
        });
        panes.forEach(function (p) {
          p.classList.toggle('is-active', p.getAttribute('data-pane') === lang);
        });
      });
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var active = block.querySelector('.code-pre.is-active code');
        if (!active) return;
        var text = active.textContent;
        var done = function () {
          if (copyLabel) {
            copyLabel.textContent = 'Copied';
            setTimeout(function () {
              copyLabel.textContent = 'Copy';
            }, 1500);
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(done);
        } else {
          done();
        }
      });
    }
  });
})();
