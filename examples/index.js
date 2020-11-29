(function () {
  const main = document.querySelector('main');
  const canvas = main.querySelector('canvas');
  const ui = main.querySelector('#ui');
  const algorithmSelect = ui.querySelector('#algorithm-select');
  const dimensionSelect = ui.querySelector('#dimension-select');
  const seedInput = ui.querySelector('input[name=seed]');
  const scaleInput = ui.querySelector('input[name=scale]');
  const scaleSlider = ui.querySelector('input[name=scale-slider]');
  const generateBtn = ui.querySelector('button');

  const updateCanvasDimensions = () => {
    canvas.width = canvas.height = innerWidth > innerHeight ? innerHeight : innerWidth;
  };

  const calculateScale = (n) => 10 ** n;

  const configNoise = () =>
    noise.config({ algorithm: algorithmSelect.value, seed: seedInput.value });

  let renderHandle;
  let rendering = false;
  let renderCount = 0;
  const renderNoise = () => {
    if (rendering) return;
    clearTimeout(renderHandle);
    renderHandle = setTimeout(() => {
      rendering = true;

      generateBtn.classList.add('is-loading', 'disabled');

      // disable config inputs while rendering
      algorithmSelect.setAttribute('disabled', true);
      dimensionSelect.setAttribute('disabled', true);
      seedInput.setAttribute('disabled', true);
      scaleSlider.setAttribute('disabled', true);

      // wait on a timeout to allow browser to do it's stuff
      new Promise((resolve) => setTimeout(() => resolve(), 0)).then(() => {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        const scale = calculateScale(scaleSlider.value);
        for (let i = 0; i < imgData.width; ++i) {
          for (let j = 0; j < imgData.height; ++j) {
            const index = (i + j * imgData.width) * 4;
            const value = 255 * noise(i * scale, j * scale);
            imgData.data[index + 0] = value;
            imgData.data[index + 1] = value;
            imgData.data[index + 2] = value;
            imgData.data[index + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);

        // re-enble config inputs after rendering
        algorithmSelect.removeAttribute('disabled');
        dimensionSelect.removeAttribute('disabled');
        seedInput.removeAttribute('disabled');
        scaleSlider.removeAttribute('disabled');

        generateBtn.classList.remove('is-loading', 'disabled');
        canvas.removeAttribute('style');

        if (!ui.querySelector('output#time')) rendering = false;
        renderCount++;
      });
    }, 100);
  };

  seedInput.value = noise.seed;

  window.addEventListener('resize', () => {
    updateCanvasDimensions();
    if (renderCount) renderNoise();
  });
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
  generateBtn.addEventListener('click', renderNoise);

  updateCanvasDimensions();
})();
