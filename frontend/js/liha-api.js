/**
 * Liha Tex — frontend ⇄ API glue
 * Handles the launch waitlist, the wholesale enquiry form and live store hours.
 * API base: same-origin `/api` in production (Vercel rewrites to Render),
 * http://localhost:8080/api when developing locally.
 */
(function () {
  'use strict';

  var localHosts = ['localhost', '127.0.0.1', ''];
  var isLocal = localHosts.indexOf(location.hostname) !== -1 || location.protocol === 'file:';
  var API = (window.LIHA_API_BASE || (isLocal ? 'http://localhost:8080/api' : '/api')).replace(/\/$/, '');

  function request(path, options) {
    var opts = options || {};
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.error || 'Something went wrong. Please call us on 95244 63580.');
          err.fields = data.fields;
          throw err;
        }
        return data;
      });
    });
  }

  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    var label = btn.querySelector('.btn-label');
    if (!label) return;
    if (!label.dataset.idle) label.dataset.idle = label.textContent;
    label.textContent = busy ? 'Sending…' : label.dataset.idle;
  }

  function setMsg(node, text, isError) {
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('error', !!isError);
  }

  /* ---------------- launch waitlist ---------------- */
  var waitlistForm = document.getElementById('waitlistForm');
  if (waitlistForm) {
    var contactInput = document.getElementById('waitlistContact');
    var waitlistMsg = document.getElementById('waitlistMsg');

    waitlistForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = (contactInput.value || '').trim();
      if (!value) {
        setMsg(waitlistMsg, 'Enter your email or mobile number.', true);
        contactInput.focus();
        return;
      }

      setBusy(waitlistForm, true);
      setMsg(waitlistMsg, '', false);

      request('/waitlist', { method: 'POST', body: { contact: value, source: 'website:soon' } })
        .then(function (data) {
          setMsg(waitlistMsg, data.message || "You're on the list.", false);
          waitlistForm.reset();
          loadWaitlistCount();
        })
        .catch(function (err) {
          setMsg(waitlistMsg, err.message, true);
        })
        .then(function () { setBusy(waitlistForm, false); });
    });
  }

  function loadWaitlistCount() {
    var node = document.getElementById('waitlistCount');
    if (!node) return;
    request('/waitlist/count')
      .then(function (data) {
        if (!data.count || data.count < 5) return;
        node.textContent = data.count + ' people already waiting';
        node.hidden = false;
      })
      .catch(function () { /* decorative only */ });
  }

  /* ---------------- wholesale enquiry ---------------- */
  var enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    var enquiryMsg = document.getElementById('enquiryMsg');

    enquiryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(enquiryForm);
      var payload = {
        name: (data.get('name') || '').toString().trim(),
        phone: (data.get('phone') || '').toString().trim(),
        productInterest: (data.get('productInterest') || '').toString(),
        quantity: (data.get('quantity') || '').toString().trim(),
        message: (data.get('message') || '').toString().trim(),
      };

      if (payload.name.length < 2) {
        setMsg(enquiryMsg, 'Please share your name.', true);
        return;
      }
      if (payload.phone.replace(/\D/g, '').length !== 10) {
        setMsg(enquiryMsg, 'Enter a 10-digit mobile number.', true);
        return;
      }

      setBusy(enquiryForm, true);
      setMsg(enquiryMsg, '', false);

      request('/enquiries', { method: 'POST', body: payload })
        .then(function (res) {
          setMsg(enquiryMsg, res.message || 'Thank you — we will call you back shortly.', false);
          enquiryForm.reset();
        })
        .catch(function (err) {
          setMsg(enquiryMsg, err.message, true);
        })
        .then(function () { setBusy(enquiryForm, false); });
    });
  }

  /* ---------------- live store hours ---------------- */
  function twelveHour(hhmm) {
    var parts = String(hhmm).split(':');
    var hour = Number(parts[0]);
    var minute = parts[1] || '00';
    var suffix = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12 || 12;
    return hour + (minute === '00' ? '' : ':' + minute) + ' ' + suffix;
  }

  function loadStoreStatus() {
    var text = document.getElementById('storeStatusText');
    var note = document.getElementById('storeStatusNote');
    var wrap = document.getElementById('storeStatus');
    if (!text || !wrap) return;

    request('/store')
      .then(function (data) {
        var status = data.status || {};
        if (status.openNow) {
          text.textContent = 'Open now';
          if (note) note.textContent = '· closes ' + twelveHour(status.today.close);
          wrap.classList.add('is-open');
        } else {
          text.textContent = 'Closed now';
          if (note) note.textContent = '· opens ' + twelveHour(status.today.open);
          wrap.classList.remove('is-open');
        }
      })
      .catch(function () {
        if (note) note.textContent = 'Call ahead to confirm';
      });
  }

  function start() {
    loadStoreStatus();
    loadWaitlistCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
