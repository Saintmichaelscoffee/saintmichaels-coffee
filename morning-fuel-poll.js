(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else factory(root.document, root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function initMorningFuelPoll(document, window) {
  'use strict';
  const STORAGE_KEY = 'saintmichaels:morning-fuel-poll:v1';
  const INTERESTS = ['Yes, I’d buy a 12-pack', 'Maybe, depending on price', 'I prefer bagged coffee'];
  const QUANTITIES = ['', '1', '2', '3', '4+', 'Not sure'];
  const REQUEST_TIMEOUT_MS = 18000;
  const TERMINAL_CODES = ['EXPIRED_ID', 'IDEMPOTENCY_CONFLICT'];
  // Only a documented rejection before any ambiguous attempt can permit reset.
  const NO_WRITE_CODES = ['INVALID_REQUEST', 'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'METHOD_NOT_ALLOWED', 'ORIGIN_NOT_ALLOWED', 'NOT_CONFIGURED', 'TOO_FAST', 'RATE_LIMITED', 'CAPACITY_REACHED', 'FORM_UNAVAILABLE', 'FORM_SCHEMA_MISMATCH'];
  const forms = Array.from(document.querySelectorAll('[data-morning-fuel-poll]'));
  const now = function () { return (window.Date || Date).now(); };

  function exactKeys(value, expected) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === expected.slice().sort().join(',');
  }

  function validPayload(payload) {
    if (!exactKeys(payload, ['interest', 'quantity', 'startedAt', 'submissionId', 'website'])) return false;
    return Number.isSafeInteger(payload.startedAt) && payload.startedAt > 0 &&
      /^\d{13}$/.test(String(payload.startedAt)) &&
      typeof payload.submissionId === 'string' &&
      new RegExp('^' + payload.startedAt + '\\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$').test(payload.submissionId) &&
      INTERESTS.includes(payload.interest) && QUANTITIES.includes(payload.quantity) && payload.website === '';
  }

  function validReceipt(body, payload) {
    if (!exactKeys(body, ['ok', 'status', 'submissionId', 'receipt', 'duplicate']) || body.ok !== true || body.status !== 'saved' || body.submissionId !== payload.submissionId || typeof body.duplicate !== 'boolean') return false;
    const receipt = body.receipt;
    if (!exactKeys(receipt, ['id', 'savedAt']) || typeof receipt.id !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.id) || typeof receipt.savedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(receipt.savedAt)) return false;
    const date = new Date(receipt.savedAt);
    return Number.isFinite(date.getTime()) && date.toISOString() === receipt.savedAt;
  }

  return forms.map(function setup(form) {
    const panel = form.querySelector('[data-poll-follow-up]');
    const disclosure = form.querySelector('#mf-disclosure');
    const submit = form.querySelector('[data-poll-submit]');
    const reset = form.querySelector('[data-poll-reset]');
    const status = form.querySelector('[data-poll-status]');
    const error = form.querySelector('[data-poll-error]');
    const unavailable = form.querySelector('[data-poll-unavailable]');
    const fieldsets = Array.from(form.querySelectorAll('[data-poll-answers]'));
    const interests = Array.from(form.querySelectorAll('input[name="interest"]'));
    const quantities = Array.from(form.querySelectorAll('input[name="quantity"]'));
    const trap = form.querySelector('input[name="website"]');
    const mobile = window.matchMedia('(max-width: 700px)');
    let startedAt = now();
    let phase = 'draft';
    let attempt = null;
    let receipt = null;
    let hadUnknown = false;
    let code = '';
    let retryAt = 0;
    let retryTimer = null;
    let inFlight = false;
    let storage;
    let available = true;
    let priorAttemptFound = false;

    function selected(options) { const checked = options.find(function (radio) { return radio.checked; }); return checked ? checked.value : ''; }

    function syncPanel(animate, afterReset) {
      const answered = !afterReset && Boolean(selected(interests));
      const wasHidden = panel.hidden;
      panel.hidden = mobile.matches && !answered && !attempt;
      panel.dataset.revealed = String(Boolean(animate && wasHidden && !panel.hidden));
      const description = panel.hidden
        ? 'Choose an answer to reveal the optional monthly quantity and Submit.'
        : 'Optional monthly quantity and Submit are shown below.';
      if (disclosure.textContent !== description) disclosure.textContent = description;
    }

    function saveAttempt() {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, phase: phase, payload: attempt, receipt: receipt, hadUnknown: hadUnknown, code: code, retryAt: retryAt }));
        return true;
      } catch (_) { return false; }
    }

    function render() {
      const locked = phase !== 'draft';
      fieldsets.forEach(function (fieldset) { fieldset.disabled = locked; });
      form.setAttribute('aria-busy', String(inFlight));
      reset.disabled = !available || !['draft', 'rejected'].includes(phase) || hadUnknown || inFlight;
      submit.disabled = !available || inFlight || ['saved', 'terminal', 'blocked'].includes(phase) || retryAt > now();
      submit.textContent = inFlight ? 'Submitting…' : phase === 'saved' ? 'Submitted' : phase === 'terminal' ? 'Unable to verify' : attempt ? 'Retry same response' : 'Submit';
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = null;
      if (retryAt > now() && !inFlight && !['saved', 'terminal', 'blocked'].includes(phase)) {
        retryTimer = window.setTimeout(function () { retryTimer = null; render(); }, retryAt - now() + 20);
      }
      syncPanel(false, false);
    }

    function showUnknown(nextCode, waitSeconds) {
      phase = TERMINAL_CODES.includes(nextCode) ? 'terminal' : 'unknown';
      hadUnknown = true;
      code = nextCode;
      retryAt = now() + waitSeconds * 1000;
      status.textContent = '';
      error.textContent = phase === 'terminal'
        ? 'We can’t confirm whether this response was saved, and it can’t be retried safely. Your answers are kept here; no new response will be sent automatically.'
        : 'We couldn’t confirm whether your response was saved. Your answers are kept unchanged to avoid duplicates. ' + (waitSeconds ? 'Please wait ' + waitSeconds + ' seconds, then retry the same response.' : 'Select Retry same response to try again safely.');
      saveAttempt();
    }

    function restore() {
      if (typeof window.fetch !== 'function' || typeof window.AbortController !== 'function' || !window.crypto || typeof window.crypto.randomUUID !== 'function') throw new Error('Unsupported browser');
      storage = window.sessionStorage;
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return;
      priorAttemptFound = true;
      if (raw.length > 6000) throw new Error('Invalid saved attempt');
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1 || !validPayload(saved.payload) || !['pending', 'unknown', 'rejected', 'saved', 'terminal'].includes(saved.phase)) throw new Error('Invalid saved attempt');
      if (typeof saved.hadUnknown !== 'boolean' || typeof saved.code !== 'string' || !Number.isSafeInteger(saved.retryAt) || saved.retryAt < 0) throw new Error('Invalid saved attempt');
      attempt = Object.freeze(saved.payload);
      startedAt = attempt.startedAt;
      interests.forEach(function (radio) { radio.checked = radio.value === attempt.interest; });
      quantities.forEach(function (radio) { radio.checked = radio.value === attempt.quantity; });
      hadUnknown = saved.hadUnknown;
      code = saved.code;
      retryAt = saved.retryAt;
      if (saved.phase === 'saved' && validReceipt(saved.receipt, attempt)) {
        phase = 'saved';
        receipt = saved.receipt;
        status.textContent = 'Your response was saved. Thank you for sharing your interest.';
      } else if (saved.phase === 'rejected' && !hadUnknown && NO_WRITE_CODES.includes(code)) {
        phase = 'rejected';
        error.textContent = 'Your previous response was not accepted. You can retry the same response or clear your answers to start again.';
      } else {
        showUnknown(saved.phase === 'terminal' ? code : 'OUTCOME_UNKNOWN', Math.max(0, Math.min(86400, Math.ceil((retryAt - now()) / 1000))));
      }
    }

    form.addEventListener('change', function (event) {
      if (event.target.name === 'interest' && phase === 'draft') syncPanel(true, false);
      if (phase === 'draft') { status.textContent = ''; error.textContent = ''; }
    });

    form.addEventListener('reset', function (event) {
      if (!available || inFlight || hadUnknown || !['draft', 'rejected'].includes(phase)) { event.preventDefault(); return; }
      if (attempt) {
        try { storage.removeItem(STORAGE_KEY); }
        catch (_) { event.preventDefault(); error.textContent = 'Your previous response could not be cleared safely. Please retry the same response.'; return; }
      }
      attempt = null;
      receipt = null;
      phase = 'draft';
      code = '';
      retryAt = 0;
      startedAt = now();
      status.textContent = '';
      error.textContent = '';
      render();
      // The native reset clears controls after the event. No focus or scroll changes.
      syncPanel(false, true);
    });

    async function send(event) {
      event.preventDefault();
      if (!available || inFlight || ['saved', 'terminal', 'blocked'].includes(phase) || now() < retryAt) return;
      if (!attempt) {
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (trap.value !== '') { error.textContent = 'This response could not be submitted.'; return; }
        try {
          attempt = Object.freeze({ submissionId: startedAt + '.' + window.crypto.randomUUID(), startedAt: startedAt, interest: selected(interests), quantity: selected(quantities), website: '' });
        } catch (_) { error.textContent = 'This browser could not prepare a safe submission. Please use the original poll.'; unavailable.hidden = false; return; }
        if (!validPayload(attempt)) { attempt = null; error.textContent = 'Please select one of the interest options and try again.'; return; }
      }
      const previousPhase = phase;
      phase = 'pending';
      // Save the immutable retry key before any request can leave the browser.
      if (!saveAttempt()) {
        phase = previousPhase;
        if (previousPhase === 'draft') attempt = null;
        error.textContent = 'Your browser couldn’t keep a temporary submission receipt, so nothing new was sent. Please enable session storage to use this poll.';
        if (!hadUnknown && !attempt) unavailable.hidden = false;
        render();
        return;
      }
      inFlight = true;
      status.textContent = 'Submitting your response…';
      error.textContent = '';
      render();
      const controller = new window.AbortController();
      let timeout;
      try {
        const timedOut = new Promise(function (_, reject) {
          timeout = window.setTimeout(function () { controller.abort(); reject(new Error('Request timeout')); }, REQUEST_TIMEOUT_MS);
        });
        const response = await Promise.race([window.fetch('/api/pod-interest', {
          method: 'POST', mode: 'same-origin', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(attempt), signal: controller.signal
        }), timedOut]);
        const body = await Promise.race([response.json(), timedOut]);
        if (response.ok && validReceipt(body, attempt)) {
          phase = 'saved';
          receipt = body;
          retryAt = 0;
          code = '';
          status.textContent = 'Your response was saved. Thank you for sharing your interest.';
          error.textContent = '';
          saveAttempt();
        } else {
          const validError = exactKeys(body, ['ok', 'code', 'retryAfterSeconds']) && body.ok === false && typeof body.code === 'string' && Number.isInteger(body.retryAfterSeconds) && body.retryAfterSeconds >= 0 && body.retryAfterSeconds <= 86400;
          const nextCode = validError ? body.code : 'UPSTREAM_INVALID';
          const wait = validError ? body.retryAfterSeconds : 0;
          if (!hadUnknown && NO_WRITE_CODES.includes(nextCode)) {
            phase = 'rejected';
            code = nextCode;
            retryAt = now() + wait * 1000;
            status.textContent = '';
            error.textContent = 'Your response was not accepted. ' + (wait ? 'Please wait ' + wait + ' seconds before retrying.' : 'Retry the same response, or clear your answers to start again.');
            saveAttempt();
          } else showUnknown(nextCode, wait);
        }
      } catch (_) {
        showUnknown('OUTCOME_UNKNOWN', 0);
      } finally {
        if (timeout !== undefined) window.clearTimeout(timeout);
        inFlight = false;
        render();
      }
    }
    form.addEventListener('submit', send);
    const resized = function () { syncPanel(false, false); };
    if (mobile.addEventListener) mobile.addEventListener('change', resized);
    else mobile.addListener(resized);
    try { restore(); }
    catch (_) {
      available = false;
      phase = 'blocked';
      error.textContent = priorAttemptFound
        ? 'A previous response couldn’t be restored safely. We can’t confirm whether it was saved, so no new response will be sent.'
        : 'This browser couldn’t safely prepare the poll. No new response has been sent.';
      unavailable.hidden = priorAttemptFound;
    }
    render();
    return { form: form, submit: send, state: function () { return { phase: phase, payload: attempt, hadUnknown: hadUnknown, retryAt: retryAt }; } };
  });
});
