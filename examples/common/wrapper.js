'use strict';
{
  const {
    GLSL1,
    GLSL3,
    WEBGL1,
    WEBGL2,
    isWebGL2Supported,
  } = GPUIO;

  // https://github.com/amandaghassaei/canvas-capture
  const CanvasCapture = window.CanvasCapture.CanvasCapture;
  const RECORD_FPS = 60;

  // Init a simple gui.
  const pane = new Tweakpane.Pane();

  // Init info dialog.
  MicroModal.init();

  // Init an overlay to prevent click events from bubbling through
  // modal to gui or canvas.
  // Show/hide overlay when modal is opened/closed.
  const overlay = document.createElement('div');
  overlay.id = 'touchOverlay';
  overlay.style.width = '100%';
  overlay.style.height = '100%'
  overlay.style.opacity = 0;
  overlay.style.position = 'absolute';
  overlay.style['z-index'] = 1;
  overlay.style.display = 'none';
  document.body.append(overlay);

  const webGLSettings = {
    webGLVersion: isWebGL2Supported() ? 'WebGL 2' : 'WebGL 1',
    GLSLVersion: isWebGL2Supported() ? 'GLSL 3' : 'GLSL 1',
    canvasZoom: 1,
    TOUCH_FORCE_SCALE: 2,
    PARTICLE_DENSITY: 0.1,
    MAX_NUM_PARTICLES: 100000,
    PARTICLE_LIFETIME: 1000,
    MAX_VELOCITY: 30,
    backgroundColor: { r: 0.98, g: 0.922, b: 0.843 },
    particleColor: { r: 0, g: 0, b: 0.2 },
  };
  const availableWebGLVersions = { webgl1: 'WebGL 1' };
  const availableGLSLVersions = { glsl1: 'GLSL 1' };
  if (isWebGL2Supported()) {
    availableWebGLVersions.webgl2 = 'WebGL 2';
    availableGLSLVersions.glsl3 = 'GLSL 3';
  }

  // Global variables to get from example app.
  let loop, dispose, composer, canvas;
  // Other global ui variables.
  let title = webGLSettings.webGLVersion;
  // let useGLSL3Toggle;

  function reloadExampleWithNewParams() {
    // if (useGLSL3Toggle) {
    //   useGLSL3Toggle.dispose();
    //   useGLSL3Toggle = undefined;
    // }
    if (canvas) {
      canvas.addEventListener('gesturestart', disableZoom);
      canvas.addEventListener('gesturechange', disableZoom);
      canvas.addEventListener('gestureend', disableZoom);
    }
    if (webGLSettings.webGLVersion === 'WebGL 1') webGLSettings.GLSLVersion = 'GLSL 1';
    if (dispose) dispose();
    ({ loop, composer, dispose, canvas } = main({
      pane,
      contextID: webGLSettings.webGLVersion === 'WebGL 2' ? WEBGL2 : WEBGL1,
      glslVersion: webGLSettings.GLSLVersion === 'GLSL 3' ? GLSL3 : GLSL1,
      canvasZoom: webGLSettings.canvasZoom,
      PARTICLE_LIFETIME: Math.ceil(webGLSettings.PARTICLE_LIFETIME),
      // Scaling factor for touch interactions.
      TOUCH_FORCE_SCALE: Math.ceil(webGLSettings.TOUCH_FORCE_SCALE * webGLSettings.canvasZoom),
      // Approx avg num particles per px.
      PARTICLE_DENSITY: webGLSettings.PARTICLE_DENSITY * webGLSettings.canvasZoom,
      MAX_NUM_PARTICLES: Math.ceil(webGLSettings.MAX_NUM_PARTICLES * webGLSettings.canvasZoom),
      // Put a speed limit on velocity, otherwise touch interactions get out of control.
      MAX_VELOCITY: Math.ceil(webGLSettings.MAX_VELOCITY * webGLSettings.canvasZoom),
      backgroundColor: webGLSettings.backgroundColor,
      particleColor: webGLSettings.particleColor,
    }));
    canvas.addEventListener('gesturestart', disableZoom);
    canvas.addEventListener('gesturechange', disableZoom);
    canvas.addEventListener('gestureend', disableZoom);

    // useGLSL3Toggle = settings.addInput(
    //   webGLSettings,
    //   'GLSLVersion',
    //   {
    //     options: webGLSettings.webGLVersion === 'WebGL 2' ? availableGLSLVersions : { glsl1: 'GLSL 1' },
    //     label: 'GLSL Version',
    //   }).on('change', () => {
    //     // Some weird issue with calling dispose() inside change callback is throwing error in Tweakpane.
    //     // Use timeout to fix it.
    //     setTimeout(reloadExampleWithNewParams, 10);
    //   });

    title = `${webGLSettings.webGLVersion}`;
    settings.title = title;

    CanvasCapture.dispose();
    CanvasCapture.init(canvas, { showRecDot: true, showDialogs: true, showAlerts: true, recDotCSS: { left: '0', right: 'auto' } });
    CanvasCapture.bindKeyToVideoRecord('v', {
      format: CanvasCapture.WEBM,
      name: 'screen_recording',
      fps: RECORD_FPS,
      quality: 1,
    });
  }

  // Add some settings to gui.
  const settings = pane.addFolder({
    title,
    expanded: true,
  });
  settings.addInput(
    webGLSettings,
    'canvasZoom',
    {
      min: 0.5,
      max: 3,
      step: 0.25,
      label: 'Canvas scale',
      format: (v) => `${v}x`,
    }).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'PARTICLE_LIFETIME'
  ).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'TOUCH_FORCE_SCALE'
  ).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'PARTICLE_DENSITY'
  ).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'MAX_NUM_PARTICLES'
  ).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'MAX_VELOCITY'
  ).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'backgroundColor',
    {
      color: { type: 'float' },
    }
  ).on('change', reloadExampleWithNewParams);

  settings.addInput(
    webGLSettings,
    'particleColor',
    {
      color: { type: 'float' },
    }
  ).on('change', reloadExampleWithNewParams);

  // settings.addInput(webGLSettings, 'webGLVersion', {
  //   options: availableWebGLVersions,
  //   label: 'WebGL Version',
  // }).on('change', reloadExampleWithNewParams);

  // Add info modal.
  const modalOptions = {
    showModal: () => {
      // Show/hide overlay, otherwise clicks are passing through due to fixed/abs positioning of modal.
      MicroModal.show('modal-1', { onClose: () => { setTimeout(() => { overlay.style.display = 'none'; }, 500); } });
      overlay.style.display = 'block';
    },
    sourceCode: () => {
      document.getElementById('sourceCode').click();
    },
  }
  // pane.addButton({ title: 'About' }).on('click', modalOptions.showModal);
  // pane.addButton({ title: 'View Code' }).on('click', modalOptions.sourceCode);

  // Load example app.
  reloadExampleWithNewParams();

  // Disable gestures.
  function disableZoom(e) {
    e.preventDefault();
    const scale = 'scale(1)';
    // @ts-ignore
    document.body.style.webkitTransform = scale;    // Chrome, Opera, Safari
    // @ts-ignore
    document.body.style.msTransform = scale;       // IE 9
    document.body.style.transform = scale;
  }

  let numFrames = 0;

  function outerLoop() {
    // Update fps counter.
    const { fps, numTicks } = composer.tick();
    if (numTicks % 10 === 0) {
      settings.title = `${title} (${fps.toFixed(1)} FPS)`;
    }
    window.requestAnimationFrame(outerLoop);
    // Run example loop.
    if (loop) loop();

    // Screen recording.
    CanvasCapture.checkHotkeys();
    if (CanvasCapture.isRecording()) {
      CanvasCapture.recordFrame();
      numFrames++;
      console.log(`Recording duration: ${(numFrames / RECORD_FPS).toFixed(2)} sec`);
    } else {
      numFrames = 0;
    }
  }
  // Start loop.
  outerLoop();
}