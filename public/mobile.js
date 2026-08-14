(() => {
  const maxZoom = 12;
  const stage = document.querySelector('#stage');
  const pointers = new Map();
  let gesture = null;

  function applyZoom(nextScale, clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    nextScale = Math.max(.5, Math.min(maxZoom, nextScale));
    const ratio = nextScale / scale;
    pan.x = x - (x - pan.x) * ratio;
    pan.y = y - (y - pan.y) * ratio;
    scale = nextScale;
    applyTransform();
  }

  document.querySelector('#zoomIn').onclick = () => {
    const rect = stage.getBoundingClientRect();
    applyZoom(scale * 1.35, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };
  document.querySelector('#zoomOut').onclick = () => {
    const rect = stage.getBoundingClientRect();
    applyZoom(scale / 1.35, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  stage.addEventListener('pointerdown', event => {
    if (drawing || event.target.closest('.hotspot,.resize')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = {type: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), scale};
    } else {
      gesture = {type: 'pan', id: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y};
      stage.classList.add('panning');
    }
  }, true);

  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      if (gesture?.type !== 'pinch') gesture = {type: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), scale};
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      applyZoom(gesture.scale * distance / gesture.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (gesture?.type === 'pan' && gesture.id === event.pointerId) {
      pan.x = gesture.panX + event.clientX - gesture.x;
      pan.y = gesture.panY + event.clientY - gesture.y;
      applyTransform();
    }
  }, true);

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    event.stopImmediatePropagation();
    pointers.delete(event.pointerId);
    gesture = null;
    stage.classList.remove('panning');
  }
  stage.addEventListener('pointerup', endPointer, true);
  stage.addEventListener('pointercancel', endPointer, true);

  const info = document.querySelector('#info');
  const infoToggle = document.querySelector('#infoToggle');
  infoToggle.onclick = () => {
    const expanded = info.classList.toggle('expanded');
    infoToggle.setAttribute('aria-expanded', String(expanded));
  };
})();
