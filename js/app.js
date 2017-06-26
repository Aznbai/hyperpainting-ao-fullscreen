if (!Detector.webgl) Detector.addGetWebGLMessage();
var groupA = new THREE.Group();
var groupB = new THREE.Group();
var container;
// var stats = new Stats();
var gui = new dat.GUI();
var renderer = new THREE.WebGLRenderer({
  antialias: false
});
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 100, 700);
var scene = new THREE.Scene();
var manager = new THREE.LoadingManager();
var depthMaterial, effectComposer, depthRenderTarget;
var ssaoPass;
var depthScale = 1.0;
var hyperMeshA;
var hyperMeshB;
var postprocessing = {
  enabled: true,
  renderMode: 0
};
init();
animate();

function init() {
  container = document.createElement('div');
  document.body.appendChild(container);
  renderer.setClearColor(0xa0a0a0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  // camera.position.x = 500;
  // camera.position.y = -500;
  camera.position.z = 500;
  manager.onProgress = function(item, loaded, total) {
    console.log(item, loaded, total);
  };
  hyperMaterialA = new THREE.MeshBasicMaterial({
    // map: null,
    color: 0x0ff055,
    // metalness: 0.5,
    // roughness: 10,
    opacity: 0.5,
    transparent: true,
    shading: THREE.SmoothShading,
    premultipliedAlpha: false
      // wireframe: true,
      // wireframeLinewidth: 5,
      // aoMapIntensity: 10,
  });
  hyperMaterialB = new THREE.MeshBasicMaterial({
    // map: null,
    color: 0x0ff055,
    // metalness: 0.5,
    // roughness: 10,
    opacity: 0.5,
    transparent: true,
    shading: THREE.SmoothShading,
    premultipliedAlpha: false
      // wireframe: true,
      // wireframeLinewidth: 5,
      // aoMapIntensity: 10,
  });
  var loader = new THREE.OBJLoader(manager);
  loader.load('objects/micro/3.obj', function(object) {
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.material = hyperMaterialA;
        hyperMeshA = child.clone();
        // hyperMeshA.geometry.scale(0.2);        
        // hyperMeshA.material = new THREE.MeshBasicMaterial();
        hyperMeshA.material.color.r = Math.random();
        hyperMeshA.material.color.g = Math.random();
        hyperMeshA.material.color.b = Math.random();
        groupA.add(hyperMeshA);
        groupA.add(child);
        scene.add(groupA);
        hyperMeshA.geometry = new THREE.Geometry().fromBufferGeometry(hyperMeshA.geometry);
        // objects.push(groupA);
      }
    });
  });
  loader.load('objects/micro/2.obj', function(object) {
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.material = hyperMaterialB;
        hyperMeshB = child.clone();
        // hyperMeshA.geometry.scale(0.2);        // hyperMeshA.material = new THREE.MeshBasicMaterial();
        hyperMeshB.material.color.r = Math.random();
        hyperMeshB.material.color.g = Math.random();
        hyperMeshB.material.color.b = Math.random();
        groupB.add(hyperMeshA);
        groupB.add(child);
        scene.add(groupB);
      }
    });
  });
  // container.appendChild(stats.dom);
  initPostprocessing();
  gui.add(postprocessing, "enabled").onChange();
  gui.add(postprocessing, "renderMode", {
    includeMaterial: 0,
    shadowsOnly: 1
  }).onChange(renderModeChange).listen();
  window.addEventListener('resize', onWindowResize, false);
}

function renderModeChange(value) {
  if (value == 0) {
    // includeMaterial
    ssaoPass.uniforms['onlyAO'].value = false;
  } else if (value == 1) {
    // shadowsOnly
    ssaoPass.uniforms['onlyAO'].value = true;
  } else {
    console.error("Not define renderModeChange type: " + value);
  }
}

function onWindowResize() {
  var width = window.innerWidth;
  var height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  // Resize renderTargets
  ssaoPass.uniforms['size'].value.set(width, height);
  var pixelRatio = renderer.getPixelRatio();
  var newWidth = Math.floor(width / pixelRatio) || 1;
  var newHeight = Math.floor(height / pixelRatio) || 1;
  depthRenderTarget.setSize(newWidth, newHeight);
  effectComposer.setSize(newWidth, newHeight);
}

function initPostprocessing() {
  // Setup render pass
  var renderPass = new THREE.RenderPass(scene, camera);
  // Setup depth pass
  depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.depthPacking = THREE.RGBADepthPacking;
  depthMaterial.blending = THREE.NoBlending;
  var pars = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  };
  depthRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, pars);
  // Setup SSAO pass
  ssaoPass = new THREE.ShaderPass(THREE.SSAOShader);
  ssaoPass.renderToScreen = true;
  //ssaoPass.uniforms[ "tDiffuse" ].value will be set by ShaderPass
  ssaoPass.uniforms["tDepth"].value = depthRenderTarget.texture;
  ssaoPass.uniforms['size'].value.set(window.innerWidth, window.innerHeight);
  ssaoPass.uniforms['cameraNear'].value = camera.near;
  ssaoPass.uniforms['cameraFar'].value = camera.far;
  ssaoPass.uniforms['onlyAO'].value = (postprocessing.renderMode == 1);
  ssaoPass.uniforms['aoClamp'].value = 0.7;
  ssaoPass.uniforms['lumInfluence'].value = 0.2;
  // Add pass to effect composer
  effectComposer = new THREE.EffectComposer(renderer);
  effectComposer.addPass(renderPass);
  effectComposer.addPass(ssaoPass);
}

function animate() {
  requestAnimationFrame(animate);
  // stats.begin();
  render();
  // stats.end();
}

function render() {
  var timer = performance.now();
  groupA.rotation.x = timer * 0.00001;
  groupA.rotation.y = -timer * 0.00002;
  groupB.rotation.x = -timer * 0.00002;
  groupB.rotation.y = timer * 0.00001;
  if (postprocessing.enabled) {
    // Render depth into depthRenderTarget
    scene.overrideMaterial = depthMaterial;
    renderer.render(scene, camera, depthRenderTarget, true);
    // Render renderPass and SSAO shaderPass
    scene.overrideMaterial = null;
    effectComposer.render();
  } else {
    renderer.render(scene, camera);
  }
}