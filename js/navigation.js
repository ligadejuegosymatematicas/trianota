(function(){
  'use strict';

  const TABS = {
    home: 'tabHomeBtn',
    profile: 'tabProfileBtn',
    settings: 'tabSettingsBtn'
  };
  const TAB_ORDER = ['home', 'profile', 'settings'];
  const NAV_SCREENS = new Set(['home', 'config']);
  const HIDDEN_SCREENS = new Set(['gameScreen', 'metaScreen']);
  const originalShowScreen = window.showScreen;
  const TRANSITION_MS = 215;
  const PRESS_MS = 90;
  const ACTIVATION_MS = 235;
  const EDGE_EXCLUSION = 24;
  const INTENT_DISTANCE = 10;
  const AXIS_RATIO = 1.18;
  const DISTANCE_THRESHOLD = 0.30;
  const VELOCITY_THRESHOLD = 0.52;
  const MIN_FLING_DISTANCE = 34;
  const SWIPE_CAPTURE_SELECTOR = 'canvas,input,textarea,select,[type="range"],[role="slider"],[contenteditable="true"],[data-swipe-lock]';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeTab = 'home';
  let transitionTimer = 0;
  let pendingFrame = 0;
  let switchingTab = false;
  let gesture = null;
  let snapState = null;
  let snapTimer = 0;
  let suppressClickUntil = 0;

  function el(id){ return document.getElementById(id); }
  function tabButton(tab){ return el(TABS[tab]); }
  function panelFor(tab){
    if(tab === 'profile') return el('profileModal');
    if(tab === 'settings') return el('config');
    return el('home');
  }

  function setActive(tab, opts={}){
    if(!TABS[tab]) return;
    const changed = activeTab !== tab;
    activeTab = tab;
    document.body.dataset.primaryTab = tab;
    Object.keys(TABS).forEach(key => {
      const btn = tabButton(key);
      if(!btn) return;
      const active = key === tab;
      btn.classList.toggle('is-active', active);
      if(active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if((changed || opts.force) && opts.animate) animateTab(tab);
  }

  function setNavVisible(visible){
    document.body.classList.toggle('appNavHidden', !visible);
  }

  function closeConfigChoice(){
    const overlay = el('configChoiceOverlay');
    if(!overlay) return;
    overlay.hidden = true;
    overlay.removeAttribute('data-setting');
  }

  function closeModals(){
    document.querySelectorAll('.modal.show').forEach(modal => modal.classList.remove('show'));
    closeConfigChoice();
  }

  function currentSurface(){
    if(activeTab === 'profile') return document.querySelector('#profileModal.show .profileModalCard');
    if(activeTab === 'settings') return el('config');
    return document.querySelector('.screen.active');
  }

  function surfaceFor(tab){
    if(tab === 'profile') return document.querySelector('#profileModal.show .profileModalCard');
    if(tab === 'settings') return el('config');
    return el('home');
  }

  function animateSurface(tab){
    const incoming = surfaceFor(tab);
    if(!incoming) return;
    clearTimeout(transitionTimer);
    incoming.classList.remove('tabEntering');
    void incoming.offsetWidth;
    incoming.classList.add('tabEntering');
    transitionTimer = window.setTimeout(() => incoming.classList.remove('tabEntering'), TRANSITION_MS + 55);
  }

  function markLeaving(){
    const outgoing = currentSurface();
    if(!outgoing) return;
    outgoing.classList.remove('tabLeaving');
    void outgoing.offsetWidth;
    outgoing.classList.add('tabLeaving');
    window.setTimeout(() => outgoing.classList.remove('tabLeaving'), 150);
  }

  function animateTab(tab){
    const btn = tabButton(tab);
    if(!btn) return;
    btn.classList.remove('is-activating');
    void btn.offsetWidth;
    btn.classList.add('is-activating');
    window.setTimeout(() => btn.classList.remove('is-activating'), ACTIVATION_MS + 40);
  }

  function pressTab(tab){
    const btn = tabButton(tab);
    if(!btn) return;
    btn.classList.add('is-pressing');
    window.setTimeout(() => btn.classList.remove('is-pressing'), PRESS_MS);
  }

  function vibrateTab(){
    try{
      if(navigator && typeof navigator.vibrate === 'function') navigator.vibrate(10);
    }catch(e){}
  }

  function soundTab(){
    try{
      if(typeof window.playTone === 'function') window.playTone('tab');
    }catch(e){}
  }

  function feedback(tab){
    pressTab(tab);
    soundTab();
    vibrateTab();
  }

  function syncForScreen(id){
    if(HIDDEN_SCREENS.has(id)){
      setNavVisible(false);
      return;
    }
    if(NAV_SCREENS.has(id)) setNavVisible(true);
    if(switchingTab) return;
    if(id === 'home') setActive('home');
    if(id === 'config') setActive('settings');
  }

  if(typeof originalShowScreen === 'function'){
    window.showScreen = function(id){
      const result = originalShowScreen(id);
      syncForScreen(id);
      return result;
    };
  }

  function performTabAction(tab){
    if(tab === 'home'){
      closeModals();
      if(typeof window.showScreen === 'function') window.showScreen('home');
      return;
    }
    if(tab === 'profile'){
      closeModals();
      if(typeof window.showScreen === 'function') window.showScreen('home');
      if(typeof window.openProfile === 'function') window.openProfile();
      return;
    }
    closeModals();
    if(typeof window.openConfigScreen === 'function') window.openConfigScreen();
    else if(typeof window.showScreen === 'function') window.showScreen('config');
  }

  function switchTab(tab){
    if(activeTab === tab || gesture || snapState || hasBlockingLayer()) return;
    if(pendingFrame) cancelAnimationFrame(pendingFrame);
    markLeaving();
    feedback(tab);
    setActive(tab, {animate:true});
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      switchingTab = true;
      try{
        performTabAction(tab);
      }finally{
        switchingTab = false;
      }
      setNavVisible(true);
      setActive(tab);
      animateSurface(tab);
    });
  }

  function goHome(){ switchTab('home'); }
  function goProfile(){ switchTab('profile'); }
  function goSettings(){ switchTab('settings'); }

  function bindTabs(){
    const home = el('tabHomeBtn');
    const profile = el('tabProfileBtn');
    const settings = el('tabSettingsBtn');
    if(home) home.onclick = goHome;
    if(profile) profile.onclick = goProfile;
    if(settings) settings.onclick = goSettings;
  }

  function bindSettingsAbout(){
    const about = el('settingsAboutBtn');
    if(about) about.onclick = () => {
      if(typeof window.showModal === 'function') window.showModal('aboutModal');
    };
  }

  function hasBlockingLayer(){
    if(document.body.classList.contains('appNavHidden')) return true;
    const choice = el('configChoiceOverlay');
    if(choice && !choice.hidden) return true;
    if(document.querySelector('#profileModal.show .profileLayerOverlay')) return true;
    return Array.from(document.querySelectorAll('.modal.show')).some(modal => {
      return !(modal.id === 'profileModal' && activeTab === 'profile');
    });
  }

  function tabAtOffset(offset){
    const index = TAB_ORDER.indexOf(activeTab);
    return TAB_ORDER[index + offset] || null;
  }

  function setPanelTransform(panel, x){
    if(panel) panel.style.transform = `translate3d(${x}px,0,0)`;
  }

  function preparePreview(tab){
    const panel = panelFor(tab);
    if(!panel) return null;
    if(tab === 'profile' && typeof window.renderProfile === 'function') window.renderProfile();
    panel.classList.add('tabSwipePreview','tabSwipePanel','tabSwipeTarget');
    panel.setAttribute('aria-hidden','true');
    try{ panel.inert = true; }catch(e){}
    return panel;
  }

  function restorePreview(panel){
    if(!panel) return;
    panel.classList.remove('tabSwipePreview','tabSwipePanel','tabSwipeTarget');
    panel.style.transform = '';
    panel.style.transition = '';
    panel.style.willChange = '';
    panel.removeAttribute('aria-hidden');
    try{ panel.inert = false; }catch(e){}
  }

  function restoreOrigin(panel){
    if(!panel) return;
    panel.classList.remove('tabSwipePanel','tabSwipeOrigin');
    panel.style.transform = '';
    panel.style.transition = '';
    panel.style.willChange = '';
  }

  function clearBarPreview(){
    Object.keys(TABS).forEach(tab => {
      const btn = tabButton(tab);
      if(!btn) return;
      btn.classList.remove('is-swipe-origin','is-swipe-neighbor');
      btn.style.removeProperty('--tab-swipe-progress');
    });
  }

  function updateBarPreview(targetTab, progress){
    clearBarPreview();
    const origin = tabButton(activeTab);
    const target = tabButton(targetTab);
    if(origin){
      origin.classList.add('is-swipe-origin');
      origin.style.setProperty('--tab-swipe-progress', progress.toFixed(3));
    }
    if(target){
      target.classList.add('is-swipe-neighbor');
      target.style.setProperty('--tab-swipe-progress', progress.toFixed(3));
    }
  }

  function attachTarget(g, direction){
    if(g.targetPanel) restorePreview(g.targetPanel);
    g.direction = direction;
    g.targetTab = tabAtOffset(direction);
    g.targetPanel = g.targetTab ? preparePreview(g.targetTab) : null;
    if(!g.targetPanel) return false;
    setPanelTransform(g.targetPanel, direction * g.width);
    return true;
  }

  function beginHorizontal(g, dx){
    const direction = dx < 0 ? 1 : -1;
    if(!tabAtOffset(direction)){
      g.axis = 'blocked';
      return false;
    }
    g.originPanel = panelFor(activeTab);
    if(!g.originPanel) return false;
    g.axis = 'horizontal';
    g.width = window.innerWidth;
    g.originPanel.classList.add('tabSwipePanel','tabSwipeOrigin');
    g.originPanel.style.willChange = 'transform';
    if(!attachTarget(g, direction)) return false;
    document.body.classList.add('tabSwipeDragging');
    try{ g.captureEl.setPointerCapture(g.pointerId); }catch(e){}
    suppressClickUntil = Date.now() + 420;
    return true;
  }

  function updateGesture(g, dx){
    const direction = dx < 0 ? 1 : -1;
    if(direction !== g.direction && Math.abs(dx) > INTENT_DISTANCE){
      if(!attachTarget(g, direction)){
        setPanelTransform(g.originPanel, 0);
        clearBarPreview();
        g.dx = 0;
        return;
      }
    }
    const signed = g.direction === 1 ? Math.min(0, dx) : Math.max(0, dx);
    const limited = Math.max(-g.width, Math.min(g.width, signed));
    g.dx = limited;
    const progress = Math.min(1, Math.abs(limited) / g.width);
    setPanelTransform(g.originPanel, limited);
    setPanelTransform(g.targetPanel, limited + g.direction * g.width);
    updateBarPreview(g.targetTab, progress);
  }

  function gestureVelocity(g){
    const samples = g.samples;
    if(samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    let first = samples[0];
    for(let i=samples.length - 2;i>=0;i--){
      if(last.t - samples[i].t >= 70){ first = samples[i]; break; }
      first = samples[i];
    }
    const dt = Math.max(1, last.t - first.t);
    return (last.x - first.x) / dt;
  }

  function cleanupSwipe(g){
    clearBarPreview();
    restoreOrigin(g && g.originPanel);
    restorePreview(g && g.targetPanel);
    document.body.classList.remove('tabSwipeDragging','tabSwipeSnapping');
  }

  function commitSwipe(tab){
    switchingTab = true;
    try{
      performTabAction(tab);
    }finally{
      switchingTab = false;
    }
    setNavVisible(true);
    setActive(tab, {animate:true});
    feedback(tab);
  }

  function finishSnap(complete){
    const state = snapState;
    if(!state) return;
    clearTimeout(snapTimer);
    snapTimer = 0;
    snapState = null;
    cleanupSwipe(state.gesture);
    if(complete) commitSwipe(state.gesture.targetTab);
  }

  function snapGesture(g, complete){
    if(!g || !g.originPanel || !g.targetPanel){ cleanupSwipe(g); return; }
    const progress = Math.min(1, Math.abs(g.dx) / g.width);
    const distanceFactor = complete ? 1 - progress : progress;
    const duration = reducedMotion.matches ? 70 : Math.round(160 + 70 * distanceFactor);
    const easing = 'cubic-bezier(.22,.78,.18,1)';
    g.originPanel.style.transition = `transform ${duration}ms ${easing}`;
    g.targetPanel.style.transition = `transform ${duration}ms ${easing}`;
    document.body.classList.remove('tabSwipeDragging');
    document.body.classList.add('tabSwipeSnapping');
    snapState = {gesture:g, complete};
    if(complete){
      setPanelTransform(g.originPanel, -g.direction * g.width);
      setPanelTransform(g.targetPanel, 0);
      updateBarPreview(g.targetTab, 1);
    }else{
      setPanelTransform(g.originPanel, 0);
      setPanelTransform(g.targetPanel, g.direction * g.width);
      updateBarPreview(g.targetTab, 0);
    }
    snapTimer = window.setTimeout(() => finishSnap(complete), duration + 20);
  }

  function cancelGesture(immediate=false){
    if(gesture){
      const g = gesture;
      gesture = null;
      if(g.axis === 'horizontal' && !immediate) snapGesture(g, false);
      else cleanupSwipe(g);
    }
    if(snapState && immediate) finishSnap(false);
  }

  function onPointerDown(ev){
    if(ev.pointerType === 'mouse' && ev.button !== 0) return;
    if(gesture || snapState){
      if(gesture && ev.pointerId !== gesture.pointerId) cancelGesture(true);
      return;
    }
    if(hasBlockingLayer()) return;
    if(ev.clientX <= EDGE_EXCLUSION || ev.clientX >= window.innerWidth - EDGE_EXCLUSION) return;
    if(ev.target && ev.target.closest && ev.target.closest('.appTabBar')) return;
    if(ev.target && ev.target.closest && ev.target.closest(SWIPE_CAPTURE_SELECTOR)) return;
    gesture = {
      pointerId:ev.pointerId,
      captureEl:ev.target,
      startX:ev.clientX,
      startY:ev.clientY,
      lastX:ev.clientX,
      lastY:ev.clientY,
      dx:0,
      axis:'pending',
      samples:[{x:ev.clientX,t:ev.timeStamp}]
    };
  }

  function onPointerMove(ev){
    const g = gesture;
    if(!g || ev.pointerId !== g.pointerId) return;
    if(hasBlockingLayer()){
      cancelGesture(true);
      return;
    }
    const dx = ev.clientX - g.startX;
    const dy = ev.clientY - g.startY;
    g.lastX = ev.clientX;
    g.lastY = ev.clientY;
    g.samples.push({x:ev.clientX,t:ev.timeStamp});
    while(g.samples.length > 2 && ev.timeStamp - g.samples[0].t > 130) g.samples.shift();
    if(g.axis === 'pending'){
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if(ax < INTENT_DISTANCE && ay < INTENT_DISTANCE) return;
      if(ay > ax * AXIS_RATIO){ gesture = null; return; }
      if(ax <= ay * AXIS_RATIO) return;
      if(!beginHorizontal(g, dx)){ gesture = null; return; }
    }
    if(g.axis !== 'horizontal') return;
    ev.preventDefault();
    updateGesture(g, dx);
  }

  function onPointerEnd(ev){
    const g = gesture;
    if(!g || ev.pointerId !== g.pointerId) return;
    gesture = null;
    if(g.axis !== 'horizontal') return;
    ev.preventDefault();
    suppressClickUntil = Date.now() + 360;
    const progress = Math.min(1, Math.abs(g.dx) / g.width);
    const velocity = gestureVelocity(g);
    const alignedVelocity = Math.sign(velocity) === Math.sign(g.dx) ? Math.abs(velocity) : 0;
    const complete = progress >= DISTANCE_THRESHOLD || (Math.abs(g.dx) >= MIN_FLING_DISTANCE && alignedVelocity >= VELOCITY_THRESHOLD);
    snapGesture(g, complete);
  }

  function onPointerCancel(ev){
    if(!gesture || ev.pointerId !== gesture.pointerId) return;
    const g = gesture;
    gesture = null;
    if(g.axis === 'horizontal') snapGesture(g, false);
    else cleanupSwipe(g);
  }

  function bindSwipe(){
    document.addEventListener('pointerdown', onPointerDown, {passive:true});
    document.addEventListener('pointermove', onPointerMove, {passive:false});
    document.addEventListener('pointerup', onPointerEnd, {passive:false});
    document.addEventListener('pointercancel', onPointerCancel, {passive:true});
    document.addEventListener('click', ev => {
      if(Date.now() < suppressClickUntil){
        ev.preventDefault();
        ev.stopPropagation();
      }
    }, true);
    window.addEventListener('resize', () => cancelGesture(true), {passive:true});
  }

  function init(){
    bindTabs();
    bindSettingsAbout();
    bindSwipe();
    setNavVisible(true);
    setActive('home', {force:true});
  }

  init();
  window.TRIANOTA_NAVIGATION = {goHome,goProfile,goSettings,setActive,get activeTab(){return activeTab;}};
})();
