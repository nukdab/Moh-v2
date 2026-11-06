/* AI assistant widget (customer panel) — talks to /api/ai (Workers AI with an FAQ fallback). */
(function () {
  var M = MH, $ = M.$;
  var fab = $('#aiFab'), box = $('#aiBox'), msgs = $('#aiMsgs'), form = $('#aiForm'), inp = $('#aiIn'), send = $('#aiSend'), chips = $('#aiChips');
  var hist = [], busy = false; fab.hidden = false;
  function add(t, c) { var d = document.createElement('div'); d.className = 'aim ' + c; d.textContent = t; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  function open() {
    box.classList.add('on');
    if (!msgs.children.length) add('سلام! 👋 من دستیار هوشمند سازمان مدیریت منزل هستم. اگر برای ثبت شکایت، پیگیری پرونده یا استفاده از بخش‌های سایت سوالی دارید، بپرسید.', 'bot');
    setTimeout(function () { inp.focus(); }, 50);
  }
  fab.onclick = function () { box.classList.contains('on') ? box.classList.remove('on') : open(); };
  $('#aiX').onclick = function () { box.classList.remove('on'); };
  function ask(q) {
    if (busy || !q.trim()) return;
    add(q, 'me'); chips.style.display = 'none'; var b = add('…', 'bot');
    busy = true; send.disabled = true; hist.push({ role: 'user', content: q });
    M.api('POST', '/api/ai', { messages: hist.slice(-8) }).then(function (r) {
      b.textContent = r.reply; hist.push({ role: 'assistant', content: r.reply });
    }).catch(function () { b.textContent = 'متاسفانه پاسخ داده نشد. دوباره تلاش کنید.'; hist.pop(); }).then(function () {
      busy = false; send.disabled = false; msgs.scrollTop = msgs.scrollHeight; inp.focus();
    });
  }
  form.onsubmit = function (e) { e.preventDefault(); var q = inp.value; inp.value = ''; ask(q); };
  M.$$('button', chips).forEach(function (c) { c.onclick = function () { ask(c.textContent); }; });
})();
