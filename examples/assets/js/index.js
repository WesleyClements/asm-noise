(function () {
  const noiseWorker = window.Worker ? new Worker('./assets/js/noiseWorker.js') : null;
  const main = document.querySelector('main');

  const canvas = main.querySelector('canvas');
  const ui = main.querySelector('#ui');
  const uiToggle = ui.querySelector('#ui-toggle');
  const uiContent = ui.querySelector('#ui-content');

  const algorithmSelect = ui.querySelector('#algorithm-select');
  const dimensionSelect = ui.querySelector('#dimension-select');
  const seedInput = ui.querySelector('input[name=seed]');
  const scaleInput = ui.querySelector('input[name=scale]');
  const scaleSlider = ui.querySelector('input[name=scale-slider]');
  const resolutionInput = ui.querySelector('input[name=resolution]');
  const resolutionSlider = ui.querySelector('input[name=resolution-slider]');
  const generateBtn = ui.querySelector('#generate-btn');
  const saveBtn = ui.querySelector('#save-btn');
  const generationMetricsSpan = ui.querySelector('#generation-metrics');
  let renderCount = 0;

  seedInput.value = noise.seed;

  const wait = (ms = 0) => new Promise((resolve) => setTimeout(() => resolve(), ms));

  const updateCanvasDimensions = () => {
    canvas.width = canvas.height = innerWidth > innerHeight ? innerHeight : innerWidth;
  };

  const calculateScale = (n) => 10 ** n;

  const configNoise = () =>
    noise.config({ algorithm: algorithmSelect.value, seed: seedInput.value });

  const generateNoiseImage = async ({ dimensions, scale, resolution, width, height }) => {
    const { dt, noiseValues, imgData } = await (noiseWorker
      ? new Promise((resolve, reject) => {
          const onMessage = (e) => {
            noiseWorker.removeEventListener('message', onMessage);
            resolve(e.data);
          };
          noiseWorker.addEventListener('message', onMessage);
          noiseWorker.postMessage({ dimensions, scale, resolution, width, height });
        })
      : generateNoiseImageSync({
          dimensions,
          scale,
          resolution,
          width,
          height,
        }));
    return {
      dt: dt.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
      noiseValues,
      imgData,
    };
  };

  const renderNoise = (() => {
    let renderHandle;
    let rendering = false;
    return () => {
      if (rendering) return;
      clearTimeout(renderHandle);
      renderHandle = setTimeout(async () => {
        rendering = true;

        generateBtn.classList.add('is-loading', 'disabled');

        // disable config inputs while rendering
        algorithmSelect.setAttribute('disabled', true);
        dimensionSelect.setAttribute('disabled', true);
        seedInput.setAttribute('disabled', true);
        scaleInput.setAttribute('disabled', true);
        scaleSlider.setAttribute('disabled', true);
        resolutionInput.setAttribute('disabled', true);
        resolutionSlider.setAttribute('disabled', true);
        saveBtn.setAttribute('disabled', true);

        // wait on a timeout to allow browser to do it's stuff
        await wait();

        const ctx = canvas.getContext('2d');

        const { dt, noiseValues, imgData } = await generateNoiseImage({
          dimensions: dimensionSelect.value,
          scale: calculateScale(scaleSlider.value),
          resolution: resolutionSlider.value / 100,
          width: canvas.width,
          height: canvas.height,
        });

        wait().then(() => ctx.putImageData(imgData, 0, 0));

        // re-enble config inputs after rendering
        algorithmSelect.removeAttribute('disabled');
        dimensionSelect.removeAttribute('disabled');
        seedInput.removeAttribute('disabled');
        scaleInput.removeAttribute('disabled');
        scaleSlider.removeAttribute('disabled');
        resolutionInput.removeAttribute('disabled');
        resolutionSlider.removeAttribute('disabled');
        saveBtn.removeAttribute('disabled');

        generateBtn.classList.remove('is-loading', 'disabled');
        canvas.removeAttribute('style');
        generationMetricsSpan.removeAttribute('style');

        generationMetricsSpan.textContent = `Generated ${noiseValues.length} noise values in ${dt}ms`;

        if (!ui.querySelector('output#time')) rendering = false;
        renderCount++;
      }, 100);
    };
  })();

  window.addEventListener('resize', () => {
    updateCanvasDimensions();
    if (renderCount) renderNoise();
  });

  ui.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#ui-handle')) return;
    e.preventDefault();

    const rect = ui.getBoundingClientRect();
    const { width, height } = rect;
    const xOffset = 2 * (rect.x - e.x);
    const yOffset = 2 * (rect.y - e.y);

    const onMouseMove = (e) => {
      e.preventDefault();
      ui.style.top = e.pageY + yOffset + 'px';
      ui.style.left = e.pageX + xOffset + 'px';
      ui.style.bottom = null;
      ui.style.right = null;
    };
    const finalizeMove = (e) => {
      e.preventDefault();
      let { x, y } = ui.getBoundingClientRect();

      if (y < 0) {
        ui.style.top = 0;
        ui.style.bottom = null;
      } else if (y + height > innerHeight) {
        ui.style.top = null;
        ui.style.bottom = 0;
      } else {
        ui.style.bottom = null;
      }
      if (x < 0) {
        ui.style.left = 0;
        ui.style.right = null;
      } else if (x + width > innerWidth) {
        ui.style.left = null;
        ui.style.right = 0;
      } else {
        ui.style.right = null;
      }
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', finalizeMove);
      document.removeEventListener('blur', finalizeMove);
    };
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', finalizeMove);
    document.addEventListener('blur', finalizeMove);
  });

  (function () {
    let showUI = true;
    uiToggle.addEventListener('click', () => {
      showUI = !showUI;
      if (showUI) {
        uiToggle.innerHTML = `<i class="fas fa-minus"></i>`;
        uiContent.removeAttribute('style');
      } else {
        uiToggle.innerHTML = `<i class="fas fa-plus"></i>`;
        uiContent.style.display = 'none';
      }
    });
  })();

  (function () {
    let configNoiseHandle;

    algorithmSelect.addEventListener('change', () => {
      clearTimeout(configNoiseHandle);
      configNoise();
    });
    seedInput.addEventListener('keydown', () => {
      clearTimeout(configNoiseHandle);
      configNoiseHandle = setTimeout(() => {
        if (isNaN(seedInput.value)) {
          seedInput.value = noise.seed;
          return;
        }
        configNoise();
      }, 300);
    });
  })();

  (function () {
    let updateScaleHandle;
    scaleInput.addEventListener('keydown', () => {
      clearTimeout(updateScaleHandle);
      updateScaleHandle = setTimeout(() => {
        if (isNaN(scaleInput.value) || scaleInput.value <= 0) {
          scaleInput.value = scaleSlider.value;
          return;
        }
        scaleSlider.value = Math.log10(scaleInput.value);
      }, 300);
    });
    scaleSlider.addEventListener('input', () => {
      clearTimeout(updateScaleHandle);
      scaleInput.value = calculateScale(scaleSlider.value).toLocaleString(undefined, {
        maximumFractionDigits: 7,
      });
    });
  })();

  (function () {
    let updateResolutionHandle;
    resolutionInput.addEventListener('keydown', () => {
      clearTimeout(updateResolutionHandle);
      if (!resolutionInput.value) return;
      updateResolutionHandle = setTimeout(() => {
        if (isNaN(resolutionInput.value) || resolutionInput.value <= 0) {
          resolutionInput.value = resolutionSlider.value + '%';
          return;
        }
        resolutionSlider.value = scaleInput.value;
        resolutionInput.value += '%';
      }, 300);
    });
    resolutionSlider.addEventListener('input', () => {
      clearTimeout(updateResolutionHandle);
      resolutionInput.value = resolutionSlider.value + '%';
    });
  })();

  generateBtn.addEventListener('click', renderNoise);
  saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.setAttribute('download', algorithmSelect.value + '-noise');
    link.setAttribute('href', canvas.toDataURL('image/png'));
    link.click();
  });

  updateCanvasDimensions();
})();
