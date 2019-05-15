/*jslint white: true */
"use strict";

/*
    GUIData class
        - used to store and update changes to the params through the gui 
*/
class GUIData {

    constructor(){

        /* Terrain Details */
        this.terrainSize = 2048;            // must be power of 2
        this.terrainDetail = 6;
        this.terrainRoughness = 0.8;
        this.hillFactor =  10;

        /* Texture Heights */
        this.sandPercent = 25;
        this.grassPercent = 25;
        this.mountainPercent = 25;
        this.snowPercent = 25;

        /* Water */
        this.waterHeightPercent = 20;
        this.waterAlpha = 0.35;

        /* Blend */
        this.blendPercent = 10;

        /* Light */
        this.shininess = 230;
        this.lightDirectionX = -1;
        this.lightDirectionY = -1;
        this.lightDirectionZ = -2;

        this.lightAmbient = 0.003;
        this.lightDiffuse = 1;
        this.lightSpecular = 0.2;
        this.materialAmbient = 1;
        this.materialSpecular = 0.2;
    }
};


/* 
    Texture Detail Class
        - used to store texture height percentages and compute thresholds and blend levels
        based on GUI Percentages and min and max height of generated terrain
*/
class TextureDetail {

    constructor(sandPercent, grassPercent, mountainPercent, snowPercent){
        this.sandPercent = sandPercent;
        this.grassPercent = grassPercent;
        this.mountainPercent = mountainPercent;
        this.snowPercent = snowPercent;
    }

    setHeightValues(minHeight, maxHeight){
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
        this.range = maxHeight - minHeight;
    }

    getSandThreshold(){
        this.sandThreshold = this.minHeight + (this.range * this.sandPercent / 100);
        return this.sandThreshold;
    }

    getGrassThreshold(){
        this.grassThreshold = this.sandThreshold + (this.range * this.grassPercent / 100);
        return this.grassThreshold;
    }

    getMountainThreshold(){
        this.mountainThreshold = this.grassThreshold + (this.range * this.mountainPercent / 100);
        return this.mountainThreshold;
    }

    getBlendOffset(blendPercent){
        return this.range * blendPercent / 100;
    }
}

/* 
    World Builder Class 
*/
class WorldBuilder {

    // scene, camera, renderer, mesh, controls, width, height, aspect, guiData, gui

    constructor(){
        this.start = Date.now();

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspect = this.width / this.height;

        this.geometryWireframe = this.waterWireframe = false;

        this.backgroundColor = 0xcee9ef;    // TODO add as param

        this.initTextures();
        this.initShaders();
        this.initGUI();
        this.initScene(); 
        //this.initStats();
        
        this.generate();
        this.render();
    }
    
    
    initGUI(){

        this.gui = new dat.GUI();

        /* Default values */
        this.guiData = new GUIData();    
        this.textureDetails = new TextureDetail(this.guiData.sandPercent, this.guiData.grassPercent, this.guiData.mountainPercent, this.guiData.snowPercent);

        /* GUI Folder - Terrain Details */
        let geometryFolder = this.gui.addFolder('Terrain Geometry');
        geometryFolder.add(this.guiData, "terrainDetail", 1, 8).step(1).name("Detail");
        geometryFolder.add(this.guiData, "terrainRoughness", 0, 1).name("Roughness");
        geometryFolder.add(this.guiData, "hillFactor", 1, 25).name("Hill Factor");
        geometryFolder.add(this, "enableGeometryWireframe").name("Wireframe");
        geometryFolder.open();

        /* GUI Folder - Texture Heights */
        let textureFolder = this.gui.addFolder('Texture  Heights');

        // Snow Percentage 
        textureFolder.add(this.guiData, "snowPercent").min(0).max(100).name("Snow Percentage").listen().onChange((value)=>{
            if(value == 0 && this.textureDetails.snowPercent == 0 || (value == 100 && this.textureDetails.snowPercent == 100)){
                return;
            }
            const diff = (this.textureDetails.snowPercent - value) / 3;
            this.textureDetails.snowPercent = value;   
            this.guiData.sandPercent = this.textureDetails.sandPercent = clamp(0, 100, this.guiData.sandPercent + diff);
            this.guiData.grassPercent = this.textureDetails.grassPercent = clamp(0,100, this.guiData.grassPercent + diff);
            this.guiData.mountainPercent = this.textureDetails.mountainPercent = clamp(0, 100, this.guiData.mountainPercent + diff);  
            this.repaint();  
        });

        // Mountain Percentage 
        textureFolder.add(this.guiData, "mountainPercent").min(0).max(100).name("Mountain Percentage").listen().onChange((value)=>{
            if(value == 0 && this.textureDetails.mountainPercent == 0 || (value == 100 && this.textureDetails.mountainPercent == 100)){
                return;
            }
            const diff = (this.textureDetails.mountainPercent - value) / 3;
            this.textureDetails.mountainPercent = value;   
            this.guiData.sandPercent = this.textureDetails.sandPercent = clamp(0, 100, this.guiData.sandPercent + diff);
            this.guiData.grassPercent = this.textureDetails.grassPercent = clamp(0,100, this.guiData.grassPercent + diff);
            this.guiData.snowPercent = this.textureDetails.snowPercent = clamp(0, 100, this.guiData.snowPercent + diff);  
            this.repaint();  
        });

        // Grass Percentage 
        textureFolder.add(this.guiData, "grassPercent").min(0).max(100).name("Grass Percentage").listen().onChange((value)=>{
            if(value == 0 && this.textureDetails.grassPercent == 0 || (value == 100 && this.textureDetails.grassPercent == 100)){
                return;
            }
            const diff = (this.textureDetails.grassPercent - value) / 3;
            this.textureDetails.grassPercent = value;   
            this.guiData.sandPercent = this.textureDetails.sandPercent = clamp(0, 100, this.guiData.sandPercent + diff);
            this.guiData.mountainPercent = this.textureDetails.mountainPercent = clamp(0,100, this.guiData.mountainPercent + diff);
            this.guiData.snowPercent = this.textureDetails.snowPercent = clamp(0, 100, this.guiData.snowPercent + diff);   
            this.repaint(); 
        });
        
        // Sand Percentage
        textureFolder.add(this.guiData, "sandPercent").step(1).min(0).max(100).name("Sand Percentage").listen().onChange((value)=>{
            if(value == 0 && this.textureDetails.sandPercent == 0 || (value == 100 && this.textureDetails.sandPercent == 100)){
                return;
            }
            const diff = (this.textureDetails.sandPercent - value) / 3;
            this.textureDetails.sandPercent = value; 
            this.guiData.grassPercent = this.textureDetails.grassPercent = clamp(0, 100, this.guiData.grassPercent + diff);
            this.guiData.mountainPercent = this.textureDetails.mountainPercent = clamp(0,100, this.guiData.mountainPercent + diff);
            this.guiData.snowPercent = this.textureDetails.snowPercent = clamp(0, 100, this.guiData.snowPercent + diff);
            this.repaint();
        }); 

        /* GUI Folder - Texture Blend */
        let blendFolder = this.gui.addFolder("Blend");
        blendFolder.add(this.guiData, "blendPercent").min(0).max(50).name("Blend Percentage").onChange((value) =>{
            this.geometry_material.uniforms['blend_offset'].value = this.textureDetails.getBlendOffset(value);
        });
        
        /* GUI Folder - Water */
        let waterFolder = this.gui.addFolder('Water');
        waterFolder.add(this.guiData, 'waterHeightPercent').min(0).max(100).name("Water Height Percentage");
        waterFolder.add(this.guiData, "waterAlpha").step(0.01).min(0).max(1).name("Water Alpha");
        waterFolder.add(this, "enableWaterWireframe").name("Wireframe");

        blendFolder.open();
        textureFolder.open();
        waterFolder.open();

        /* GUI Folder - Light */
        let lightFolder = this.gui.addFolder('Light');
        lightFolder.add(this.guiData, 'shininess').min(0).max(500).name("Shininess").onChange( (value) =>{
            this.geometry_material.uniforms['shininess'].value = value;
        });
        
        //lightFolder.add(this.guiData, 'lightDiffuse') TODO set up as color

        lightFolder.add(this.guiData, 'lightAmbient').min(0).max(1).step(0.01).name("Light Ambient").onChange( (value) =>{
            this.changeUniform('light_ambient', value);
          //this.geometry_material.uniforms['light_ambient'].value = new THREE.Vector4(1.0, 1.0, 1.0, 1.0).multiplyScalar(value);
        });
        lightFolder.add(this.guiData, 'lightSpecular').min(0).max(1).step(0.01).name("Light Specular").onChange( (value) =>{
            this.changeUniform('light_specular', value);
        });
        lightFolder.add(this.guiData, 'materialAmbient').min(0).max(1).step(0.01).name("Material Ambient").onChange( (value) =>{
            this.changeUniform('material_ambient', value);
        });
        lightFolder.add(this.guiData, 'materialSpecular').min(0).max(1).step(0.01).name("Material Specular").onChange( (value) =>{
            this.changeUniform('material_specular', value);
        });

        // GUI Sub-folder Light Direction
        let lightDirectionFolder = lightFolder.addFolder('Light Source')
        lightDirectionFolder.add(this.guiData, 'lightDirectionX').name('X Coord').min(-10).max(10).onChange( (value) =>{
            this.geometry_material.uniforms['light_direction'].value = new THREE.Vector4(value, this.guiData.lightDirectionY, this.guiData.lightDirectionZ);
        });
        lightDirectionFolder.add(this.guiData, 'lightDirectionY').name('Y Coord').min(-10).max(10).onChange( (value) =>{
            this.geometry_material.uniforms['light_direction'].value = new THREE.Vector4(this.guiData.lightDirectionX, value, this.guiData.lightDirectionZ);
        });
        lightDirectionFolder.add(this.guiData, 'lightDirectionZ').name('Z Coord').min(-5).max(1).onChange( (value) =>{
            this.geometry_material.uniforms['light_direction'].value = new THREE.Vector4(this.guiData.lightDirectionX, this.guiData.lightDirectionY, value);
        });

        this.gui.add(this, "regenerate").name("Regenerate");
    }


    initScene(){
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(50, this.aspect, 1, 6000);
        this.camera.position.set(2000, 1000, 2000);
        this.camera.up = new THREE.Vector3(0, 0, 1);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(this.backgroundColor, 1.0);
        this.renderer.setSize(this.width, this.height);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    }


    initShaders(){
        this.vShader = document.getElementById('vertexShader').textContent;
        this.fShader = document.getElementById('fragmentShader').textContent;

        this.waterVShader = document.getElementById('waterVertexShader').textContent;
        this.waterFShader = document.getElementById('waterFragmentShader').textContent;
    }


    initTextures(){
        const loader =  new THREE.TextureLoader();

        /* Sand Texture */
        this.sandTexture = loader.load("textures/sand.jpg");
        this.sandTexture.wrapS = THREE.RepeatWrapping;
        this.sandTexture.wrapT = THREE.RepeatWrapping;
    
        /* Grass Texture */
        this.grassTexture = loader.load("textures/grass.png");
        this.grassTexture.wrapS = THREE.RepeatWrapping;
        this.grassTexture.wrapT = THREE.RepeatWrapping;

        /* Ground Texture */
        this.groundTexture = loader.load("textures/ground.jpg");
        this.groundTexture.wrapS = THREE.RepeatWrapping;
        this.groundTexture.wrapT = THREE.RepeatWrapping;
        //this.groundTexture.set(4, 4);

        /* Snow Texture */
        this.snowTexture = loader.load("textures/snow.jpg");
        this.snowTexture.wrapS = THREE.RepeatWrapping;
        this.snowTexture.wrapT = THREE.RepeatWrapping;

        /* Water Texture */
        this.waterTexture = loader.load("textures/water.jpg");
        this.waterTexture.wrapS = THREE.RepeatWrapping;
        this.waterTexture.wrapT = THREE.RepeatWrapping;
    }

    /* Init Stats [Commented out] */
    initStats(){
        this.rendererStats = new THREEx.RendererStats();
        this.rendererStats.domElement.style.position = 'absolute';
        this.rendererStats.domElement.style.left = '0px';
        this.rendererStats.domElement.style.bottom = '0px';
        document.body.appendChild(this.rendererStats.domElement);
    }


    render(){
        requestAnimationFrame(() => {this.render()});
        this.controls.update();
        this.waterMaterial.uniforms['time'].value = .00025 * (Date.now()-this.start);
        //this.rendererStats.update(this.renderer);
        this.renderer.render(this.scene, this.camera);
    }


    generate(){
        this.scene.remove(this.mesh);

        const dim = Math.pow(2, this.guiData.terrainDetail) + 1;
        
        /* Generate terrain geometry */
        const terrainGenerator = new FractalTerrainGenerator(dim);
        const terrainData = terrainGenerator.generate(this.guiData.terrainRoughness);

        let minHeight = Infinity;
        let maxHeight = -Infinity;

        this.terrain_geometry = new THREE.PlaneGeometry(this.guiData.terrainSize, this.guiData.terrainSize, dim - 1, dim - 1);
       
        for( let x = 0; x < dim; x++){
            for(let y = 0; y < dim; y++){
                let i = x * dim + y;
                let height =  terrainData[x][y].z * this.guiData.hillFactor;
                this.terrain_geometry.vertices[i].z = height;

                if(height < minHeight) { minHeight = height; }
                if(height > maxHeight) { maxHeight = height; }
            }
        }

        this.terrain_geometry.computeFaceNormals();
        this.terrain_geometry.computeVertexNormals();
        let material = this.generateMaterial(this.vShader, this.fShader, minHeight, maxHeight);
        this.mesh = new THREE.Mesh(this.terrain_geometry, material);
        this.scene.add(this.mesh);

        this.generateWater(minHeight, maxHeight, dim);
    }


    generateMaterial(vShader, fShader, minHeight, maxHeight){

        let identityVector = new THREE.Vector4(1.0, 1.0, 1.0);
        this.textureDetails.setHeightValues(minHeight, maxHeight);

        let uniforms = {
            texture_sand: {
                type: 't',
                value: this.sandTexture
            },
            texture_grass: {
                type: 't',
                value: this.grassTexture
            },
            texture_mountain: {
                type: 't',
                value:  this.groundTexture
            },
            texture_snow: {
                type: 't',
                value:  this.snowTexture
            },
            max_sand_level:{
                type: 'f',
                value: this.textureDetails.getSandThreshold()
            },
            max_grass_level:{
                type: 'f',
                value: this.textureDetails.getGrassThreshold()
            },
            max_mountain_level:{
                type: 'f',
                value: this.textureDetails.getMountainThreshold()
            },
            max_snow_level: {
                type: 'f',
                value: maxHeight
            },
            blend_offset:{
                type: 'f',
                value: this.textureDetails.getBlendOffset(this.guiData.blendPercent)
            },
            shininess:{
                type: 'f',
                value: 230
            },
            light_direction:{
                type: 'vec4',
                value: new THREE.Vector4(this.guiData.lightDirectionX, this.guiData.lightDirectionY, this.guiData.lightDirectionZ)
            },
            light_diffuse:{
                type: 'vec4',
                value: new THREE.Vector4(1.0, 1.0, 1.0, 1.0)    //TODO add as gui input (per component or color)
            },
            light_ambient:{
                type: 'vec4',
                value:  new THREE.Vector4(1.0, 1.0, 1.0, 1.0).multiplyScalar(this.guiData.lightAmbient)
            },
            light_specular:{
                type: 'vec4',
                value:  new THREE.Vector4(1.0, 1.0, 1.0, 1.0).multiplyScalar(this.guiData.lightSpecular)
            },
            material_ambient:{
                type: 'vec4',
                value:  new THREE.Vector4(1.0, 1.0, 1.0, 1.0).multiplyScalar(this.guiData.materialAmbient)
            },
            material_specular:{
                type: 'vec4',
                value:  new THREE.Vector4(1.0, 1.0, 1.0, 1.0).multiplyScalar(this.guiData.materialSpecular)
            }
        };

        this.geometry_material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vShader,
            fragmentShader: fShader,
            wireframe: this.geometryWireframe
        });

        return this.geometry_material;
    }


    generateWater(minHeight, maxHeight, dim){
        let waterHeight =  (maxHeight - minHeight) * this.guiData.waterHeightPercent / 100;
       
        /* Water depth */
        let geometry_depth = new THREE.BoxGeometry(this.guiData.terrainSize, this.guiData.terrainSize, waterHeight);
        let material_depth = new THREE.MeshBasicMaterial({
            color: 0x5DBCD2,
            transparent: true,
            opacity: this.guiData.waterAlpha
        }); 
        let mesh_depth = new THREE.Mesh(geometry_depth, material_depth);
        mesh_depth.position.set(0,0, minHeight+ (waterHeight / 2) - 7.5);
        this.mesh.add(mesh_depth);

        let uniforms = {
            texture_water:{
                type: 't',
                value: this.waterTexture
            },
            time: {
                type: 'f',
                value: 0.0
            },
            alpha:{
                type: 'f',
                value: this.guiData.waterAlpha
            }
        }

        /* Animated water surface */
        let geometry = new THREE.PlaneGeometry(this.guiData.terrainSize, this.guiData.terrainSize, dim - 1, dim - 1);
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

        this.waterMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: this.waterVShader,
            fragmentShader: this.waterFShader,
            transparent: true,
            wireframe: this.waterWireframe
        });
        let mesh = new THREE.Mesh(geometry, this.waterMaterial);
        mesh.position.set(0,0, minHeight + waterHeight);
        this.mesh.add(mesh); 
    }


    resize(){
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.aspect = this.width / this.height;

        this.renderer.setSize(this.width, this.height);
        this.camera.updateProjectionMatrix();
        this.camera.aspect = this.aspect;
    }


    regenerate(){
       this.generate();
    }


    repaint(){
        this.geometry_material.uniforms['max_sand_level'].value = this.textureDetails.getSandThreshold();
        this.geometry_material.uniforms['max_grass_level'].value = this.textureDetails.getGrassThreshold();
        this.geometry_material.uniforms['max_mountain_level'].value = this.textureDetails.getMountainThreshold();
    }


    changeUniform(uniformName, value){
        this.geometry_material.uniforms[uniformName].value = new THREE.Vector4(1.0, 1.0, 1.0, 1.0).multiplyScalar(value);
    }


    enableGeometryWireframe(){
        this.geometryWireframe = !this.geometryWireframe;
        this.geometry_material.wireframe = this.geometryWireframe;
    }


    enableWaterWireframe(){
        this.waterWireframe = !this.waterWireframe;
        this.waterMaterial.wireframe = this.waterWireframe;
    }

}


/* Helper Function */
function clamp(min, max, value){
    return Math.min(Math.max(value, min), max);
}

/* Window OnLoad */
window.onload = function(){
    var worldBuilder = new WorldBuilder();
    window.addEventListener('resize', () => {worldBuilder.resize()}, false);
}