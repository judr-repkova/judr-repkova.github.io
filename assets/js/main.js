/* ==========================================================================
   Web advokátky – správanie jednostránkovej verzie
   - mobilné menu a hlavička (linka a tieň pri posúvaní, ukazovateľ čítania)
   - zvýraznenie sekcie, na ktorej návštevník práve je
   - prepínač oblastí práva (aj priamy odkaz, napr. /#rodinne-pravo)
   - odoslanie formulára cez Web3Forms bez opustenia stránky
   - meranie (dataLayer pre Google Tag Manager), UTM parametre z kampaní
   - lišta s kontaktom na mobile, rozbalenie ochrany osobných údajov
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  window.dataLayer = window.dataLayer || [];

  function smooth() {
    return reduceMotion.matches ? 'auto' : 'smooth';
  }

  /* Mobilné menu ---------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    var h = document.querySelector('[data-header]');
    if (h) h.classList.toggle('menu-open', open);
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });

    var desktop = window.matchMedia('(min-width: 60em)');
    var onDesktop = function (e) { if (e.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
  }

  /* Hlavička, ukazovateľ čítania a aktívna sekcia v menu ----------------- */
  var header = document.querySelector('[data-header]');
  var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav__link[href^="#"]'));
  var sections = links.map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); });
  var indicator = document.querySelector('.site-nav__indicator');
  var current = null;

  function placeIndicator() {
    if (!indicator || !nav) return;
    nav.classList.toggle('has-active', !!current);
    if (current) {
      indicator.style.setProperty('--x', current.offsetLeft + 'px');
      indicator.style.setProperty('--w', current.offsetWidth + 'px');
    }
  }

  function setActive(link) {
    if (link === current) return;
    links.forEach(function (l) {
      var on = l === link;
      l.classList.toggle('is-active', on);
      if (on) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
    current = link;
    placeIndicator();
  }

  var ticking = false;

  function onScroll() {
    ticking = false;
    if (!header) return;
    var y = window.pageYOffset || root.scrollTop;
    var max = root.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 4);
    header.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');

    var line = header.offsetHeight + window.innerHeight * 0.3;
    var active = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i] && sections[i].getBoundingClientRect().top <= line) active = links[i];
    }
    if (max - y < 2 && links.length) active = links[links.length - 1];
    setActive(active);
  }

  if (header) {
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    window.addEventListener('resize', function () {
      placeIndicator();
      onScroll();
    });
    onScroll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeIndicator);
  }

  /* Oblasti práva – prepínač --------------------------------------------- */
  var tabsRoot = document.querySelector('[data-tabs]');
  var tabs = [];
  var panels = [];

  function activateTab(index, byUser) {
    tabs.forEach(function (t, j) {
      var on = j === index;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[j].classList.toggle('is-active', on);
    });
    if (byUser) {
      var list = tabs[index].closest('ul');
      if (list && list.scrollWidth > list.clientWidth) {
        var li = tabs[index].parentElement;
        list.scrollTo({ left: li.offsetLeft - list.clientWidth / 2 + li.offsetWidth / 2, behavior: smooth() });
      }
      window.dataLayer.push({ event: 'practice_area_view', practice_area: panels[index].id });
    }
  }

  function tabFromHash() {
    var id = window.location.hash.slice(1);
    for (var k = 0; k < panels.length; k++) {
      if (panels[k].id === id) {
        activateTab(k, false);
        return true;
      }
    }
    return false;
  }

  if (tabsRoot) {
    var tablist = tabsRoot.querySelector('[data-tablist]');
    tabs = Array.prototype.slice.call(tabsRoot.querySelectorAll('[data-tab]'));
    panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('data-tab')); });

    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Oblasti práva');

    tabs.forEach(function (t, i) {
      var panel = panels[i];
      t.parentElement.setAttribute('role', 'presentation');
      t.setAttribute('role', 'tab');
      t.id = 'tab-' + panel.id;
      t.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', t.id);
      panel.tabIndex = 0;

      t.addEventListener('click', function () { activateTab(i, true); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          activateTab(next, true);
          tabs[next].focus();
        }
      });
    });

    if (!tabFromHash()) activateTab(0, false);
    window.addEventListener('hashchange', tabFromHash);
  }

  /* „Dohodnúť konzultáciu“ v oblasti predvyplní oblasť vo formulári ------- */
  var areaSelect = document.querySelector('select[name="Oblasť"]');

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest ? e.target.closest('[data-oblast]') : null;
    if (!trigger || !areaSelect) return;
    var slug = trigger.getAttribute('data-oblast');
    for (var i = 0; i < areaSelect.options.length; i++) {
      if (areaSelect.options[i].getAttribute('data-slug') === slug) {
        areaSelect.selectedIndex = i;
        break;
      }
    }
    areaSelect.classList.add('is-flash');
    window.setTimeout(function () { areaSelect.classList.remove('is-flash'); }, 1600);
  });

  /* Kroky spolupráce – linka sa vyplní, keď sa sekcia objaví -------------- */
  var steps = document.querySelector('.steps');
  if (steps && 'IntersectionObserver' in window && !reduceMotion.matches) {
    steps.classList.add('will-reveal');
    var stepsIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          steps.classList.add('is-visible');
          stepsIo.disconnect();
        }
      });
    }, { threshold: 0.35 });
    stepsIo.observe(steps);
  }

  /* Ochrana osobných údajov – rozbalí sa pri odkaze na ňu ----------------- */
  function openTarget(hash, scroll) {
    if (!hash || hash.length < 2) return;
    var el;
    try { el = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (err) { return; }
    if (!el) return;
    var details = el.closest ? el.closest('details') : null;
    if (details && !details.open) {
      details.open = true;
      if (scroll) el.scrollIntoView({ block: 'start', behavior: smooth() });
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (a) openTarget(a.getAttribute('href'), false);
  });
  openTarget(window.location.hash, true);
  window.addEventListener('hashchange', function () { openTarget(window.location.hash, true); });

  /* Lišta s kontaktom na mobile ------------------------------------------ */
  var bar = document.querySelector('[data-mobile-cta]');
  var hero = document.getElementById('uvod');
  var ends = [document.getElementById('kontakt'), document.querySelector('.site-footer')].filter(Boolean);

  if (bar && hero && 'IntersectionObserver' in window) {
    var heroVisible = true;
    var endVisible = {};
    var updateBar = function () {
      var anyEnd = Object.keys(endVisible).some(function (k) { return endVisible[k]; });
      bar.classList.toggle('is-visible', !heroVisible && !anyEnd);
    };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { heroVisible = entry.isIntersecting; });
      updateBar();
    }, { rootMargin: '0px 0px -40% 0px' }).observe(hero);
    var endIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { endVisible[ends.indexOf(entry.target)] = entry.isIntersecting; });
      updateBar();
    });
    ends.forEach(function (el) { endIo.observe(el); });
  }

  /* Meranie kliknutí na telefón a e-mail --------------------------------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="tel:"], a[href^="mailto:"]') : null;
    if (!link) return;
    window.dataLayer.push({
      event: 'contact_click',
      contact_method: link.getAttribute('href').indexOf('tel:') === 0 ? 'phone' : 'email',
      cta_location: link.getAttribute('data-cta') || 'text'
    });
  });

  /* Telefón na počítači – namiesto volania skopíruje číslo ---------------- */
  // Počítač väčšinou volať nevie a pokus otvoriť odkaz tel: môže stránku nahradiť
  // chybovou hláškou (napr. náhľad v editore). Na mobile sa volá ako doteraz.
  var canCall = window.matchMedia('(hover: none) and (pointer: coarse)');
  var toast = document.createElement('p');
  var toastTimer;
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  function showToast(text) {
    toast.classList.add('is-visible');
    toast.textContent = text;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 3500);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { /* prehliadač kopírovanie nepodporuje */ }
      area.remove();
      if (ok) resolve(); else reject();
    });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (!link || canCall.matches) return;
    e.preventDefault();
    var number = link.getAttribute('href').slice(4).replace(/^(\+\d{3})(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3 $4');
    copyText(number).then(function () {
      showToast('Číslo ' + number + ' je skopírované.');
    }, function () {
      showToast('Zavolajte na ' + number);
    });
  });

  /* Formulár -------------------------------------------------------------- */
  var form = document.querySelector('form[data-form="kontakt"]');

  if (form) {
    var params = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) {
      var v = params.get(k);
      var input = form.querySelector('input[name="' + k + '"]');
      if (v && input) input.value = v.slice(0, 200);
    });

    var card = form.closest('.form-card');
    var errorBox = card.querySelector('.form-error');
    var success = card.querySelector('.form-success');
    var button = form.querySelector('[type="submit"]');
    var label = button.textContent;
    var again = card.querySelector('[data-form-again]');

    var resetButton = function () {
      button.disabled = false;
      button.textContent = label;
      card.removeAttribute('aria-busy');
    };

    form.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData || !window.JSON) return; // starý prehliadač: klasické odoslanie
      e.preventDefault();

      errorBox.hidden = true;
      button.disabled = true;
      button.textContent = 'Odosielam…';
      card.setAttribute('aria-busy', 'true');

      var data = {};
      new FormData(form).forEach(function (value, key) {
        if (key !== 'redirect' && value !== '') data[key] = value;
      });

      var areaSlug = areaSelect && areaSelect.selectedOptions && areaSelect.selectedOptions[0]
        ? areaSelect.selectedOptions[0].getAttribute('data-slug') : '';

      fetch(form.getAttribute('action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (json) {
            if (!response.ok || json.success === false) throw new Error(json.message || 'Odoslanie zlyhalo');
            return json;
          });
        })
        .then(function () {
          resetButton();
          form.reset();
          card.classList.add('is-sent');
          success.focus({ preventScroll: true });
          card.scrollIntoView({ block: 'nearest', behavior: smooth() });
          window.dataLayer.push({ event: 'generate_lead', form_name: 'kontakt', practice_area: areaSlug || 'ine' });
        })
        .catch(function () {
          resetButton();
          errorBox.hidden = false;
          errorBox.scrollIntoView({ block: 'nearest', behavior: smooth() });
        });
    });

    if (again) {
      again.addEventListener('click', function () {
        card.classList.remove('is-sent');
        var first = form.querySelector('input:not([type="hidden"]):not([tabindex="-1"])');
        if (first) first.focus();
      });
    }

    // Odoslané bez JavaScriptu (návrat z Web3Forms na /#odoslane) – meranie konverzie
    if (window.location.hash === '#odoslane') {
      window.dataLayer.push({ event: 'generate_lead', form_name: 'kontakt', practice_area: 'nezadana' });
    }
  }

  /* Aktuálny rok v pätičke ------------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
