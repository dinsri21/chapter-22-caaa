'use strict';
const qs  = (sel, root=document) => root.querySelector(sel);
const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];
const rand = (min,max) => Math.random()*(max-min)+min;
const clamp = (v,min,max) => Math.min(Math.max(v,min),max);

const AudioController = (() => {
  const toggle = qs('#audioToggle');
  const icon = toggle?.querySelector('span');
  const music = new Audio('https://esigsoksitnqxadcnbss.supabase.co/storage/v1/object/public/assets/background-music.wav');
  const effects = {
    flip: 'assets/card-flip.wav',
    memory: 'assets/memory-box.wav',
    celebration: 'assets/celebration.wav'
  };
  let started = false, muted = false, fadeTimer = null;

  music.loop = true;
  music.preload = 'auto';
  music.volume = 0;

  function updateToggle() {
    if (!toggle || !icon) return;
    icon.textContent = muted ? '🔇' : '🔊';
    toggle.setAttribute('aria-label', muted ? 'Nyalakan suara' : 'Matikan suara');
    toggle.setAttribute('aria-pressed', String(muted));
  }

  function start() {
    if (started) return;
    started = true;
    music.play().then(() => {
      const startedAt = performance.now();
      fadeTimer = setInterval(() => {
        const progress = Math.min((performance.now() - startedAt) / 2000, 1);
        music.volume = muted ? 0 : .35 * progress;
        if (progress === 1) { clearInterval(fadeTimer); fadeTimer = null; }
      }, 50);
    }).catch(() => { started = false; });
  }

  function play(name) {
    if (muted || !effects[name]) return;
    const effect = new Audio(effects[name]);
    effect.volume = .7;
    effect.play().catch(() => {});
  }

  toggle?.addEventListener('click', event => {
    event.stopPropagation();
    start();
    muted = !muted;
    music.muted = muted;
    updateToggle();
  });
  ['pointerdown', 'keydown', 'touchstart'].forEach(name => {
    document.addEventListener(name, start, { once: true, passive: true });
  });
  updateToggle();
  return { play };
})();

/* ============================================================
   SCROLL LOCK — aktif sampai charge 100%
   ============================================================ */
let scrollUnlocked = false;

function lockScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}
function unlockScroll() {
  scrollUnlocked = true;
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

// Blokir wheel & keyboard scroll selama terkunci
function blockScroll(e) {
  if (!scrollUnlocked) e.preventDefault();
}
addEventListener('wheel',     blockScroll, { passive: false });
addEventListener('keydown', e => {
  if (!scrollUnlocked && ['ArrowDown','ArrowUp','PageDown','PageUp','Space','End','Home'].includes(e.key)) {
    e.preventDefault();
  }
}, { passive: false });
addEventListener('touchmove', blockScroll, { passive: false });

lockScroll();

/* ============================================================
   SCROLL PROGRESS
   ============================================================ */
const scrollFill = qs('#scrollFill');
function updateScrollProgress() {
  const pct = document.documentElement.scrollHeight - innerHeight > 0
    ? (scrollY / (document.documentElement.scrollHeight - innerHeight)) * 100 : 0;
  scrollFill.style.width = pct + '%';
}
addEventListener('scroll', updateScrollProgress, { passive: true });

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in-view');
    revealObs.unobserve(e.target);
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
requestAnimationFrame(() => qsa('.reveal-up').forEach(el => revealObs.observe(el)));

/* ============================================================
   IMAGE FALLBACKS
   ============================================================ */
qsa('img.photo-img').forEach(img => {
  img.addEventListener('error', function() {
    this.src = '';
    const ph = document.createElement('span');
    ph.textContent = '📷';
    ph.style.cssText = 'font-size:4rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
    this.parentElement.style.display = 'flex';
    this.parentElement.style.alignItems = 'center';
    this.parentElement.style.justifyContent = 'center';
    this.replaceWith(ph);
  });
});

/* ============================================================
   AMBIENT PARTICLES
   ============================================================ */
(function spawnParticles() {
  const emojis = ['🌱','🌿','🍃','🌾','🍂','✨','🌸'];
  const count  = matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 14;
  const particles = qs('#particles');
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'particle';
    el.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    el.setAttribute('aria-hidden','true');
    el.style.cssText = `left:${rand(2,96)}%;bottom:-10%;font-size:${rand(.85,1.4)}rem;animation-duration:${rand(14,28)}s;animation-delay:${rand(0,20)}s;`;
    particles.appendChild(el);
  }
})();

/* ============================================================
   1. HERO — TAP TO CHARGE
   ============================================================ */
(function heroCharge() {
  const chargeArea   = qs('#chargeArea');
  const chargeCircle = qs('#chargeCircle');
  const chargePct    = qs('#chargePct');
  const chargeEmoji  = qs('#chargeEmoji');
  const chargeHint   = qs('#chargeHint');
  const chargeRing   = qs('#chargeRing');
  const heroCheck    = qs('#heroCheck');

  // Add SVG gradient def
  const svgEl = qs('.charge-svg');
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML = `<linearGradient id="chargeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" style="stop-color:#8B6E52"/>
    <stop offset="50%" style="stop-color:#C8A45A"/>
    <stop offset="100%" style="stop-color:#9AA68B"/>
  </linearGradient>`;
  svgEl.prepend(defs);

  let progress = 0;
  let done = false;
  const CIRCUMFERENCE = 314;

  const STAGES = [
    { threshold: 0,  emoji: '🌱', hint: 'tap!' },
    { threshold: 20, emoji: '🌿', hint: 'terus!' },
    { threshold: 50, emoji: '🌳', hint: 'hampir!' },
    { threshold: 80, emoji: '🎓', hint: 'siap!' },
    { threshold: 100, emoji: '🎉', hint: 'yeay!' },
  ];

  function updateStage(p) {
    const stage = [...STAGES].reverse().find(s => p >= s.threshold);
    chargeEmoji.textContent = stage.emoji;
    chargeHint.textContent  = stage.hint;
  }

  function tap() {
    if (done) return;
    const boost = rand(6, 14);
    progress = Math.min(progress + boost, 100);

    // Update circle
    const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
    chargeCircle.style.strokeDashoffset = offset;
    chargePct.textContent = Math.floor(progress) + '%';
    updateStage(progress);

    // Pulse ring
    chargeRing.classList.add('pulse');
    setTimeout(() => chargeRing.classList.remove('pulse'), 200);

    // Mini burst on tap
    miniParticleBurst(chargeRing);

    if (progress >= 100 && !done) {
      done = true;
      chargeHint.textContent = '✓';
      setTimeout(() => {
        heroCheck.classList.add('visible');
        chargeArea.style.pointerEvents = 'none';
        chargeArea.style.opacity = '.5';
        chargeArea.style.transition = 'opacity .5s ease';
        // Unlock scroll lalu auto-scroll ke section berikutnya
        setTimeout(() => {
          unlockScroll();
          const next = document.querySelector('#chapter21');
          if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 900);
      }, 500);
    }
  }

  chargeArea.addEventListener('click', tap);
  chargeArea.addEventListener('touchstart', e => { e.preventDefault(); tap(); }, { passive: false });
  chargeArea.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') tap(); });

  function miniParticleBurst(parent) {
    const emojis = ['✨','🌿','🌱','🍃'];
    for (let i = 0; i < 5; i++) {
      const p = document.createElement('span');
      p.textContent = emojis[Math.floor(Math.random()*emojis.length)];
      p.style.cssText = `
        position:absolute; font-size:${rand(.7,1.1)}rem; pointer-events:none;
        top:50%; left:50%; z-index:10;
        animation: miniPop .5s ease forwards;
        --tx:${rand(-60,60)}px; --ty:${rand(-80,-20)}px;
        animation-delay:${rand(0,.1)}s;
      `;
      parent.style.position = 'relative';
      parent.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  // Inject mini pop keyframe
  const style = document.createElement('style');
  style.textContent = `@keyframes miniPop {
    0%  { opacity:1; transform:translate(-50%,-50%) scale(.5); }
    80% { opacity:.9; }
    100%{ opacity:0; transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.1); }
  }`;
  document.head.appendChild(style);
})();

/* ============================================================
   2. FLIP CARD
   ============================================================ */
const flipCard = qs('#flipCard');
if (flipCard) {
  function toggleFlip() {
    flipCard.classList.toggle('flipped');
    AudioController.play('flip');
  }
  flipCard.addEventListener('click', toggleFlip);
  flipCard.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleFlip(); });
}

/* ============================================================
   4. MEMORY BOX — polaroid STACK (tap/swipe to cycle)
   ============================================================ */
(function memoryBox() {
  const openBtn   = qs('#mbOpenBtn');
  const trigger   = qs('#mbTrigger');
  const scatter   = qs('#mbScatter');
  const closing   = qs('#mbClosing');
  const counter   = qs('#mbStackCounter');
  if (!openBtn || !scatter) return;

  const cards = qsa('.polaroid-card', scatter);
  const images = qsa('.polaroid-img', scatter);
  const total = cards.length;
  let topIdx = total - 1; // top of stack = last card (rendered on top)
  let opened = false;
  let opening = false;
  let swiping = false;

  // Start loading before the hidden memory box is opened. Native lazy-loading
  // otherwise waits because the images live inside a hidden container.
  const preloadPhotos = (() => {
    let promise;
    return () => {
      if (promise) return promise;
      promise = Promise.all(images.map(img => new Promise(resolve => {
        if (img.complete && img.naturalWidth) {
          img.decode?.().catch(() => {}).finally(resolve);
          return;
        }
        const preload = new Image();
        preload.onload = () => {
          img.src = preload.src;
          img.decode?.().catch(() => {}).finally(resolve);
        };
        preload.onerror = resolve;
        preload.src = img.currentSrc || img.src;
      })));
      return promise;
    };
  })();

  const memorySection = qs('#memoryBox');
  if (memorySection && 'IntersectionObserver' in window) {
    const preloadObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      preloadPhotos();
      preloadObserver.disconnect();
    }, { rootMargin: '600px 0px' });
    preloadObserver.observe(memorySection);
  } else {
    preloadPhotos();
  }

  // Image fallback
  images.forEach(img => {
    img.addEventListener('error', function () {
      const wrap = this.closest('.polaroid-img-wrap');
      if (!wrap) return;
      this.style.display = 'none';
      const ph = document.createElement('span');
      ph.className = 'photo-placeholder';
      ph.setAttribute('aria-hidden', 'true');
      ph.textContent = '📷';
      wrap.appendChild(ph);
    });
  });

  // Stack visual depth: cards below top get offset/scale to look stacked
  function applyStackDepth() {
    cards.forEach((card, i) => {
      const relPos = i - topIdx; // 0 = top, -1 = one below, etc.
      if (relPos > 0 || i > topIdx) {
        // Already swiped away — keep hidden
        card.style.zIndex = 0;
        return;
      }
      const depth = topIdx - i; // 0 = top card, 1 = one under, 2 = two under...
      card.style.zIndex = total - depth;
      if (depth === 0) {
        card.classList.add('is-top');
        // Reset transform to base rotation only
        card.style.transform = `rotate(var(--rot, 0deg)) translateY(0) scale(1)`;
        card.style.opacity = '1';
      } else if (depth <= 3) {
        card.classList.remove('is-top');
        const offsetY = depth * 5;
        const scaleDown = 1 - depth * 0.025;
        card.style.transform = `rotate(var(--rot, 0deg)) translateY(${offsetY}px) scale(${scaleDown})`;
        card.style.opacity = depth === 1 ? '0.92' : depth === 2 ? '0.78' : '0.6';
      } else {
        card.classList.remove('is-top');
        card.style.opacity = '0';
        card.style.pointerEvents = 'none';
      }
    });
    // Counter
    if (counter) {
      const remaining = topIdx + 1;
      counter.textContent = remaining > 0
        ? `${remaining} foto lagi · tap untuk lanjut ✨`
        : '';
    }
  }

  async function openBox() {
    if (opened || opening) return;
    opening = true;
    openBtn.disabled = true;
    openBtn.classList.add('is-loading');
    const buttonText = qs('.mb-btn-text', openBtn);
    const originalText = buttonText?.textContent;
    if (buttonText) buttonText.textContent = 'Preparing memories...';

    await preloadPhotos();

    openBtn.classList.remove('is-loading');
    openBtn.disabled = false;
    if (buttonText && originalText) buttonText.textContent = originalText;
    AudioController.play('memory');
    trigger.style.transition = 'opacity .35s ease';
    trigger.style.opacity = '0';
    setTimeout(() => { trigger.style.display = 'none'; }, 350);

    scatter.removeAttribute('hidden');
    if (counter) counter.removeAttribute('hidden');

    // Drop-in animation staggered from bottom card to top
    cards.forEach((card, i) => {
      card.classList.add('dropping');
      // After animation, settle into stack positions
      card.addEventListener('animationend', () => {
        card.classList.remove('dropping');
        card.classList.add('visible');
        applyStackDepth();
      }, { once: true });
    });

    opened = true;
    opening = false;
    applyStackDepth();
  }

  function dismissTop(direction = 'left') {
    if (topIdx < 0 || swiping) return;
    swiping = true;
    const topCard = cards[topIdx];
    topCard.classList.remove('is-top');
    topCard.classList.add(direction === 'left' ? 'swipe-left' : 'swipe-right');
    topCard.style.pointerEvents = 'none';

    topCard.addEventListener('animationend', () => {
      topCard.style.opacity = '0';
      topIdx--;
      swiping = false;
      applyStackDepth();

      if (topIdx < 0) {
        // All photos seen — show closing message
        setTimeout(() => {
          closing.removeAttribute('hidden');
          requestAnimationFrame(() => requestAnimationFrame(() => closing.classList.add('visible')));
          if (counter) { counter.textContent = 'Semua kenangan sudah terbuka 🤍'; }
        }, 300);
      }
    }, { once: true });
  }

  // Click / tap top card to dismiss
  scatter.addEventListener('click', (e) => {
    if (!opened) return;
    dismissTop('left');
  });

  // Touch swipe support
  let touchStartX = 0, touchStartY = 0;
  scatter.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  scatter.addEventListener('touchend', e => {
    if (!opened) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      dismissTop(dx < 0 ? 'left' : 'right');
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // simple tap
      dismissTop('left');
    }
  }, { passive: true });

  openBtn.addEventListener('click', openBox);
  openBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBox(); }
  });
})();



/* ============================================================
   5. LETTER — typewriter + paragraph reveal
   ============================================================ */
(function letterReveal() {
  const salutation = qs('.letter-salutation');
  const letterBtn = qs('#mbLetterBtn');
  const paras = qsa('.hidden-para');
  if (!salutation) return;

  let letterStarted = false;
  let letterUnlocked = false;

  function typeWriter(el, text, cb) {
    let i = 0;
    el.textContent = '';
    el.classList.remove('done');
    const iv = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) {
        clearInterval(iv);
        el.classList.add('done');
        if (cb) cb();
      }
    }, 40);
  }

  function revealParas() {
    paras.forEach((p, i) => {
      setTimeout(() => {
        p.classList.add('revealed');
      }, i * 350 + 200);
    });
  }

  const letterObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && letterUnlocked && !letterStarted) {
      letterStarted = true;
      const text = salutation.dataset.typed || 'Hei, kamu yang luar biasa —';
      setTimeout(() => {
        typeWriter(salutation, text, () => {
          setTimeout(revealParas, 300);
        });
      }, 400);
      letterObs.unobserve(salutation);
    }
  }, { threshold: 0.3 });
  letterObs.observe(salutation);

  if (letterBtn) {
    letterBtn.addEventListener('click', () => {
      letterUnlocked = true;
    });
  }
})();

/* ============================================================
   6. FINAL — star burst + confetti
   ============================================================ */
(function finalSection() {
  const btnStart    = qs('#btnStart');
  const starBurst   = qs('#starBurst');
  const celebOverlay = qs('#celebOverlay');
  const btnClose    = qs('#btnClose');
  if (!btnStart) return;

  // Keep the fixed dialog outside the section's stacking context so it
  // always covers later elements such as the footer.
  document.body.appendChild(celebOverlay);

  const STARS = ['⭐','🌟','✨','🎉','🎊','🌿','🌸','💛','🍃'];

  function burstStars() {
    if (!starBurst) return;
    starBurst.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.className = 'sb-particle';
      p.textContent = STARS[Math.floor(Math.random()*STARS.length)];
      const angle = (i / 16) * Math.PI * 2;
      const dist  = rand(60, 130);
      p.style.setProperty('--tx', Math.cos(angle)*dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle)*dist + 'px');
      p.style.animationDelay = rand(0,.15)+'s';
      starBurst.appendChild(p);
    }
  }

  btnStart.addEventListener('click', () => {
    burstStars();
    Confetti.fire();
    AudioController.play('celebration');
    setTimeout(() => {
      celebOverlay.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      btnClose.focus();
    }, 500);
  });

  function closeCelebration() {
    celebOverlay.setAttribute('hidden','');
    document.body.style.overflow = '';
    btnStart.focus();
  }
  btnClose.addEventListener('click', closeCelebration);
  celebOverlay.addEventListener('click', e => { if (e.target === celebOverlay) closeCelebration(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !celebOverlay.hasAttribute('hidden')) closeCelebration(); });
})();

/* ============================================================
   CONFETTI ENGINE
   ============================================================ */
const Confetti = (() => {
  const canvas = qs('#confettiCanvas');
  const ctx    = canvas.getContext('2d');
  let pieces = [], animId = null;
  const COLORS = ['#C4A882','#9AA68B','#8B6E52','#C8A45A','#E4D5C1','#6E7A5F','#EDE4D5','#D4B896'];

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener('resize', resize, { passive: true });

  function spawn(n=120) {
    resize();
    for (let i=0;i<n;i++) {
      const a=rand(-Math.PI,Math.PI), sp=rand(3,9);
      pieces.push({
        x:rand(0,canvas.width), y:rand(-canvas.height*.4,-10),
        vx:Math.cos(a)*sp*.5, vy:rand(2,6),
        rot:rand(0,Math.PI*2), rspd:rand(-.08,.08),
        w:rand(7,14), h:rand(4,9), alpha:1,
        color:COLORS[Math.floor(Math.random()*COLORS.length)],
        shape:Math.random()>.5?'rect':'circle',
      });
    }
  }
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      if (p.shape==='circle') { ctx.beginPath(); ctx.arc(0,0,p.w/2,0,Math.PI*2); ctx.fill(); }
      else ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
  }
  function update() {
    pieces.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=.06; p.rot+=p.rspd;
      if (p.y > canvas.height*.8) p.alpha-=.025; });
    pieces = pieces.filter(p=>p.alpha>0);
  }
  function loop() {
    draw(); update();
    if (pieces.length>0) animId=requestAnimationFrame(loop);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); animId=null; }
  }
  function fire() {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    if (animId) cancelAnimationFrame(animId);
    pieces=[];
    spawn(150);
    setTimeout(()=>spawn(80),600);
    loop();
  }
  return { fire };
})();

/* PAGE LOAD */
addEventListener('load', () => {
  document.body.style.opacity='1';
  updateScrollProgress();
});
