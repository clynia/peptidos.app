/* ==========================================================================
   PEPTIDIA - Calculadora de reconstitución
   Entra: mg del vial, mL de agua, dosis deseada (mcg/mg), tipo de jeringa.
   Sale: UI (unidades de la jeringa de insulina U-100), mL a extraer,
         concentración y nº de dosis por vial, con jeringuilla SVG dinámica.

   Matemática (U-100: 1 mL = 100 UI):
     concentración (mcg/mL) = mg_vial * 1000 / mL_agua
     volumen (mL)           = dosis_mcg / concentración
     UI en la jeringa       = volumen (mL) * 100
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    vial: $('vial'), water: $('water'), dose: $('dose'),
    syringe: $('syringe'),
    num: $('r-units'), volume: $('r-volume'),
    conc: $('r-conc'), concMcg: $('r-conc-mcg'), perVial: $('r-pervial'),
    hint: $('r-hint'), error: $('calc-error'), errorText: $('calc-error-text'),
    svg: $('syringe-svg'), cap: $('syringe-cap')
  };
  var doseUnit = 'mcg';

  /* ---- helpers ---- */
  function fmt(n, dec) {
    if (!isFinite(n)) return '-';
    var r = Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
    var s = (r % 1 === 0) ? String(r) : r.toFixed(dec).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ','); // decimal español
  }

  var SYR = {
    '30':  { max: 30,  labelStep: 10, minorStep: 5,  ml: '0,3 mL' },
    '50':  { max: 50,  labelStep: 10, minorStep: 5,  ml: '0,5 mL' },
    '100': { max: 100, labelStep: 20, minorStep: 10, ml: '1 mL' }
  };

  /* ---- dibujo de la jeringuilla ---- */
  function renderSyringe(maxUnits, units) {
    var cfg = SYR[String(maxUnits)] || SYR['100'];
    var X0 = 46, X1 = 356, LEN = X1 - X0;
    var frac = Math.max(0, Math.min(1, (units || 0) / cfg.max));
    var fillW = frac * LEN;
    var sealX = X0 + fillW;
    var overflow = units > cfg.max + 0.001;

    var ticks = '';
    for (var u = 0; u <= cfg.max; u += cfg.minorStep) {
      var x = X0 + (u / cfg.max) * LEN;
      var isLabel = (u % cfg.labelStep === 0);
      var y2 = isLabel ? 26 : 31;
      ticks += '<line x1="' + x.toFixed(1) + '" y1="38" x2="' + x.toFixed(1) + '" y2="' + y2 + '" stroke="#243A5E" stroke-width="' + (isLabel ? 1.4 : 1) + '" opacity="' + (isLabel ? .8 : .45) + '"/>';
      if (isLabel) ticks += '<text x="' + x.toFixed(1) + '" y="18" font-size="10" font-family="Inter,sans-serif" fill="#51617B" text-anchor="middle">' + u + '</text>';
    }

    var fillColor = overflow ? '#E0512A' : '#6AA0FF';
    var sealColor = overflow ? '#C2421F' : '#163E97';

    var marker = '';
    if (isFinite(units) && units > 0) {
      var mx = overflow ? X1 : sealX;
      marker =
        '<line x1="' + mx.toFixed(1) + '" y1="6" x2="' + mx.toFixed(1) + '" y2="92" stroke="#E0512A" stroke-width="1.5" stroke-dasharray="3 3"/>' +
        '<g transform="translate(' + Math.min(mx, X1 - 2).toFixed(1) + ',100)">' +
          '<rect x="-26" y="-2" width="52" height="20" rx="10" fill="#E0512A"/>' +
          '<text x="0" y="12" font-size="11" font-weight="700" font-family="Inter,sans-serif" fill="#fff" text-anchor="middle">' + fmt(units, 1) + ' UI</text>' +
        '</g>';
    }

    els.svg.innerHTML =
      '<svg class="syringe" viewBox="0 0 430 124" role="img" aria-label="Jeringa de insulina mostrando ' + fmt(units, 1) + ' unidades de ' + cfg.max + '">' +
        ticks +
        // aguja
        '<line x1="6" y1="60" x2="44" y2="60" stroke="#9aa49d" stroke-width="2.4" stroke-linecap="round"/>' +
        '<path d="M4 60 L12 57.5 L12 62.5 Z" fill="#9aa49d"/>' +
        // cuerpo
        '<rect x="44" y="38" width="314" height="44" rx="7" fill="#fff" stroke="#243A5E" stroke-width="1.6"/>' +
        // líquido
        '<rect x="' + X0 + '" y="40" width="' + Math.max(0, Math.min(fillW, LEN)).toFixed(1) + '" height="40" fill="' + fillColor + '" opacity="0.55"/>' +
        (units > 0 ? '<rect x="' + (Math.min(sealX, X1) - 4).toFixed(1) + '" y="36" width="5" height="48" rx="1.5" fill="' + sealColor + '"/>' : '') +
        // émbolo
        '<rect x="356" y="55" width="50" height="10" rx="3" fill="#cdd4cd"/>' +
        '<rect x="404" y="34" width="9" height="52" rx="3" fill="#9aa49d"/>' +
        marker +
      '</svg>';

    els.cap.textContent = overflow
      ? 'Esa dosis no cabría en una jeringa de ' + cfg.ml + ' (' + cfg.max + ' UI). Con más agua o una jeringa mayor, sí.'
      : 'Jeringa de insulina de ' + cfg.ml + ' (' + cfg.max + ' UI). La marca coral señala las UI calculadas.';
  }

  function clearResults(msg) {
    els.num.textContent = '-';
    els.volume.textContent = '-';
    els.conc.textContent = '-';
    els.concMcg.textContent = '';
    els.perVial.textContent = '-';
    els.hint.textContent = msg || 'Rellena los tres campos para ver el resultado.';
    els.error.classList.remove('is-visible');
    renderSyringe(parseInt(els.syringe.value, 10), 0);
  }

  /* ---- cálculo ---- */
  function compute() {
    var vialMg = parseFloat(els.vial.value);
    var waterMl = parseFloat(els.water.value);
    var doseVal = parseFloat(els.dose.value);
    var maxUnits = parseInt(els.syringe.value, 10);

    if (!(vialMg > 0) || !(waterMl > 0) || !(doseVal > 0)) {
      clearResults();
      return;
    }

    var doseMcg = doseUnit === 'mg' ? doseVal * 1000 : doseVal;
    var concMcgPerMl = (vialMg * 1000) / waterMl;
    var concMgPerMl = vialMg / waterMl;
    var volumeMl = doseMcg / concMcgPerMl;
    var units = volumeMl * 100;
    var dosesPerVial = Math.floor((vialMg * 1000) / doseMcg);

    els.num.textContent = fmt(units, 1);
    els.volume.textContent = fmt(volumeMl, 3) + ' mL';
    els.conc.textContent = fmt(concMgPerMl, 2) + ' mg/mL';
    els.concMcg.textContent = '(' + fmt(concMcgPerMl, 0) + ' mcg/mL)';
    els.perVial.textContent = dosesPerVial + (dosesPerVial === 1 ? ' dosis' : ' dosis');

    // Mensajes de ayuda "para principiantes"
    var hints = [];
    if (units > maxUnits) {
      els.error.classList.add('is-visible');
      els.errorText.textContent = 'Esa dosis equivale a ' + fmt(units, 1) + ' UI, más de lo que admite la jeringa (' + maxUnits + ' UI). Con más agua, o una jeringa mayor, cabría.';
    } else {
      els.error.classList.remove('is-visible');
      els.errorText.textContent = '';
    }
    if (units > 0 && units < 2) {
      hints.push('Son muy pocas marcas (' + fmt(units, 1) + ' UI): difícil de medir con precisión. Con menos agua, la dosis ocuparía más marcas.');
    } else if (units <= maxUnits) {
      hints.push('Esa dosis equivale a la marca de ' + fmt(units, 1) + ' UI. Un vial así daría para ' + dosesPerVial + ' dosis.');
    }
    els.hint.textContent = hints.join(' ');

    renderSyringe(maxUnits, units);
  }

  /* ---- eventos ---- */
  ['vial', 'water', 'dose'].forEach(function (k) {
    if (els[k]) els[k].addEventListener('input', compute);
  });
  if (els.syringe) els.syringe.addEventListener('change', compute);

  Array.prototype.forEach.call(document.querySelectorAll('[data-unit]'), function (btn) {
    btn.addEventListener('click', function () {
      doseUnit = btn.getAttribute('data-unit');
      Array.prototype.forEach.call(document.querySelectorAll('[data-unit]'), function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      var unitLabel = document.getElementById('dose-unit-label');
      if (unitLabel) unitLabel.textContent = doseUnit;
      compute();
    });
  });

  // Ejemplo resuelto al cargar
  if (els.vial) { compute(); }
})();
