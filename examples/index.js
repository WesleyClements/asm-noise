(function () {
  const canvas = document.querySelector('canvas');
  const ui = document.querySelector('#ui');
  const algorithmSelect = ui.querySelector('#algorithm-select');
  const dimensionSelect = ui.querySelector('#dimension-select');
  const seedInput = ui.querySelector('input[name=seed]');

  const updateCanvasDimensions = () =>
    void (canvas.width = canvas.height = innerWidth > innerHeight ? innerHeight : innerWidth);

  const configNoise = () =>
    noise.config({ algorithm: algorithmSelect.value, seed: seedInput.value });

  const renderNoise = () => {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(canvas.width, canvas.height);

    ctx.putImageData(imgData, 0, 0);
  };

  seedInput.value = noise.seed;

  window.addEventListener('resize', () => updateCanvasDimensions());
  (function () {
    let configNoiseHandle;
    let renderNoiseHandle;

    algorithmSelect.addEventListener('change', () => {
      clearTimeout(configNoiseHandle);
      configNoise();
      clearTimeout(renderNoiseHandle);
      renderNoise();
    });
    seedInput.addEventListener('keydown', () => {
      clearTimeout(configNoiseHandle);
      configNoiseHandle = setTimeout(() => {
        if (isNaN(seedInput.value)) {
          seedInput.value = noise.seed;
          return;
        }
        configNoise();
        clearTimeout(renderNoiseHandle);
        renderNoiseHandle = setTimeout(() => renderNoise(), 300);
      }, 300);
    });
  })();

  updateCanvasDimensions();
})();
