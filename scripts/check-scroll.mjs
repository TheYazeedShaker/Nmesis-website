import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the production controller without adding test hooks or browser dependencies.
const source = await fs.readFile(new URL('../src/scripts/motion.js', import.meta.url), 'utf8');

async function fixture({smooth = true, reduced = false} = {}) {
  const activity = [], frames = new Map(), resizeObservers = [], mutationObservers = [], elements = new Map();
  let frameId = 0, now = 0, context;
  class Events {
    listeners = new Map();
    addEventListener(type, listener) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(listener);
    }
    removeEventListener(type, listener) {
      this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== listener));
    }
    dispatchEvent(event) {
      event.target ||= this;
      event.defaultPrevented ||= false;
      event.preventDefault ||= function () { this.defaultPrevented = true; };
      for (const listener of this.listeners.get(event.type) || []) listener(event);
      return !event.defaultPrevented;
    }
  }
  class Element extends Events {
    constructor(name, top = 0, height = 400) {
      super(); this.name = name; this.top = top; this.height = height; this.width = 1000;
      this.nodeType = 1; this.dataset = {}; this.hidden = false; this.attributes = new Map();
      this.parentElement = null; this.offsetParent = null;
      const styles = {transform: '', opacity: '', overflow: '', scrollMarginTop: '0px'};
      this.style = new Proxy(styles, {
        set: (object, key, value) => {
          if (this.name.startsWith('effect')) activity.push({type: 'write', element: this.name, key, value});
          object[key] = value; return true;
        },
      });
      this.classList = {add() {}, remove() {}, toggle() {}, contains() { return false; }};
    }
    read(key, value) { activity.push({type: 'read', element: this.name, key}); return value; }
    get offsetTop() { return this.read('offsetTop', this.top); }
    get clientHeight() { return this.read('clientHeight', this.height); }
    get offsetHeight() { return this.read('offsetHeight', this.height); }
    get offsetWidth() { return this.read('offsetWidth', this.width); }
    get scrollHeight() { return this.height; }
    getClientRects() { return this.read('getClientRects', this.hidden ? [] : [{}]); }
    getBoundingClientRect() {
      return this.read('getBoundingClientRect', {top: this.top - context.scrollY, bottom: this.top + this.height - context.scrollY, left: 0, right: this.width, width: this.width, height: this.height});
    }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    matches(selector) { return this.name === 'anchor' && selector.includes('a'); }
    closest(selector) { return this.matches(selector) ? this : null; }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    hasAttribute(name) { return this.attributes.has(name); }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    contains(element) { return element === this; }
  }
  const root = new Element('html', 0, 4000), body = new Element('body', 0, 4000);
  const desktop = new Element('desktop', 1000), mobile = new Element('mobile', 1600);
  mobile.hidden = true;
  const first = new Element('effect-one'), second = new Element('effect-two');
  for (const el of [desktop, mobile, first, second]) { el.parentElement = body; el.offsetParent = root; }
  elements.set('.effect-one', [first]); elements.set('.effect-two', [second]); elements.set('.target', [desktop, mobile]);
  const document = new Events();
  Object.assign(document, {
    documentElement: root, body, scrollingElement: root, hidden: false,
    fonts: {ready: Promise.resolve()},
    querySelectorAll: selector => elements.get(selector) || [],
    querySelector: selector => (elements.get(selector) || [])[0] || null,
    getElementById: id => id === 'destination' ? desktop : null,
  });
  const windowEvents = new Events();
  let lenis;
  class Lenis {
    constructor(options) { this.options = options; this.calls = []; this.animatedScroll = 0; this.isScrolling = false; lenis = this; }
    raf() {
      if (this.pendingScroll !== undefined) {
        context.scrollY = this.animatedScroll = this.pendingScroll;
        this.pendingScroll = undefined;
        this.isScrolling = false;
      }
    }
    on() { return () => {}; }
    resize() {}
    start() {}
    stop() {}
    destroy() {}
    scrollTo(target, options = {}) {
      this.calls.push({target, options});
      if (options.immediate) context.scrollY = this.animatedScroll = Number(target);
      else this.pendingScroll = typeof target === 'number' ? target : target.top + (options.offset || 0);
    }
  }
  class Observer {
    constructor(callback, collection) { this.callback = callback; this.observed = new Set(); collection.push(this); }
    observe(target) { this.observed.add(target); }
    unobserve(target) { this.observed.delete(target); }
    disconnect() { this.observed.clear(); }
  }
  const effects = [
    {selector: '.effect-one', target: '.target', kind: 'scroll', trigger: 'onScrollTarget', threshold: 1, from: {y: 100}, to: {y: 0}},
    {selector: '.effect-two', target: '.target', kind: 'scroll', trigger: 'onScrollTarget', threshold: 1, from: {y: 200}, to: {y: 0}},
  ];
  const reduce = new Events(); reduce.matches = reduced;
  context = vm.createContext({
    document, Element, HTMLElement: Element, HTMLAnchorElement: Element, Node: Element,
    MORO_MOTION: {appear: {}, effects, mouse: [], components: [], hovers: []},
    Motion: {}, ReferenceLenis: smooth ? Lenis : undefined,
    location: {pathname: '/test', search: '', origin: 'http://localhost:4175', href: 'http://localhost:4175/test', reload() {}},
    history: {pushState() {}}, URL, console, performance: {now: () => now},
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
    scrollX: 0, scrollY: 0, innerWidth: 1000, innerHeight: 600,
    matchMedia: () => reduce,
    getComputedStyle: element => {
      activity.push({type: 'read', element: element.name, key: 'computedStyle'});
      return {transform: 'none', display: element.hidden ? 'none' : 'block', scrollMarginTop: element.style.scrollMarginTop, getPropertyValue: key => element.style[key] || ''};
    },
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    setTimeout: () => 1, clearTimeout() {},
    ResizeObserver: class extends Observer { constructor(callback) { super(callback, resizeObservers); } },
    MutationObserver: class extends Observer { constructor(callback) { super(callback, mutationObservers); } },
    IntersectionObserver: class extends Observer { constructor(callback) { super(callback, []); } },
  });
  context.window = context;
  vm.runInContext(source, context, {filename: 'src/scripts/motion.js'});
  await Promise.resolve();
  const frame = () => {
    const callbacks = [...frames.values()]; frames.clear(); now += 1000 / 60;
    callbacks.forEach(callback => callback(now));
  };
  frame(); frame(); activity.length = 0;
  const emit = (type, detail = {}) => windowEvents.dispatchEvent({type, ...detail});
  const layoutChanged = () => resizeObservers.forEach(observer => observer.callback([...observer.observed].map(target => ({target, contentRect: {width: target.width, height: target.height}}))));
  const visibilityChanged = () => mutationObservers.filter(observer => observer.observed.has(body)).forEach(observer => observer.callback([{type: 'attributes', target: desktop, attributeName: 'hidden'}]));
  const y = element => Number(element.style.transform.match(/translate\([^,]+px,\s*([-\d.]+)px\)/)?.[1] || 0);
  const anchor = () => {
    const link = new Element('anchor');
    link.href = 'http://localhost:4175/test#destination'; link.target = ''; link.download = '';
    return link;
  };
  return {context, document, activity, lenis, frame, emit, layoutChanged, visibilityChanged, desktop, mobile, first, second, y, anchor};
}

const f = await fixture();

// A smooth-scroll update must drive the effects in that same rendered frame.
f.lenis.pendingScroll = 599;
f.frame();
assert.equal(f.y(f.first), 50, 'Scroll-linked media lag behind the Lenis frame');
assert.equal(f.y(f.second), 100, 'Effects sharing a target must advance together');
assert.equal(f.activity.filter(entry => entry.type === 'read').length, 0, 'Steady scrolling should use cached geometry');

// Repeated events and content already outside its progress range need no repaint.
f.activity.length = 0;
f.emit('scroll'); f.frame();
assert.equal(f.activity.filter(entry => entry.type === 'write').length, 0, 'Unchanged scroll position rewrites effect styles');
f.lenis.pendingScroll = 1200; f.frame();
f.activity.length = 0;
f.lenis.pendingScroll = 1300; f.frame();
assert.equal(f.activity.filter(entry => entry.type === 'write').length, 0, 'Clamped effects repaint after their animation has finished');

// A resize changes the mapping, but every geometry read must precede effect writes.
f.desktop.top = 1800;
f.activity.length = 0;
f.emit('resize'); f.frame();
assert.equal(f.y(f.first), 74.75, 'Resize did not refresh the target geometry');
const firstWrite = f.activity.findIndex(entry => entry.type === 'write');
assert.ok(firstWrite >= 0, 'Resize did not render the refreshed progress');
assert.ok(!f.activity.slice(firstWrite).some(entry => entry.type === 'read'), 'Scroll frame interleaves style writes and geometry reads');

// Reflow above a target (images, FAQ or switched panels) is not a window resize.
f.desktop.top = 1900;
f.layoutChanged(); f.frame();
assert.equal(f.y(f.first), 99.75, 'Content resize left a stale scroll target');

// Responsive selector copies must resolve again after crossing a breakpoint.
f.desktop.hidden = true; f.mobile.hidden = false;
f.mobile.top = 1500;
f.emit('resize'); f.frame();
assert.equal(f.y(f.first), 0, 'Responsive target remained bound to the hidden desktop copy');

// A tab can switch visibility while preserving the outer section's dimensions.
f.desktop.hidden = false; f.mobile.hidden = true;
f.visibilityChanged(); f.frame();
assert.equal(f.y(f.first), 99.75, 'Visibility-only tab changes left a stale target');

// Modified links retain the browser action; plain same-page links use one controller.
for (const modifier of [{metaKey: true}, {ctrlKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}]) {
  const before = f.lenis.calls.length;
  const event = {type: 'click', target: f.anchor(), button: 0, ...modifier};
  f.document.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false, 'A modified anchor click was intercepted');
  assert.equal(f.lenis.calls.length, before, 'A modified anchor click initiated scrolling');
}
const link = f.anchor();
const click = {type: 'click', target: link, button: 0};
const before = f.lenis.calls.length;
f.document.dispatchEvent(click);
assert.equal(click.defaultPrevented, true, 'Same-page anchor fell back to a competing browser jump');
const movements = f.lenis.calls.slice(before).filter(call => !call.options.immediate);
assert.equal(movements.length, 1, 'Same-page anchor initiated multiple scroll animations');

// Film selection first reconciles a browser focus jump, then honors scroll margin.
f.desktop.hidden = false; f.desktop.style.scrollMarginTop = '100px';
f.context.scrollY = 800;
f.lenis.animatedScroll = 1300;
const customBefore = f.lenis.calls.length;
const selection = {type: 'nmesis:scroll-to', detail: {target: f.desktop}};
f.document.dispatchEvent(selection);
assert.equal(selection.defaultPrevented, true, 'Film selection was not handled by the scroll controller');
const selectionMoves = f.lenis.calls.slice(customBefore);
assert.ok(selectionMoves.some(call => call.options.immediate && call.target === 800), 'Browser focus movement was not reconciled before smooth scrolling');
assert.equal(selectionMoves.filter(call => !call.options.immediate).at(-1)?.target, 1800, 'Film scroll ignored its destination or scroll margin');

// Native touch/browser scrolling still updates effects if smooth scrolling is unavailable.
const native = await fixture({smooth: false});
native.context.scrollY = 599;
native.emit('scroll'); native.frame();
assert.equal(native.y(native.first), 50, 'Native scroll fallback stopped driving effects');

// Reduced motion leaves normal browser scrolling and visible content alone.
const reduced = await fixture({reduced: true});
reduced.context.scrollY = 599;
reduced.emit('scroll'); reduced.frame();
assert.equal(reduced.lenis, undefined, 'Reduced motion unexpectedly installed a smooth scroll controller');
assert.equal(reduced.first.style.transform, '', 'Reduced motion unexpectedly transformed page content');
assert.equal(reduced.first.style.opacity, '', 'Reduced motion unexpectedly hid page content');

console.log('Scroll passed: same-frame updates, cached geometry, unchanged/clamped paint skipping, resize/reflow/responsive/tab mapping, anchor modifiers, film focus synchronization, native scroll, and reduced motion.');
