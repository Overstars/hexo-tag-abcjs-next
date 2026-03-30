'use strict';

const DEFAULT_CONFIG = {
    js: 'https://cdn.jsdelivr.net/npm/abcjs@6.2.0/dist/abcjs-basic-min.js',
    css: 'https://cdn.jsdelivr.net/npm/abcjs@6.2.0/abcjs-audio.css',
    scriptId: 'hexo-tag-abcjs-next',
    midi: true,
    animation: true,
    animationColors: ['#000000', '#3d9afc'],
    options: {
        startingTune: 0,
        print: false,
        visualTranspose: 0,
        scale: 1,
        responsive: 'resize',
        inlineControls: {
            loopToggle: true,
            standard: true,
            tooltipLoop: 'Click to toggle play once/repeat.',
            tooltipReset: 'Click to go to beginning.',
            tooltipPlay: 'Click to play/pause.',
            tooltipProgress: 'Click to change the playback position.',
            tooltipWarp: 'Change the playback speed.'
        }
    }
};

let abcjsCount = 0;

function cloneObject(value) {
    if (Array.isArray(value)) return value.map(cloneObject);
    if (value && typeof value === 'object') {
        const result = {};
        Object.keys(value).forEach(key => {
            result[key] = cloneObject(value[key]);
        });
        return result;
    }
    return value;
}

function mergeObject(target, source) {
    const result = cloneObject(target);
    Object.keys(source || {}).forEach(key => {
        const sourceValue = source[key];
        if (
            sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
            result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
        ) {
            result[key] = mergeObject(result[key], sourceValue);
            return;
        }
        result[key] = cloneObject(sourceValue);
    });
    return result;
}

function resolvePluginConfig(hexoConfig) {
    return mergeObject(DEFAULT_CONFIG, hexoConfig.abcjs_next || hexoConfig.abcjs || {});
}

function parseAbcjsArgs(args, pluginConfig) {
    const options = {
        autoplay: false,
        midi: pluginConfig.midi,
        animation: pluginConfig.animation
    };

    (args || []).forEach(arg => {
        switch ((arg || '').trim()) {
            case 'autoplay':
                options.autoplay = true;
                break;
            case 'no-midi':
                options.midi = false;
                break;
            case 'no-animation':
                options.animation = false;
                break;
        }
    });

    return options;
}

function createTagConfig(pluginConfig, args) {
    const paperId = `abcjs-paper-${abcjsCount++}`;
    const audioId = `abcjs-audio-${abcjsCount++}`;
    const parsedArgs = parseAbcjsArgs(args, pluginConfig);

    return mergeObject(pluginConfig, {
        paperId,
        audioId,
        autoplay: parsedArgs.autoplay,
        midi: parsedArgs.midi,
        animation: parsedArgs.animation
    });
}

function buildClientScript(config, contents) {
    return `
<script data-pjax>
(function () {
    var config = ${JSON.stringify(config)};
    var abcString = ${JSON.stringify(contents)};
    var runtime = window.__abcjsTagRuntime = window.__abcjsTagRuntime || {
        scripts: {},
        styles: {}
    };

    function loadStyleOnce(url) {
        if (!url || runtime.styles[url]) return;
        if (document.querySelector('link[href="' + url + '"]')) {
            runtime.styles[url] = true;
            return;
        }

        var css = document.createElement('link');
        css.href = url;
        css.rel = 'stylesheet';
        css.type = 'text/css';
        document.head.appendChild(css);
        runtime.styles[url] = true;
    }

    function loadScriptOnce(id, url) {
        if (window.ABCJS) return Promise.resolve(window.ABCJS);

        var key = id || url;
        if (runtime.scripts[key]) return runtime.scripts[key];

        runtime.scripts[key] = new Promise(function (resolve, reject) {
            var existing = (id && document.getElementById(id)) || document.querySelector('script[src="' + url + '"]');
            var script = existing || document.createElement('script');

            function handleLoad() {
                resolve(window.ABCJS);
            }

            function handleError(error) {
                delete runtime.scripts[key];
                reject(error || new Error('Failed to load abcjs script.'));
            }

            if (window.ABCJS) {
                resolve(window.ABCJS);
                return;
            }

            script.addEventListener('load', handleLoad, { once: true });
            script.addEventListener('error', handleError, { once: true });

            if (!existing) {
                script.src = url;
                if (id) {
                    script.id = id;
                }
                document.body.appendChild(script);
            }
        });

        return runtime.scripts[key];
    }

    function clonePlainObject(source) {
        return source ? JSON.parse(JSON.stringify(source)) : {};
    }

    function getRenderOptions() {
        var options = clonePlainObject(config.options);
        delete options.inlineControls;
        delete options.animate;
        return options;
    }

    function getAudioOptions() {
        var options = clonePlainObject(config.options);
        if (options.animate && options.animate.qpm != null && options.qpm == null) {
            options.qpm = options.animate.qpm;
        }
        delete options.inlineControls;
        delete options.animate;
        return options;
    }

    function forEachEventElement(eventLike, iteratee) {
        if (!eventLike || !eventLike.elements) return;
        eventLike.elements.forEach(function (set) {
            (set || []).forEach(function (element) {
                if (element) iteratee(element);
            });
        });
    }

    function rememberOriginalFill(element) {
        if (element.dataset.abcjsOriginalFill !== undefined) return;
        var originalFill = element.getAttribute('fill');
        element.dataset.abcjsOriginalFill = originalFill === null ? '__none__' : originalFill;
    }

    function restoreOriginalFill(element) {
        if (!element || !element.dataset) return;
        var originalFill = element.dataset.abcjsOriginalFill;
        if (originalFill === undefined) return;
        if (originalFill === '__none__') {
            element.removeAttribute('fill');
        } else {
            element.setAttribute('fill', originalFill);
        }
    }

    function applyEventColor(eventLike, color, state) {
        forEachEventElement(eventLike, function (element) {
            rememberOriginalFill(element);
            if (state.touchedElements.indexOf(element) === -1) {
                state.touchedElements.push(element);
            }
            if (color == null) {
                restoreOriginalFill(element);
            } else {
                element.setAttribute('fill', color);
            }
        });
    }

    function resetAnimationState(state) {
        state.touchedElements.forEach(restoreOriginalFill);
        state.touchedElements = [];
        state.currentEvent = null;
    }

    function createCursorControl(state) {
        if (!config.animation) return null;

        var animationColors = config.animationColors || [];
        var playedColor = animationColors[0] || null;
        var currentColor = animationColors[1] || playedColor;

        return {
            onStart: function () {
                resetAnimationState(state);
            },
            onEvent: function (event) {
                if (!event) return;
                if (state.currentEvent) {
                    applyEventColor(state.currentEvent, playedColor, state);
                }
                applyEventColor(event, currentColor, state);
                state.currentEvent = event;
            },
            onFinished: function () {
                if (state.currentEvent) {
                    applyEventColor(state.currentEvent, playedColor, state);
                }
                state.currentEvent = null;
            }
        };
    }

    function colorLegacyRange(range, color) {
        if (!range || !range.elements) return;
        range.elements.forEach(function (set) {
            (set || []).forEach(function (element) {
                if (!element) return;
                if (color == null) {
                    element.removeAttribute('fill');
                } else {
                    element.setAttribute('fill', color);
                }
            });
        });
    }

    function createLegacyAnimateOptions() {
        if (!config.animation) return null;

        var animationColors = config.animationColors || [];
        return Object.assign({
            qpm: 120,
            listener: function (lastRange, currentRange) {
                colorLegacyRange(lastRange, animationColors[0] || null);
                colorLegacyRange(currentRange, animationColors[1] || animationColors[0] || null);
            }
        }, (config.options && config.options.animate) || {});
    }

    function getInlineControlOptions() {
        var inlineControls = (config.options && config.options.inlineControls) || {};
        var standardControlsEnabled = inlineControls.standard !== false;

        return {
            displayLoop: inlineControls.loopToggle !== false,
            displayRestart: inlineControls.restart !== false && standardControlsEnabled,
            displayPlay: inlineControls.play !== false && standardControlsEnabled,
            displayProgress: inlineControls.progress !== false && standardControlsEnabled,
            displayWarp: inlineControls.warp !== false
        };
    }

    function applyInlineControlText(audio) {
        var inlineControls = (config.options && config.options.inlineControls) || {};
        var labels = [
            {
                selector: '.abcjs-midi-loop',
                title: inlineControls.tooltipLoop || 'Click to toggle play once/repeat.'
            },
            {
                selector: '.abcjs-midi-reset',
                title: inlineControls.tooltipReset || 'Click to go to beginning.'
            },
            {
                selector: '.abcjs-midi-start',
                title: inlineControls.tooltipPlay || 'Click to play/pause.'
            },
            {
                selector: '.abcjs-midi-progress-background',
                title: inlineControls.tooltipProgress || 'Click to change the playback position.'
            },
            {
                selector: '.abcjs-midi-tempo',
                title: inlineControls.tooltipWarp || 'Change the playback speed.'
            }
        ];

        labels.forEach(function (item) {
            var element = audio.querySelector(item.selector);
            if (!element) return;
            element.setAttribute('title', item.title);
            element.setAttribute('aria-label', item.title);
        });
    }

    function bindAutoplayOnFirstGesture(state) {
        if (!config.autoplay || !state.control || state.autoplayBound) return;

        state.autoplayBound = true;
        var triggered = false;
        var events = ['click', 'keydown', 'touchstart'];

        function cleanup() {
            events.forEach(function (eventName) {
                document.removeEventListener(eventName, handleFirstGesture);
            });
        }

        function handleFirstGesture() {
            if (triggered || !state.control) return;
            triggered = true;
            cleanup();
            Promise.resolve(state.control.play()).catch(function (error) {
                console.error('abcjs autoplay failed:', error);
            });
        }

        events.forEach(function (eventName) {
            document.addEventListener(eventName, handleFirstGesture, { once: true, passive: true });
        });
    }

    function createLegacyMidi(audio, visualObj) {
        var options = clonePlainObject(config.options);
        var animateOptions = createLegacyAnimateOptions();
        if (animateOptions) {
            options.animate = animateOptions;
            options.animate.target = visualObj;
        }
        options.inlineControls = options.inlineControls || {};
        options.inlineControls.startPlaying = !!config.autoplay;
        ABCJS.renderMidi(config.audioId, abcString, options);
    }

    function createSynthAudio(audio, visualObj, state) {
        state.control = new ABCJS.synth.SynthController();
        state.synth = new ABCJS.synth.CreateSynth();

        audio.innerHTML = '';
        state.control.load(audio, createCursorControl(state), getInlineControlOptions());
        applyInlineControlText(audio);

        return state.synth.init({ visualObj: visualObj })
            .then(function () {
                return state.control.setTune(visualObj, false, getAudioOptions());
            })
            .then(function () {
                bindAutoplayOnFirstGesture(state);
            });
    }

    function initAudio(audio, visualObj, state) {
        if (!config.midi) {
            audio.innerHTML = '';
            return Promise.resolve();
        }

        if (ABCJS.synth && ABCJS.synth.SynthController && ABCJS.synth.CreateSynth) {
            return createSynthAudio(audio, visualObj, state);
        }

        if (typeof ABCJS.renderMidi === 'function') {
            createLegacyMidi(audio, visualObj);
            return Promise.resolve();
        }

        audio.innerHTML = '';
        return Promise.resolve();
    }

    function renderAbc(paper) {
        paper.innerHTML = '';
        return ABCJS.renderAbc(config.paperId, abcString, getRenderOptions());
    }

    function setup() {
        var paper = document.getElementById(config.paperId);
        var audio = document.getElementById(config.audioId);
        if (!paper || !audio || paper.dataset.abcjsRendered === 'true') return;

        paper.dataset.abcjsRendered = 'true';

        var state = {
            currentEvent: null,
            touchedElements: [],
            control: null,
            synth: null,
            autoplayBound: false
        };

        try {
            var tunes = renderAbc(paper);
            if (!tunes || !tunes[0]) {
                paper.dataset.abcjsRendered = 'false';
                return;
            }

            initAudio(audio, tunes[0], state).catch(function (error) {
                paper.dataset.abcjsRendered = 'false';
                resetAnimationState(state);
                console.error('abcjs audio init failed:', error);
            });
        } catch (error) {
            paper.dataset.abcjsRendered = 'false';
            resetAnimationState(state);
            console.error('abcjs render failed:', error);
        }
    }

    if (config.midi && config.css) {
        loadStyleOnce(config.css);
    }

    loadScriptOnce(config.scriptId, config.js)
        .then(setup)
        .catch(function (error) {
            console.error('abcjs script load failed:', error);
        });
})();
</script>`;
}

function renderAbcjsTag(pluginConfig, args, contents) {
    const config = createTagConfig(pluginConfig, args);

    return `
<div id="${config.audioId}" class="abcjs-audio-container"></div>
<div id="${config.paperId}" class="abcjs-paper-container"></div>
${buildClientScript(config, contents)}`;
}

const pluginConfig = resolvePluginConfig(hexo.config);

hexo.extend.tag.register('abcjs', function (args, contents) {
    return renderAbcjsTag(pluginConfig, args, contents);
}, { ends: true });