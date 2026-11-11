// Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Three.js Extensions
import SlippyMapGlobe from 'https://esm.sh/three-slippy-map-globe?external=three';
import { Text } from "https://esm.sh/troika-three-text?external=three";

// Local library
import * as TravelPhotographyLibrary from "../photography.js"

//region Scene Settings
const PARAM_SETTINGS = new URLSearchParams(window.location.search);
const START_LOCATION = "Marion"
const EARTH_RADIUS = 6.3781 * 2;
const FOCUS_NORMAL_OFFSET = EARTH_RADIUS * 2;
const FOCUS_TAN_OFFSET = EARTH_RADIUS * 1;
const PIN_COLORS = [
    0xff0000,
    0xffff00,
    0xff00ff,
    0x00ffff,
    0x0000ff
];

//endregion

//region Scene Creation

// Renderer
export const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.getElementById('3d').appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 1));
scene.add(new THREE.DirectionalLight(0xffffff, 0.9 * Math.PI));

// Camera
const camera = new THREE.PerspectiveCamera();
camera.aspect = window.innerWidth/window.innerHeight;
camera.near = 1e-3;
camera.far = EARTH_RADIUS * 10;
camera.updateProjectionMatrix();

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = EARTH_RADIUS/2;
controls.minDistance = EARTH_RADIUS/40;
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.3;
controls.zoomSpeed = 1.25;
controls.panSpeed = 1;
controls.target.set(0, 0, EARTH_RADIUS);
camera.position.set(0, 0, EARTH_RADIUS*2);
camera.lookAt(controls.target);
controls.update();

// Post-processing
export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
);
outlinePass.edgeStrength = 5;
outlinePass.edgeGlow = 1;
outlinePass.edgeThickness = 2;
outlinePass.pulsePeriod = 0;
outlinePass.visibleEdgeColor.set(0xfff176);
outlinePass.hiddenEdgeColor.set(0x5c4a18);
composer.addPass(outlinePass);
composer.addPass(new OutputPass());

// Earth
export const earth = new SlippyMapGlobe(EARTH_RADIUS, {
  tileUrl: (X, Y, Z) => {
    switch (PARAM_SETTINGS.get("style")) {
        case "usgs": return `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/${Z}/${Y}/${X}`
        case "elev": return `http://a.tile.opentopomap.org/${Z}/${X}/${Y}.png`
        case "sat": return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${Y}/${X}.jpg`
        case "night": return `http://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default//GoogleMapsCompatible_Level8/${Z}/${Y}/${X}.jpg`
        case "topo": return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${Z}/${Y}/${X}.jpg`
        case "natgeo": return `https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/${Z}/${Y}/${X}`
        default: return `https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/${Z}/${Y}/${X}`
    }
  },
  minLevel: 6,
  maxLevel: 11
});
scene.add(earth);

if (PARAM_SETTINGS.get("helpers") === "true")
{
    // Axis
    const xyzAxis = new THREE.AxesHelper(EARTH_RADIUS*2);
    earth.add(xyzAxis);

    // Widgets
    let xCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0xff0000 }));
    xCube.position.x = EARTH_RADIUS*2;
    xyzAxis.add(xCube);
    let yCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0x00ff00 }));
    yCube.position.y = EARTH_RADIUS*2;
    xyzAxis.add(yCube);
    let zCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0x0000ff }));
    zCube.position.z = EARTH_RADIUS*2;
    xyzAxis.add(zCube);

    // Polar Grid
    earth.add(new THREE.PolarGridHelper( EARTH_RADIUS*10, 4, 10, 32));
}

//endregion

//region Album ForEach
const sharedAlbums = await TravelPhotographyLibrary.getLocationAlbums();
const albumObjects = [];

let navMenu = []
for (const album of sharedAlbums) {

    function randomFromSeed(seed, min, max) {
        return ((seed) % (max - min)) + min;
    }

    if (!(Object.hasOwn(album, "lat") && Object.hasOwn(album, "lon")))
    {
        console.log(`Skipping ${album.slug}`)
        continue;
    }

    const modelLoader = new GLTFLoader();

    // Get position
    let pos = getPositionFromLatLon(
        album.lat * Math.PI / 180, 
        album.lon * Math.PI / 180, 
        EARTH_RADIUS
    );

    // Get rotation
    const surfaceNormal = pos.clone().sub(earth.getWorldPosition(new THREE.Vector3())).normalize();
    let rot = new THREE.Euler(
        Math.asin(surfaceNormal.y), 
        Math.atan2(surfaceNormal.x, surfaceNormal.z), 
        0, 
        'YXZ'
    );

    // Helper
    if (PARAM_SETTINGS.get("helpers") === "true")
    {
        let h = new THREE.AxesHelper(0.1);
        scene.add(h);
        h.position.set(pos.x, pos.y, pos.z);
        h.setRotationFromEuler(rot);
    }

    //region Create Pin

    // Load model
    let pinObject = null;
    try {
        const pinModel = await modelLoader.loadAsync('src/glb/pin.glb');
        pinObject = pinModel.scene;
    } catch (error) {
        console.error('Error loading pin model:', error);
    }
    
    // Set pin color
    pinObject.traverse((child) => {
        if (!child.isMesh) return;
        if (child.material.name === "color") {
            child.material.color.set(PIN_COLORS[randomFromSeed(album.photoCount, 0, PIN_COLORS.length - 1)]);
            child.material.needsUpdate = true; 
        }
    });
    
    // Place pin
    pinObject.name = album.slug
    pinObject.position.set(pos.x, pos.y, pos.z);
    pinObject.setRotationFromEuler(rot);
    pinObject.rotateOnAxis(
        new THREE.Vector3().randomDirection(),
        THREE.MathUtils.degToRad((Math.random() - 0.5) * 20)
    );
    albumObjects.push(pinObject)
    earth.add(pinObject);

    //endregion 

    //region Create Polaroid

    let polaroidObject = null

    try {
        const polaroidModel = await modelLoader.loadAsync('src/glb/polaroid.glb');
        polaroidObject = polaroidModel.scene;
    } catch (error) {
        console.error('Error loading polaroid model:', error);
    }

    polaroidObject.traverse((child) => {
        if (child.isMesh && child.material.name === "image") {
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(album.image, (loadedTexture) => {
                const image = loadedTexture.image;
                child.userData.imageWidth = image.naturalWidth || image.width;
                child.userData.imageHeight = image.naturalHeight || image.height;
                loadedTexture.flipY = false;
                adjustTextureAspect(loadedTexture, 'cover');
            });
            
            child.material = new THREE.MeshBasicMaterial({ map: texture });
            child.material.needsUpdate = true; 
        }
    });
    pinObject.add(polaroidObject);
    polaroidObject.userData.metadata = album
    polaroidObject.position.y = 0.02 + (Math.random() * 0.01);
    polaroidObject.position.z = 0.035;
    polaroidObject.rotation.y = THREE.MathUtils.degToRad((Math.random()-0.5) * 5);
    polaroidObject.rotation.x += THREE.MathUtils.degToRad(5);
    //endregion

    //region Add Writing
    let text = new Text();
    text.text = album.name
    text.font = "./src/ttf/rock-salt-v24-latin-regular.ttf"
    text.maxWidth = 0.07;
    text.lineHeight = 1
    text.letterSpacing = -0.05
    polaroidObject.add(text);
    text.textAlign = "center"
    text.anchorX = "center";
    text.anchorY = "top";
    text.name = "writing";
    text.color = 0x00;
    text.position.set(0, 1e-4, 0.03);
    text.rotation.x -= Math.PI/2;
    text.fontSize = 5.5e-3;
    text.sync()
    
    //endregion
    
    // Setup pin and actions
    album.pin = pinObject;
    if (album.name.includes(START_LOCATION)) {
        focusAlbumLocation(pinObject);
    }

    //region Create Menu Obj

    let newElementItem = {
        name: album.name,
        link: album.hyperlink
    }
    if (navMenu.some(e => e.name === album.country)) {
        let thisCountyIndex = navMenu.findIndex(e => e.name === album.country)
        if (navMenu[thisCountyIndex].value.some(e => e.name === album.state)) {
            let thisRegionIndex = navMenu[0].value.findIndex(e => e.name === album.state)
            navMenu[thisCountyIndex].value[thisRegionIndex].value.push(newElementItem)
        }
        else {
            let newRegionElement = {
                name: album.state,
                value: []
            }
            newRegionElement.value.push(newElementItem)
            navMenu[thisCountyIndex].value.push(newRegionElement)
        }
    }
    else {
        let newCountryElement = {
            name: album.country,
            value: []
        }
        let newRegionElement = {
            name: album.state,
            value: []
        }
        newRegionElement.value.push(newElementItem)
        newCountryElement.value.push(newRegionElement)
        navMenu.push(newCountryElement)
    }

    //endregion
}

//endregion

//region Create HTML Menu

// And sort the country and regions when they are iterated
const $navElement = $("nav#menu");
navMenu.toSorted((a, b) => {
  if (a.name == null) return 1;
  if (b.name == null) return -1;
  return a.name.localeCompare(b.name);
}).forEach(country => {
    $("<p>")
        .addClass("country-header")
        .text(country.name)
        .appendTo($navElement);

    country.value.toSorted((a, b) => {
            if (a.name == null) return 1;
            if (b.name == null) return -1;
            return a.name.localeCompare(b.name);
        }).forEach(region => {
        $("<p>")
            .addClass("region-header")
            .text(region.name)
            .appendTo($navElement);

        region.value.toSorted((a, b) => {
            if (a.name == null) return 1;
            if (b.name == null) return -1;
            return a.name.localeCompare(b.name);
        }).forEach(album => {
            $("<a>")
                .addClass("album-item")
                .attr({
                    target: "_blank",
                    rel: "noopener noreferrer"
                })
                .text(album.name)
                .on("click", () => {
                    const location = sharedAlbums.find(loc => loc.name === album.name);
                    if (location) focusAlbumLocation(location.pin);
                })
                .appendTo($navElement);
        })
    })
})

//endregion

//region Create City Markers

//endregion

//region Helper Functions

function getPositionFromLatLon(lat, lon, radius) {
    return new THREE.Vector3(
        radius * Math.cos(lat) * Math.sin(lon), 
        radius * Math.sin(lat), 
        radius * Math.cos(lat) * Math.cos(lon)
    );
}

function focusAlbumLocation(pin) {
    const targetPosition = pin.getWorldPosition(new THREE.Vector3());
    const globeCenter = earth.getWorldPosition(new THREE.Vector3());
    const surfaceNormal = targetPosition.clone().sub(globeCenter).normalize();
    const tangentDirection = camera.position.clone().sub(targetPosition).projectOnPlane(surfaceNormal);

    if (tangentDirection.lengthSq() < 1e-6) {
        tangentDirection.set(0, 1, 0).projectOnPlane(surfaceNormal);
        if (tangentDirection.lengthSq() < 1e-6) {
            tangentDirection.set(1, 0, 0).projectOnPlane(surfaceNormal);
        }
    }
    tangentDirection.normalize();

    controls.target.copy(targetPosition);
    const cameraOffset = surfaceNormal.clone().multiplyScalar(FOCUS_NORMAL_OFFSET)
        .addScaledVector(tangentDirection, FOCUS_TAN_OFFSET)
        .setLength(controls.minDistance*2);
    camera.position.copy(targetPosition).add(cameraOffset);
    camera.lookAt(targetPosition);
    controls.update();
    earth.updatePov(camera);
}

function adjustTextureAspect(texture, fitType = 'cover') {
    const image = texture.image;
    const imageWidth = image?.naturalWidth || image?.width;
    const imageHeight = image?.naturalHeight || image?.height;
    if (!imageWidth || !imageHeight) return;

  // 1. Enable wrapping so the offset/repeat calculations work correctly
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // 2. Calculate aspect ratios
    const imageAspect = imageWidth / imageHeight;

    if (imageAspect > 1) {
            texture.repeat.set(1 / imageAspect, 1);
            texture.offset.set((1 - (1 / imageAspect)) / 2, 0);
    } else {
            texture.repeat.set(1, imageAspect);
            texture.offset.set(0, (1 - imageAspect) / 2);
    }
}

//region Events

function animate() {
    controls.update(); 
    composer.render();
}
renderer.setAnimationLoop(animate);

// Update pov when camera moves
earth.updatePov(camera);
controls.addEventListener('change', () => {
    earth.updatePov(camera);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointermove', (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hoveringPolaroid = raycaster.intersectObjects(albumObjects, true)
        .some(obj => obj.object.parent.name.includes("polaroid"));
    renderer.domElement.style.cursor = hoveringPolaroid ? 'pointer' : 'auto';
});

renderer.domElement.addEventListener('dblclick', (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    let selectedObjects = raycaster.intersectObjects(albumObjects, true).filter(obj => obj.object.parent.name.includes("polaroid"))

    if (selectedObjects.length > 0) {
        try {
            console.log(selectedObjects)
            const thisPolaroid = selectedObjects[0].object.parent.parent
            console.log(thisPolaroid)
            window.open(thisPolaroid.userData.metadata.hyperlink, '_blank');
        } 
        catch (error) {
            console.error(error.message)
        }
    }
});

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    controls.update(); 
}

//endregion