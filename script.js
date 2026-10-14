/* TASTAMA public website. No product APIs, external trackers or form POSTs. */
(() => {
  'use strict';
  const config = window.TASTAMA_CONFIG || {};
  const copy = window.TASTAMA_COPY;
  const utils = window.TASTAMA_UTILS;
  const html = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  let language = 'en';
  let selectedTab = 0;
  let selectedScreen = 0;
  let menuOpen = false;
  let demoOpen = false;
  let draftData = null;
  let statusKey = '';
  let currentErrors = {};
  let dialogTrigger = null;
  let preparing = false;
  let lastPrepared = 0;
  const t = key => copy[language]?.[key] || copy.en[key] || key;
  const screens = [
    {name:'student-dashboard',width:1200,height:800},
    {name:'unt-test',width:1200,height:900},
    {name:'test-results',width:1200,height:1240},
    {name:'teacher-analytics',width:1200,height:640}
  ];
  const contactEmail = utils.verifiedContact(config);
  const appUrl = utils.safeAppUrl(config);
  const form = $('#contact-form');
  const submitButton = $('.form-submit');
  const intentSelect = $('#contact-intent');
  const menu = $('#mobile-menu');
  const menuToggle = $('.menu-toggle');
  const imageDialog = $('#image-dialog');
  const privacyDialog = $('#privacy-dialog');

  // Config is the source for future team updates; never invent missing profiles.
  $$('.team-card').forEach((card,index) => {
    const person = config.team?.[index]; if(!person) return;
    card.querySelector('h3').textContent = person.name;
    card.querySelector('.team-avatar').textContent = person.initials;
    card.querySelector('.team-role').dataset.i18n = person.roleKey;
    card.querySelector('.team-bio').dataset.i18n = person.bioKey;
    const university = card.querySelector('.team-university');
    if(person.universityKey) {
      const line = university || card.appendChild(document.createElement('p'));
      line.className = 'team-university';line.dataset.i18n = person.universityKey;
    } else university?.remove();
    card.querySelectorAll('.team-social').forEach(link => link.remove());
    for(const service of ['github','linkedin']) {
      if(!person[service]) continue;
      try {
        const url = new URL(person[service]);
        if(url.protocol !== 'https:' || url.username || url.password || !({github:['github.com','www.github.com'],linkedin:['linkedin.com','www.linkedin.com']}[service].includes(url.hostname))) continue;
        const link = document.createElement('a');link.className = 'team-social';link.href = url.href;link.target = '_blank';link.rel = 'noopener noreferrer';
        const arrow = document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
        const label = document.createElement('span');label.dataset.i18n = `team.${service}`;
        link.append(arrow,label);card.appendChild(link);
      } catch { /* Ignore invalid profile configuration. */ }
    }
  });

  // Integrators may listen locally. Never include names, email, form content or URLs.
  function track(name, detail = {}) {
    window.dispatchEvent(new CustomEvent('tastama:analytics', {
      detail: {name, language, ...detail}
    }));
  }
  function applyTranslations() {
    $$('[data-i18n]').forEach(element => {element.textContent = t(element.dataset.i18n);});
    for (const [suffix, attribute] of [['aria','aria-label'],['alt','alt'],['placeholder','placeholder']]) {
      $$(`[data-i18n-${suffix}]`).forEach(element => element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${suffix}`))));
    }
  }
  function setLanguage(value, fromClick = false) {
    language = utils.normalizeLanguage(value);
    html.lang = language;
    try {localStorage.setItem('tastama-lang', language);} catch { /* Storage may be disabled. */ }
    applyTranslations();
    $$('.lang-btn').forEach(link => {
      const active = link.dataset.lang === language;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current');
      link.href = `/${link.dataset.lang}/${location.hash}`;
    });
    document.title = t('meta.title');
    $('meta[name="description"]').content = t('meta.description');
    $('meta[property="og:title"]').content = t('meta.title');
    $('meta[property="og:description"]').content = t('meta.description');
    $('meta[property="og:locale"]').content = {en:'en_US',ru:'ru_RU',kk:'kk_KZ'}[language];
    const siteRoot = config.siteUrl || 'https://tastama.tech';
    const canonical = !fromClick && ['/', '/index.html'].includes(location.pathname) ? `${siteRoot}/` : `${siteRoot}/${language}/`;
    $('link[rel="canonical"]').href = canonical;
    $('meta[property="og:url"]').content = canonical;
    const alternates = ['en','ru','kk'].filter(lang => lang !== language);
    $$('meta[property="og:locale:alternate"]').forEach((meta,index) => {meta.content = {en:'en_US',ru:'ru_RU',kk:'kk_KZ'}[alternates[index]];});
    menuToggle.setAttribute('aria-label', t(menuOpen ? 'a11y.menuClose' : 'a11y.menuOpen'));
    updateShowcase();
    updateDemo();
    configureContact();
    showErrors(currentErrors);
    if (statusKey) setStatus(statusKey, $('#form-status').classList.contains('error'));
    if (draftData) updateDraft();
    if (imageDialog.open) updateDialogImage();
    if (fromClick) {
      // The built language pages share this template and all assets; no reload loses a draft.
      try {history.replaceState(null, '', `/${language}/${location.hash}`);} catch { /* Embedded previews may limit history. */ }
      track('language_changed');
    }
  }
  // The page follows the system theme. A manual choice lasts only for this tab's session,
  // and a later change of the system theme always wins over it.
  const themeToggle = $('.theme-toggle');
  const systemDark = matchMedia('(prefers-color-scheme:dark)');
  let savedTheme;
  try {savedTheme = sessionStorage.getItem('tastama-theme');} catch { /* Preference is optional. */ }
  function applyTheme(theme) {
    html.dataset.theme = theme;
    const key = theme === 'dark' ? 'a11y.themeLight' : 'a11y.themeDark';
    themeToggle.dataset.i18nAria = key;
    themeToggle.setAttribute('aria-label', t(key));
  }
  applyTheme(['light','dark'].includes(savedTheme) ? savedTheme : systemDark.matches ? 'dark' : 'light');
  themeToggle.addEventListener('click', () => {
    savedTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    try {sessionStorage.setItem('tastama-theme', savedTheme);} catch { /* Storage may be disabled. */ }
    track('theme_changed', {theme: savedTheme});
    // The new theme spreads as a circular wave from the toggle; unsupported browsers and reduced motion switch instantly.
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion:reduce)').matches) {
      applyTheme(savedTheme);
      return;
    }
    const box = themeToggle.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const theme = savedTheme;
    const transition = document.startViewTransition(() => applyTheme(theme));
    transition.ready.then(() => {
      html.animate(
        {clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]},
        {duration: 700, easing: 'cubic-bezier(.55,0,.25,1)', pseudoElement: '::view-transition-new(root)'}
      );
    }).catch(() => { /* The theme is already applied if the animation cannot run. */ });
  });
  systemDark.addEventListener('change', event => {
    savedTheme = null;
    try {sessionStorage.removeItem('tastama-theme');} catch { /* Storage may be disabled. */ }
    applyTheme(event.matches ? 'dark' : 'light');
  });
  let savedLanguage;
  try {savedLanguage = localStorage.getItem('tastama-lang');} catch { /* Preference is optional. */ }
  const queryLanguage = new URL(location.href).searchParams.get('lang');
  const pathLanguage = location.pathname.match(/^\/(en|ru|kk)\//)?.[1];
  setLanguage(queryLanguage || pathLanguage || savedLanguage || navigator.language);
  $$('.lang-btn').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setLanguage(link.dataset.lang, true);
  }));

  // An unverified product URL is never treated as a working destination.
  if (appUrl) $$('.js-platform-link').forEach(link => {
    link.href = appUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    delete link.dataset.intent; link.dataset.event = 'platform_open';
    const label = link.querySelector('[data-i18n]') || link;
    label.dataset.i18n = 'common.tryPlatform'; label.textContent = t('common.tryPlatform');
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-event]');
    if (target) track(target.dataset.event, {placement: target.closest('header') ? 'header' : target.closest('#centers') ? 'centers' : 'page'});
    const intent = event.target.closest('[data-intent]');
    if (intent) {
      intentSelect.value = intent.dataset.intent;
      if (draftData) invalidateDraft();
      closeMenu(false);
      // Anchor handles navigation. Keyboard focus follows the intent field.
      requestAnimationFrame(() => intentSelect.focus({preventScroll:true}));
    }
  });

  function closeMenu(returnFocus = true) {
    menuOpen = false; menu.hidden = true;
    menuToggle.setAttribute('aria-expanded','false');
    menuToggle.setAttribute('aria-label',t('a11y.menuOpen'));
    document.body.classList.remove('menu-open');
    if (returnFocus) menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => {
    if (menuOpen) closeMenu();
    else {
      menuOpen = true; menu.hidden = false;
      menuToggle.setAttribute('aria-expanded','true');
      menuToggle.setAttribute('aria-label',t('a11y.menuClose'));
      document.body.classList.add('menu-open');
      menu.querySelector('a').focus();
    }
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('click', event => {if (menuOpen && !$('.site-header').contains(event.target)) closeMenu(false);});
  document.addEventListener('keydown', event => {
    if (!menuOpen) return;
    if (event.key === 'Escape') {event.preventDefault();closeMenu();return;}
    if (event.key === 'Tab') {
      const links = [...menu.querySelectorAll('a')];
      if (event.shiftKey && document.activeElement === links[0]) {event.preventDefault();menuToggle.focus();}
      else if (!event.shiftKey && document.activeElement === links.at(-1)) {event.preventDefault();menuToggle.focus();}
      else if (document.activeElement === menuToggle) {event.preventDefault();(event.shiftKey ? links.at(-1) : links[0]).focus();}
    }
  });
  matchMedia('(min-width:1200px)').addEventListener('change', event => {if(event.matches && menuOpen) closeMenu(false);});
  const header = $('.site-header');
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 10);
  addEventListener('scroll', updateHeader, {passive:true}); updateHeader();

  function updateShowcase() {
    const title = $('#showcase-title'); const description = $('#showcase-description');
    title.dataset.i18n = `product.p${selectedTab + 1}Title`; title.textContent = t(title.dataset.i18n);
    description.dataset.i18n = `product.p${selectedTab + 1}Text`; description.textContent = t(description.dataset.i18n);
    $('.showcase-number').textContent = `0${selectedTab + 1} / 04`;
  }
  function selectTab(index, focus = false) {
    selectedTab = index;
    $$('[data-tab]').forEach((tab,i) => {
      tab.setAttribute('aria-selected',String(i === index));tab.tabIndex = i === index ? 0 : -1;
      $(`#panel-${i}`).hidden = i !== index;
    });
    updateShowcase();
    if (focus) $(`#tab-${index}`).focus();
    track('showcase_tab', {screen: screens[index].name});
  }
  $$('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => selectTab(Number(tab.dataset.tab)));
    tab.addEventListener('keydown', event => {
      const actions = {ArrowRight:(selectedTab + 1) % 4,ArrowLeft:(selectedTab + 3) % 4,Home:0,End:3};
      if (event.key in actions) {event.preventDefault();selectTab(actions[event.key],true);}
    });
  });
  function updateDialogImage() {
    const screen = screens[selectedScreen]; const img = $('#dialog-image');
    img.width = screen.width; img.height = screen.height;
    img.alt = t(`product.alt${selectedScreen + 1}`);
    img.src = `/assets/screenshots/${screen.name}-1600.webp`;
    $('#image-title').textContent = `${t(`product.tab${selectedScreen + 1}`)} · MVP`;
  }
  function openScreen(index, trigger) {
    selectedScreen = index; dialogTrigger = trigger; updateDialogImage();
    imageDialog.showModal();document.body.classList.add('dialog-open');
    imageDialog.querySelector('[data-close-dialog]').focus();
    track('screenshot_open', {screen:screens[index].name});
  }
  $$('[data-screen]').forEach(button => button.addEventListener('click', () => openScreen(Number(button.dataset.screen),button)));
  $('#expand-showcase').addEventListener('click', event => openScreen(selectedTab,event.currentTarget));
  $('#previous-screen').addEventListener('click', () => {selectedScreen = (selectedScreen + 3) % 4;updateDialogImage();});
  $('#next-screen').addEventListener('click', () => {selectedScreen = (selectedScreen + 1) % 4;updateDialogImage();});
  imageDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); selectedScreen = (selectedScreen + (event.key === 'ArrowRight' ? 1 : 3)) % 4;updateDialogImage();
    }
  });
  $$('[data-open-privacy]').forEach(button => button.addEventListener('click', () => {
    dialogTrigger = button;privacyDialog.showModal();document.body.classList.add('dialog-open');
    privacyDialog.querySelector('[data-close-dialog]').focus();
  }));
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  [imageDialog,privacyDialog].forEach(dialog => {
    dialog.addEventListener('click', event => {if(event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }});
    dialog.addEventListener('close', () => {document.body.classList.remove('dialog-open');dialogTrigger?.focus();});
  });

  function updateDemo() {
    $('#ai-result').hidden = !demoOpen;
    $('#demo-reveal').setAttribute('aria-expanded',String(demoOpen));
    const label = $('#demo-reveal [data-i18n]'); label.dataset.i18n = demoOpen ? 'ai.reset' : 'ai.reveal'; label.textContent = t(label.dataset.i18n);
    $$('.ai-flow>li').forEach((step,index) => step.classList.toggle('active',demoOpen || index === 0));
    $('.demo-source').href = language === 'ru' ? 'https://e-history.kz/ru/projects/show/23181' : 'https://e-history.kz/en/amp/history-of-kazakhstan/show/9553';
  }
  $('#demo-reveal').addEventListener('click', () => {demoOpen = !demoOpen;updateDemo();track('ai_example', {state:demoOpen?'expanded':'reset'});});

  function configureContact() {
    $('#contact-notice').hidden = Boolean(contactEmail);
    const emailLink = $('#verified-email');emailLink.hidden = !contactEmail;
    if(contactEmail) {emailLink.href = utils.mailtoUrl(contactEmail,'','');emailLink.textContent = contactEmail;}
    if(preparing) $('.form-submit [data-i18n]').textContent = t('contact.loading');
  }
  function setStatus(key, error = false) {
    statusKey = key;$('#form-status').textContent = key ? t(key) : '';
    $('#form-status').classList.toggle('error',error);
  }
  function showErrors(errors) {
    currentErrors = errors;
    for(const field of ['name','organization','email','message']) {
      $(`#error-${field}`).textContent = errors[field] ? t(errors[field]) : '';
      $(`#contact-${field}`).setAttribute('aria-invalid',String(Boolean(errors[field])));
    }
  }
  function updateDraft() {
    const subjectKey = {demo:'contact.demoSubject',pilot:'contact.pilotSubject',general:'contact.generalSubject'}[intentSelect.value];
    const subject = t(subjectKey);
    const draft = utils.makeDraft(draftData, copy[language], subject);
    $('#request-draft').value = draft;
    const emailButton = $('#mailto-draft'); emailButton.hidden = !contactEmail;
    if(contactEmail) emailButton.href = utils.mailtoUrl(contactEmail,subject,draft);
  }
  function invalidateDraft() {
    draftData = null; $('#draft-result').hidden = true;$('#request-draft').value = '';
    setStatus('');
  }
  form.addEventListener('input', () => {if(draftData) invalidateDraft();});
  intentSelect.addEventListener('change', () => {if(draftData) invalidateDraft();});
  form.addEventListener('submit', async event => {
    event.preventDefault(); if(preparing) return;
    const data = Object.fromEntries(new FormData(form));
    const errors = utils.validateContact(data);showErrors(errors);
    if(Object.keys(errors).length) {
      setStatus('contact.error',true);
      const field = Object.keys(errors).find(key => key !== 'spam');
      if(field) $(`#contact-${field}`).focus();return;
    }
    if(Date.now() - lastPrepared < 2500) {setStatus('contact.tooFast',true);return;}
    preparing = true;submitButton.disabled = true;form.setAttribute('aria-busy','true');
    setStatus('contact.loading');$('.form-submit [data-i18n]').textContent = t('contact.loading');
    try {
      // Let the browser paint the local preparing state; there is no network call.
      await new Promise(resolve => requestAnimationFrame(resolve));
      draftData = data;updateDraft();$('#draft-result').hidden = false;
      setStatus(contactEmail ? 'contact.ready' : 'contact.unavailable');
      lastPrepared = Date.now();track('contact_draft_prepared',{intent:intentSelect.value});
    } catch {setStatus('contact.error',true);}
    finally {preparing=false;submitButton.disabled=false;form.removeAttribute('aria-busy');$('.form-submit [data-i18n]').textContent=t('contact.submit');}
  });
  $('#copy-draft').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText($('#request-draft').value);setStatus('contact.copied');track('contact_draft_copied',{intent:intentSelect.value});}
    catch {$('#request-draft').focus();$('#request-draft').select();setStatus('contact.copyError',true);}
  });
  $('#download-draft').addEventListener('click', () => {
    const blob = new Blob([$('#request-draft').value],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);const link = document.createElement('a');
    link.href = url;link.download = 'TASTAMA-request.txt';document.body.appendChild(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    track('contact_draft_downloaded',{intent:intentSelect.value});
  });
  $('#mailto-draft').addEventListener('click', () => {setStatus('contact.ready');track('contact_email_opened',{intent:intentSelect.value});});

  // Content remains visible if JS, observers or motion preferences are unavailable.
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  if(!reduced.matches && 'IntersectionObserver' in window) {
    html.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting) {entry.target.classList.add('visible');observer.unobserve(entry.target);}
    }),{threshold:.08,rootMargin:'0px 0px 30px 0px'});
    $$('.reveal').forEach(element => observer.observe(element));
    reduced.addEventListener('change', event => {if(event.matches) {html.classList.remove('motion-ready');observer.disconnect();}});
  }
  $('#year').textContent = String(new Date().getFullYear());
  // Default HTML is disabled, so a script failure cannot leak form data via native GET.
  $('#contact-fields').disabled = false;
})();
