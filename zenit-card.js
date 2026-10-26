/**
 * ✧ Z Ξ N I T ✧ SINGULARITY ENGINE - V18.17.0 (INTERNATIONAL HACS EDITION)
 * STATUS: 2026.5 CORE COMPATIBLE
 * ARCHITECTURE: Pure Vanilla JS & CSS | Zero Dependencies
 * FEATURES: Script/Click Caching, Scroll-Guard, Deep Entity Tracking, Live Style Preview, Haptics & TTS.
 */

(function() {
    var TAG = "zenit-card";
    var VERSION = "18.17.0";

    class ZenitSingularity extends HTMLElement {
        
        static getStubConfig() {
            return {
                type: "custom:zenit-card",
                entity: "",
                overrides: { neon_color: "#E64A9C" },
                template: "<div style='text-align:center; padding: 10px;'>Zenit Singularity<br>[[state]]</div>"
            };
        }

        constructor() { 
            super(); 
            if (!this.shadowRoot) {
                this.attachShadow({ mode: 'open' }); 
            }
            this._pressTimer = null; 
            this._audioUnlocked = false; 
            this._prevHtml = ""; 
            this._renderScheduled = false; 
            this._nestedCards = [];
            this._forceRenderSlots = false;
            this._isTouch = false;
            this._trackedEntities = new Set();
            
            // --- PERFORMANCE CACHES (Prevents memory leaks & UI freezes) ---
            this._scriptCache = {}; 
            this._clickCache = {};

            // --- SCROLL-GUARD STATES (Prevents accidental clicks while swiping) ---
            this._startX = 0;
            this._startY = 0;
            this._isScrolling = false;
        }
        
        setConfig(config) {
            if (!config) throw new Error("Zenit Error: Invalid configuration.");
            this._config = {
                entity: "",
                template: "",
                overrides: {},
                ...config
            };
            
            // 1. Selective Entity Tracking
            this._trackedEntities.clear();
            if (this._config.entity) this._trackedEntities.add(this._config.entity);
            if (Array.isArray(this._config.entities)) {
                this._config.entities.forEach(e => this._trackedEntities.add(e));
            }
            
            if (this._config.template && typeof this._config.template === 'string') {
                // Track [[domain.entity]] patterns
                var regex1 = /\[\[([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)(?::[a-zA-Z0-9_]+)?\]\]/g;
                var match1;
                while ((match1 = regex1.exec(this._config.template)) !== null) {
                    this._trackedEntities.add(match1[1]);
                }
                // Track states['domain.entity'] patterns inside [[[ ... ]]] inline scripts
                var regex2 = /states\[\s*['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)['"]\s*\]/g;
                var match2;
                while ((match2 = regex2.exec(this._config.template)) !== null) {
                    this._trackedEntities.add(match2[1]);
                }
            }

            // 2. Nested Cards Initialization (Slot System with Race-Condition Fix)
            if (this._config.cards && Array.isArray(this._config.cards)) {
                var self = this;
                this._nestedCards = [];
                if (window.loadCardHelpers) {
                    window.loadCardHelpers().then(function(helpers) {
                        for (var i = 0; i < self._config.cards.length; i++) {
                            var el = helpers.createCardElement(self._config.cards[i]);
                            if (self._hass) el.hass = self._hass; 
                            self._nestedCards.push(el);
                        }
                        self._forceRenderSlots = true;
                        if (self._hass) self._render();
                    });
                } else {
                    for (var i = 0; i < this._config.cards.length; i++) {
                        var conf = this._config.cards[i];
                        var tag = conf.type.indexOf("custom:") === 0 ? conf.type.substring(7) : "hui-" + conf.type + "-card";
                        var el = document.createElement(tag);
                        try { el.setConfig(conf); } catch(e) { console.error("Zenit Nesting Error:", e); }
                        if (this._hass) el.hass = this._hass; 
                        this._nestedCards.push(el);
                    }
                    this._forceRenderSlots = true;
                }
            }

            // 3. Dynamic Style Injection (Border, Glow & Background Control)
            var ov = this._config.overrides || {};
            var isBorderless = (ov.border === false || ov.neon_color === "none" || ov.neon_color === "transparent");
            var neonColor = isBorderless ? "transparent" : (ov.neon_color || "#E64A9C");
            var neonGlow = (isBorderless || ov.neon_glow === "none") ? "none" : (ov.neon_glow || "0 0 15px rgba(230, 74, 156, 0.5)");
            var cardBg = ov.background || "rgba(20, 20, 25, 0.8)";
            var cardPadding = ov.padding !== undefined ? ov.padding : "16px";
            var fontFam = ov.font_family || "'Orbitron', monospace";

            var styles = `
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
                :host { 
                    display: block; 
                    width: 100%; 
                    --z-pink: ${neonColor}; 
                    --z-glow: ${neonGlow}; 
                    --z-font: ${fontFam}; 
                    --ha-card-border-width: 0px; 
                    --ha-card-border-color: transparent; 
                }
                ha-card#zenit-core { 
                    box-sizing: border-box; 
                    padding: ${cardPadding}; 
                    background: ${cardBg}; 
                    border: ${isBorderless ? 'none' : '1px solid var(--z-pink)'}; 
                    border-radius: 12px; 
                    color: white; 
                    position: relative; 
                    overflow: hidden; 
                    font-family: var(--z-font); 
                    box-shadow: var(--z-glow); 
                    user-select: none; 
                    -webkit-user-select: none; 
                }
                .warning-box { border: 1px solid #ffaa00 !important; color: #ffaa00; text-align: center; }
                .glitch-active { animation: glitch 0.3s infinite; border: 1px solid #ff0000 !important; }
                @keyframes glitch { 0%, 100% { transform: translate(0); } 20% { transform: translate(-2px, 2px); } 40% { transform: translate(-2px, -2px); } 60% { transform: translate(2px, 2px); } 80% { transform: translate(2px, -2px); } }
                ${this._config.style || ""}
            `;

            if (!this._container) {
                this.shadowRoot.innerHTML = `<style id="zenit-styles">${styles}</style><ha-card id="zenit-core"></ha-card>`;
                this._container = this.shadowRoot.getElementById("zenit-core");
                this._styleEl = this.shadowRoot.getElementById("zenit-styles");
                this._setupGestures();
            } else if (this._styleEl) {
                this._styleEl.textContent = styles;
            }

            if (this._hass) {
                this._prevHtml = ""; 
                this._render();
            }
        }

        set hass(hass) {
            const oldHass = this._hass;
            this._hass = hass;
            if (!this._config || !this._container) return;
            
            for (var i = 0; i < this._nestedCards.length; i++) {
                if (this._nestedCards[i]) this._nestedCards[i].hass = hass;
            }
            
            if (oldHass && !this._forceRenderSlots && this._trackedEntities.size > 0) {
                let needsUpdate = false;
                for (let entityId of this._trackedEntities) {
                    if (!oldHass.states[entityId] || !hass.states[entityId] || oldHass.states[entityId] !== hass.states[entityId]) {
                        needsUpdate = true;
                        break;
                    }
                }
                if (!needsUpdate) return;
            }

            if (!this._renderScheduled) {
                this._renderScheduled = true;
                var self = this;
                window.requestAnimationFrame(function() {
                    self._render();
                    self._renderScheduled = false;
                });
            }
        }

        _render() {
            try {
                this._container.className = ""; 
                if (this._config.entity && this._hass && !this._hass.states[this._config.entity]) {
                    this._container.className = "warning-box"; 
                    this._container.innerHTML = "⚠️ ENTITY ERROR: " + this._config.entity; 
                    return;
                }

                var html = this._config.template || "<div style='text-align:center; padding: 10px;'>Zenit Singularity</div>";
                var stateObj = null;

                if (this._config.entity && this._hass) {
                    stateObj = this._hass.states[this._config.entity];
                    if (stateObj.state === 'unavailable' || stateObj.state === 'unknown') this._container.classList.add("glitch-active");
                    html = html.replace(/\[\[state\]\]/g, stateObj.state);
                    html = html.replace(/\[\[icon\]\]/g, (stateObj.attributes && stateObj.attributes.icon) ? stateObj.attributes.icon : 'mdi:cube-outline');
                    html = html.replace(/\[\[val\]\]/g, parseFloat(stateObj.state) || 0);
                    html = html.replace(/\[\[attr:(.+?)\]\]/g, function(m, attr) { return (stateObj.attributes && stateObj.attributes[attr] !== undefined) ? stateObj.attributes[attr] : ""; });
                }

                var self = this;
                if (this._hass) {
                    html = html.replace(/\[\[([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)(?::([a-zA-Z0-9_]+))?\]\]/g, function(match, id, attr) {
                        var extStateObj = self._hass.states[id];
                        if (!extStateObj) return 'N/A'; 
                        if (!attr || attr === 'state') return extStateObj.state;
                        return extStateObj.attributes[attr] !== undefined ? extStateObj.attributes[attr] : '';
                    });

                    html = html.replace(/\[\[\[([\s\S]+?)\]\]\]/g, function(match, script) {
                        try { 
                            if (!self._scriptCache[script]) {
                                self._scriptCache[script] = new Function('states', 'entity', 'hass', 'Math', script);
                            }
                            return self._scriptCache[script](self._hass.states, stateObj, self._hass, Math); 
                        } catch(e) { return "<span style='color:red'>ERR</span>"; }
                    });
                }

                if (this._prevHtml !== html) { 
                    this._container.innerHTML = html; 
                    this._prevHtml = html; 
                    this._forceRenderSlots = true; 
                }

                if (this._forceRenderSlots && this._nestedCards.length > 0) {
                    this._forceRenderSlots = false;
                    for (var i = 0; i < this._nestedCards.length; i++) {
                        var slot = this._container.querySelector("#slot-" + i);
                        if (slot) {
                            slot.innerHTML = ""; 
                            slot.appendChild(this._nestedCards[i]);
                        }
                    }
                }
            } catch(e) { console.error("Zenit Render Error: ", e); }
        }

        _setupGestures() {
            var self = this;
            
            function handleStart(e) {
                if (!self._audioUnlocked) self._unlockAudio();
                self._isScrolling = false;

                if (e.touches && e.touches.length > 0) {
                    self._startX = e.touches[0].clientX;
                    self._startY = e.touches[0].clientY;
                } else {
                    self._startX = e.clientX || 0;
                    self._startY = e.clientY || 0;
                }

                var path = e.composedPath ? e.composedPath() : (e.path || []);
                self._pressTimer = setTimeout(function() {
                    if (self._isScrolling) return;
                    if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
                    for (var i = 0; i < path.length; i++) {
                        if (path[i].getAttribute && path[i].getAttribute('data-more-info')) {
                            var entityId = path[i].getAttribute('data-more-info');
                            self.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: entityId }, bubbles: true, composed: true }));
                            break;
                        }
                    }
                    self._pressTimer = null; 
                }, 800);
            }

            function handleMove(e) {
                if (!self._pressTimer) return;
                var curX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : (e.clientX || 0);
                var curY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : (e.clientY || 0);
                if (Math.abs(curX - self._startX) > 10 || Math.abs(curY - self._startY) > 10) {
                    self._isScrolling = true;
                    clearTimeout(self._pressTimer);
                    self._pressTimer = null;
                }
            }
            
            function handleEnd(e) {
                if (self._isScrolling) {
                    self._isScrolling = false;
                    return;
                }
                if (self._pressTimer) { 
                    clearTimeout(self._pressTimer);
                    self._pressTimer = null;
                    if (window.navigator.vibrate) window.navigator.vibrate(15);
                    var path = e.composedPath ? e.composedPath() : (e.path || []);
                    
                    for (var i = 0; i < path.length; i++) {
                        const targetElement = path[i];
                        
                        if (targetElement.getAttribute) {
                            var speakAttr = targetElement.getAttribute('data-speak');
                            var clickAttr = targetElement.getAttribute('data-click');
                            
                            if (speakAttr && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                                setTimeout(function() {
                                    var utterance = new SpeechSynthesisUtterance(speakAttr);
                                    utterance.lang = self._config.lang || (self._hass && self._hass.language) || 'en-US';
                                    window.speechSynthesis.speak(utterance);
                                }, 50);
                            }
                            
                            if (clickAttr && self._hass) {
                                const originalTransition = targetElement.style.transition;
                                targetElement.style.transition = "all 0.1s";
                                targetElement.style.transform = "scale(0.92)";
                                targetElement.style.filter = "brightness(1.5)";
                                
                                setTimeout(() => {
                                    targetElement.style.transform = "";
                                    targetElement.style.filter = "";
                                    setTimeout(() => targetElement.style.transition = originalTransition, 100);
                                }, 150);

                                try {
                                    if (!self._clickCache[clickAttr]) {
                                        self._clickCache[clickAttr] = new Function('hass', 'states', 'entity', clickAttr);
                                    }
                                    self._clickCache[clickAttr](self._hass, self._hass.states, self._config.entity);
                                } catch (err) { console.error("Zenit Click Error:", err); }
                            }

                            if (speakAttr || clickAttr) break;
                        }
                    }
                }
            }
            
            this.addEventListener('touchstart', function(e) { self._isTouch = true; handleStart(e); }, { passive: true });
            this.addEventListener('touchmove', function(e) { handleMove(e); }, { passive: true });
            this.addEventListener('mousedown', function(e) { if (self._isTouch) return; handleStart(e); });
            this.addEventListener('mousemove', function(e) { if (self._isTouch) return; handleMove(e); });
            this.addEventListener('touchend', function(e) { handleEnd(e); }, { passive: true });
            this.addEventListener('mouseup', function(e) { if (self._isTouch) { setTimeout(function() { self._isTouch = false; }, 300); return; } handleEnd(e); });
            this.addEventListener('touchcancel', () => { if (self._pressTimer) clearTimeout(self._pressTimer); self._pressTimer = null; self._isScrolling = false; }, { passive: true });
            this.addEventListener('mouseleave', () => { if (self._pressTimer) clearTimeout(self._pressTimer); self._pressTimer = null; });
        }
        
        _unlockAudio() { try { window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); this._audioUnlocked = true; } catch(e){} }
        getCardSize() { return 3; }
    }

    if (!customElements.get(TAG)) { 
        customElements.define(TAG, ZenitSingularity); 
        console.info(
            `%c ✧ Z Ξ N I T ✧ SINGULARITY %c V${VERSION} %c ONLINE `,
            "color: #00fbff; font-weight: bold; background: #000; padding: 5px; border: 1px solid #00fbff; border-radius: 5px 0 0 5px;",
            "color: #000; font-weight: bold; background: #00fbff; padding: 5px;",
            "color: #fff; font-weight: bold; background: #E64A9C; padding: 5px; border-radius: 0 5px 5px 0;"
        );
    } 

    window.customCards = window.customCards || []; 
    window.customCards.push({ 
        type: TAG, 
        name: "Zenit Singularity Card", 
        description: "High-performance Cyberpunk & Glassmorphism custom card engine.",
        preview: true 
    });
})();