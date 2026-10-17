/* ==========================================================================
   Meranie a súhlas s cookies (Google Tag Manager + Consent Mode v2)
   --------------------------------------------------------------------------
   NASTAVENIE: doplňte ID kontajnera Google Tag Manager, napr. 'GTM-ABC1234'.
   Kým je GTM_ID prázdne, web nespúšťa žiadne meranie a lišta so súhlasom
   sa nezobrazí. Po doplnení sa zobrazí lišta a meranie sa riadi voľbou
   návštevníka (analytické / marketingové cookies).

   Tento súbor sa načítava v <head> ako prvý skript – súhlas musí byť
   nastavený skôr, než sa spustí akákoľvek značka v GTM.
   ========================================================================== */
(function () {
  'use strict';

  var GTM_ID = '';                         // <-- sem ID kontajnera GTM
  var STORAGE_KEY = 'suhlas-cookies-v1';   // zmena verzie vyvolá novú otázku na súhlas
  var PRIVACY_URL = '#cookies';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  if (!GTM_ID) return;

  /* Predvolený stav: všetko okrem nevyhnutného je zamietnuté --------------- */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  function readChoice() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveChoice(choice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch (e) { /* súkromné okno – voľba platí len pre túto stránku */ }
  }

  function applyChoice(choice) {
    gtag('consent', 'update', {
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      ad_storage: choice.marketing ? 'granted' : 'denied',
      ad_user_data: choice.marketing ? 'granted' : 'denied',
      ad_personalization: choice.marketing ? 'granted' : 'denied'
    });
    window.dataLayer.push({ event: 'consent_update', consent_analytics: !!choice.analytics, consent_marketing: !!choice.marketing });
  }

  var stored = readChoice();
  if (stored) applyChoice(stored);

  /* Google Tag Manager --------------------------------------------------- */
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  var gtm = document.createElement('script');
  gtm.async = true;
  gtm.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
  var first = document.getElementsByTagName('script')[0];
  first.parentNode.insertBefore(gtm, first);

  /* Lišta a nastavenia ---------------------------------------------------- */
  function decide(choice) {
    choice.date = new Date().toISOString();
    saveChoice(choice);
    applyChoice(choice);
    var bar = document.querySelector('.consent');
    if (bar) bar.remove();
  }

  function buildDialog() {
    var dialog = document.createElement('dialog');
    dialog.className = 'consent-dialog';
    dialog.setAttribute('aria-labelledby', 'consent-dialog-title');
    dialog.innerHTML =
      '<form method="dialog">' +
        '<h2 id="consent-dialog-title">Nastavenia cookies</h2>' +
        '<p>Vyberte, ktoré cookies môžeme používať. Voľbu môžete kedykoľvek zmeniť v pätičke stránky.</p>' +
        '<label class="consent-option"><input type="checkbox" checked disabled>' +
          '<strong>Nevyhnutné</strong><span>Zabezpečujú fungovanie webu a zapamätanie vašej voľby. Sú vždy zapnuté.</span></label>' +
        '<label class="consent-option"><input type="checkbox" name="analytics">' +
          '<strong>Analytické</strong><span>Anonymné meranie návštevnosti, aby sme vedeli web zlepšovať (Google Analytics).</span></label>' +
        '<label class="consent-option"><input type="checkbox" name="marketing">' +
          '<strong>Marketingové</strong><span>Meranie úspešnosti reklamy a zobrazovanie relevantnej reklamy (Google Ads, Meta).</span></label>' +
        '<div class="consent-dialog__actions">' +
          '<button type="submit" class="btn btn--outline btn--small" value="save">Uložiť výber</button>' +
          '<button type="submit" class="btn btn--primary btn--small" value="all">Prijať všetko</button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(dialog);

    dialog.addEventListener('close', function () {
      if (dialog.returnValue === 'all') {
        decide({ analytics: true, marketing: true });
      } else if (dialog.returnValue === 'save') {
        decide({
          analytics: dialog.querySelector('input[name="analytics"]').checked,
          marketing: dialog.querySelector('input[name="marketing"]').checked
        });
      }
    });
    return dialog;
  }

  function openSettings() {
    var dialog = document.querySelector('.consent-dialog') || buildDialog();
    var current = readChoice() || { analytics: false, marketing: false };
    dialog.querySelector('input[name="analytics"]').checked = !!current.analytics;
    dialog.querySelector('input[name="marketing"]').checked = !!current.marketing;
    dialog.returnValue = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  function showBar() {
    var bar = document.createElement('div');
    bar.className = 'consent';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Súhlas s cookies');
    bar.innerHTML =
      '<div class="consent__inner">' +
        '<p class="consent__text">Na meranie návštevnosti a vyhodnocovanie reklamy používame cookies. ' +
        'Zapneme ich len s vaším súhlasom. <a href="' + PRIVACY_URL + '">Viac informácií</a></p>' +
        '<div class="consent__actions">' +
          '<button type="button" class="btn btn--outline btn--small" data-consent="settings">Nastavenia</button>' +
          '<button type="button" class="btn btn--primary btn--small" data-consent="reject">Odmietnuť</button>' +
          '<button type="button" class="btn btn--primary btn--small" data-consent="accept">Prijať všetko</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var action = e.target.getAttribute && e.target.getAttribute('data-consent');
      if (action === 'accept') decide({ analytics: true, marketing: true });
      if (action === 'reject') decide({ analytics: false, marketing: false });
      if (action === 'settings') openSettings();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-consent-open]').forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener('click', openSettings);
    });
    if (!stored) showBar();
  });
})();
