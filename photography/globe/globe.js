// Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

// Three.js Extensions
import SlippyMapGlobe from 'https://esm.sh/three-slippy-map-globe?external=three';
import { Text } from "https://esm.sh/troika-three-text?external=three";

// Local library
import * as TravelPhotographyLibrary from "../photography.js"

//region Scene Settings
const PARAM_SETTINGS = new URLSearchParams(window.location.search);
const START_LOCATION = "Marion"
const EARTH_RADIUS = 6.3781 * 2;
const CAMERA_SURFACE_CLEARANCE = 0.05;
const FOCUS_NORMAL_OFFSET = EARTH_RADIUS * 2;
const FOCUS_TAN_OFFSET = EARTH_RADIUS * 1;
const PIN_COLORS = [
    0xee6055,
    0x60d394,
    0xaaf683,
    0xffd97d,
    0xff9b85
];

//endregion

//region Renderer/Camera

// Scene
const scene = new THREE.Scene();

// Renderer
export const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.getElementById('3d').appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera();
camera.aspect = window.innerWidth/window.innerHeight;
camera.near = 1e-3;
camera.far = EARTH_RADIUS * 3;
camera.updateProjectionMatrix();
scene.add(camera);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = EARTH_RADIUS * 1.5;
controls.minDistance = EARTH_RADIUS / 40;
controls.enableDamping = true;
controls.dampingFactor = 0.25;
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

//endregion

//region Earth
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
  minLevel: 0,
  maxLevel: 11
});
scene.add(earth);

//endregion

//region Camera Raycasting

const cameraCollisionRaycaster = new THREE.Raycaster();
const cameraCollisionOrigin = new THREE.Vector3();
const cameraCollisionDirection = new THREE.Vector3();
const cameraCollisionRayDirection = new THREE.Vector3();
const earthWorldPosition = new THREE.Vector3();

function keepCameraOutsideEarth() {
    earth.getWorldPosition(earthWorldPosition);
    cameraCollisionDirection.copy(camera.position).sub(earthWorldPosition);
    const cameraDistance = cameraCollisionDirection.length();
    if (cameraDistance < 1e-6) {
        cameraCollisionDirection.set(0, 0, 1);
    } else {
        cameraCollisionDirection.normalize();
    }

    cameraCollisionOrigin.copy(earthWorldPosition)
        .addScaledVector(cameraCollisionDirection, EARTH_RADIUS * 2);
    cameraCollisionRayDirection.copy(cameraCollisionDirection).negate();
    cameraCollisionRaycaster.set(cameraCollisionOrigin, cameraCollisionRayDirection);
    cameraCollisionRaycaster.far = EARTH_RADIUS * 4;

    const surfaceHit = cameraCollisionRaycaster.intersectObject(earth, false)[0];
    const surfaceRadius = surfaceHit
        ? surfaceHit.point.distanceTo(earthWorldPosition)
        : EARTH_RADIUS;
    const minimumCameraDistance = surfaceRadius + CAMERA_SURFACE_CLEARANCE;

    if (cameraDistance < minimumCameraDistance) {
        camera.position.copy(earthWorldPosition)
            .addScaledVector(cameraCollisionDirection, minimumCameraDistance);
        camera.lookAt(controls.target);
    }
}

//endregion

//region Lighting

scene.add(new THREE.AmbientLight( 0xdec06f ))
const sun1 = new THREE.DirectionalLight(0xffffff, 3.1);
const sun2 = new THREE.DirectionalLight(0xffffff, 1.1);
sun1.position.set(0, EARTH_RADIUS, 0);
sun2.position.set(0, -EARTH_RADIUS, 0);
sun1.target = earth
sun2.target = earth
scene.add(sun1);
scene.add(sun2);

//endregion

//region Helpers

if (PARAM_SETTINGS.get("helpers") === "true")
{
    // Axis
    const xyzAxis = new THREE.AxesHelper(EARTH_RADIUS*2);
    earth.add(xyzAxis);

    // Widgets
    const xCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0xff0000 }));
    xCube.position.x = EARTH_RADIUS*2;
    xyzAxis.add(xCube);
    const yCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0x00ff00 }));
    yCube.position.y = EARTH_RADIUS*2;
    xyzAxis.add(yCube);
    const zCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0x0000ff }));
    zCube.position.z = EARTH_RADIUS*2;
    xyzAxis.add(zCube);

    // Polar Grid
    earth.add(new THREE.PolarGridHelper( EARTH_RADIUS*10, 4, 10, 32));
}

//endregion

//region Load Models

const modelLoader = new GLTFLoader();
const modelFiles = [
    "src/glb/pin.glb",
    "src/glb/polaroid.glb",
    "src/glb/cluster-marker.glb",
    "src/glb/house-marker.glb",
    "src/glb/point-marker.glb",
    "src/glb/rectangle-marker.glb"
]
const models = { }
for (const model of modelFiles) {
    const filename = model.split(/(\\|\/)/).pop().split('.').shift();
    try {
        models[filename] = await modelLoader.loadAsync(model);
    } catch (error) {
        console.error('Error loading pin model:', error);
    }
};

function instantiateModel(model) {
    const instance = model.scene.clone(true);
    instance.traverse((child) => {
        if (!child.isMesh) return;
        child.material = Array.isArray(child.material)
            ? child.material.map((material) => material.clone())
            : child.material.clone();
    });
    return instance;
}

//endregion

//region Album ForEach
const sharedAlbums = await TravelPhotographyLibrary.getLocationAlbums();
const albumObjects = [];

const navMenu = []
for (const album of sharedAlbums) {

    function randomFromSeed(seed, min, max) {
        return ((seed) % (max - min)) + min;
    }

    if (!(Object.hasOwn(album, "lat") && Object.hasOwn(album, "lon")))
    {
        console.log(`Skipping ${album.slug}`)
        continue;
    }

    // Get position
    const pos = getPositionFromLatLon(album.lat, album.lon, EARTH_RADIUS);

    // Get rotation
    const surfaceNormal = pos.clone().sub(earth.getWorldPosition(new THREE.Vector3())).normalize();
    const rot = new THREE.Euler(
        Math.asin(surfaceNormal.y), 
        Math.atan2(surfaceNormal.x, surfaceNormal.z), 
        0, 
        'YXZ'
    );

    // Helper
    if (PARAM_SETTINGS.get("helpers") === "true")
    {
        const h = new THREE.AxesHelper(0.1);
        scene.add(h);
        h.position.set(pos.x, pos.y, pos.z);
        h.setRotationFromEuler(rot);
    }

    //region Create Pin

    const pinObject = instantiateModel(models["pin"]);
    
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
    
    const polaroidObject = instantiateModel(models["polaroid"]);

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
            
            child.material = new THREE.MeshLambertMaterial({ map: texture });
            child.material.needsUpdate = true; 
        }
    });
    pinObject.add(polaroidObject);
    polaroidObject.userData.metadata = album
    polaroidObject.position.y = 0.027 + (Math.random() * 0.002);
    polaroidObject.position.z = 0.035;
    polaroidObject.rotation.y = THREE.MathUtils.degToRad((Math.random()-0.5) * 5);
    polaroidObject.rotation.x += THREE.MathUtils.degToRad(5);
    //endregion

    //region Add Writing
    const text = new Text();
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

    const newElementItem = {
        name: album.name,
        link: album.hyperlink
    }
    if (navMenu.some(e => e.name === album.country)) {
        const thisCountyIndex = navMenu.findIndex(e => e.name === album.country)
        if (navMenu[thisCountyIndex].value.some(e => e.name === album.state)) {
            const thisRegionIndex = navMenu[0].value.findIndex(e => e.name === album.state)
            navMenu[thisCountyIndex].value[thisRegionIndex].value.push(newElementItem)
        }
        else {
            const newRegionElement = {
                name: album.state,
                value: []
            }
            newRegionElement.value.push(newElementItem)
            navMenu[thisCountyIndex].value.push(newRegionElement)
        }
    }
    else {
        const newCountryElement = {
            name: album.country,
            value: []
        }
        const newRegionElement = {
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

if (PARAM_SETTINGS.get("cities") === "true") {
    const CITY_MODEL_SCALE = 0.005
    const cities = await TravelPhotographyLibrary.getVisitedCities()
    if (cities) {
        for (const city of cities) {
            let modelName;
            switch (city.category_id) {
                case 1: // City
                    modelName = "cluster-marker"
                    break;
                default: // CDP
                    modelName = "point-marker"
                    break;
            }

            const marker = instantiateModel(models[modelName]);

            const visitColor = (() => {
                switch (city.visited_id) {
                    case 1: return 0xd93232;
                    case 2: return 0x74a120;
                    case 3: return 0x9cd932;
                    case 4: return 0x6ad932;
                    case 5: return 0x4ba120;
                    default: return 0xffffff;
                }
            })();

            // Change color
            marker.traverse((child) => {
                if (!child.isMesh) return;
                if (child.material.name === "steel") {
                    child.material.color.set(visitColor);
                    // child.material.roughness = 1;
                    child.material.needsUpdate = true; 
                }
            });

            // Get position
            const pos = getPositionFromLatLon(
                city.geojson.coordinates[0][1], 
                city.geojson.coordinates[0][0], 
                EARTH_RADIUS
            );

            // Get rotation
            const surfaceNormal = pos.clone().sub(earth.getWorldPosition(new THREE.Vector3())).normalize();
            const rot = new THREE.Euler(
                Math.asin(surfaceNormal.y), 
                Math.atan2(surfaceNormal.x, surfaceNormal.z), 
                0, 
                'YXZ'
            );

            // Helper
            if (PARAM_SETTINGS.get("helpers") === "true")
            {
                const h = new THREE.AxesHelper(0.01);
                scene.add(h);
                h.position.set(pos.x, pos.y, pos.z);
                h.setRotationFromEuler(rot);
            }
            
            // Place marker
            marker.name = city.city
            marker.scale.set(CITY_MODEL_SCALE, CITY_MODEL_SCALE, CITY_MODEL_SCALE)
            marker.position.set(pos.x, pos.y, pos.z);
            marker.setRotationFromEuler(rot);
            marker.rotateY(Math.random() * Math.PI * 2);
            earth.add(marker);
        }
    }
    else {
        console.warn("Failed to GET from city database")
    }
}

//endregion

//region Helper Functions

function getPositionFromLatLon(lat, lon, radius) {
    const latitude = THREE.MathUtils.degToRad(lat);
    const longitude = THREE.MathUtils.degToRad(lon);
    const radiusAtLatitude = radius * Math.cos(latitude);

    return new THREE.Vector3(
        radiusAtLatitude * Math.sin(longitude),
        radius * Math.sin(latitude),
        radiusAtLatitude * Math.cos(longitude)
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

if (renderer.getContext() instanceof WebGL2RenderingContext && PARAM_SETTINGS.get("antialias") === "true") {
    composer.renderTarget1.samples = 8;
    composer.renderTarget2.samples = 8;
}

// Update pov when camera moves
earth.updatePov(camera);
controls.addEventListener('change', () => {
    keepCameraOutsideEarth();
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
    const selectedObjects = raycaster.intersectObjects(albumObjects, true).filter(obj => obj.object.parent.name.includes("polaroid"))

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