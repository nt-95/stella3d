import * as THREE from 'https://cdn.rawgit.com/mrdoob/three.js/r85/build/three.min.js';
import { GLTFLoader } from 'https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.rawgit.com/mrdoob/three.js/r85/examples/js/controls/OrbitControls.js';

//------------------ MAIN --------------------------------------

main();

// ------- Fonction MAIN ------ 

function main() {
  // Declaration des variables principales
  let scene,
    renderer,
    camera,
    model,                              // Le personnage
    neck,                               // Les os du cou et du torse
    waist,
    possibleAnims,                      // Les animations contenues dans le fichier gltf
    clicAnims = [],                     // Les animations qui s'activeront quand on clique sur le personnage
    mixer,                              // Mixer d'animations THREE.js 
    idle,                               // Repos, l'etat par defaut du personnage
    clock = new THREE.Clock(),          // Pour les animations, qui tournent en fonction d'une horloge au lieu d'images par seconde
    currentlyAnimating = false,         // Flag pour verifier si le personnage est deja en train d'utiliser une animation
    raycaster = new THREE.Raycaster(),  // Pour detecter un clic sur le personnage
    loaderAnim = document.getElementById('js-loader'); //Loader qui disparait quand le modele 3D est charge

  init();


  function init() {
    const MODEL_PATH = 'src/3dmodel/stella.glb';
    const canvas = document.querySelector('#c');
    const backgroundColor = 0x001ed1;

    // Initiation de la scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // Initiation du renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Ajout de la camera
    camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 30
    camera.position.x = 0;
    camera.position.y = -3;

    //Ajout d'Orbit controls
    /*const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0)S;
    controls.update();*/

    // Ajout des lumieres
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    hemiLight.position.set(0, 50, 0);    // 
    scene.add(hemiLight);
    let d = 8.25;
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    scene.add(dirLight);

    // Sol
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: 0x001ed1,
      shininess: 0,
    });
    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI; // 90 degres
    floor.receiveShadow = true;
    floor.position.y = -13;
    scene.add(floor);

    //Chargement du modele 3D
    var loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      function (gltf) {
        model = gltf.scene;
        let fileAnimations = gltf.animations;
        //Utilisation de la methode 'traverse' du modele, pour trouver toutes les mesh et activer la possibilite d'emettre et recevoir des ombres
        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            //o.receiveShadow = true; //rend mal
            o.frustumCulled = false; //permet d'eviter que certaines parties de la mesh disparaissent lorsqu'on zoom avec Orbitcontrols
          }
          // Reference des os du cou et du torse 
          if (o.isBone && o.name === 'spine005') {
            neck = o;
          }
          if (o.isBone && o.name === 'spine003') {
            waist = o;
          }

        });
        model.scale.set(9, 9, 9); // L'echelle du personnage, 9x sa taille initiale        
        model.position.y = -13; //On descend le personnage de 13 unites afin qu'il soit debout sur le sol
        scene.add(model);
        // bounding box pour detecter l'emplacement du personnage
        /*var helper = new THREE.BoundingBoxHelper(model, 0xfff933);
        helper.update();
        scene.add(helper);*/

        // Chargement de l'animation
        loaderAnim.remove();
        mixer = new THREE.AnimationMixer(model);
        //on charge une liste des animations, sauf 'idle', qui sera l'animation de base, et scare et scare2, qui seront des animations declenchees par le clic de souris
        let clips = fileAnimations.filter(val => val.name !== 'idle');
        clips = clips.filter(val => val.name !== 'scare2');
        clips = clips.filter(val => val.name !== 'scare');
        clips = clips.filter(val => val.name !== 'no');
        //clips.filter(val => val.name !== 'scare2' && val.name !== 'scare' && val.name !== 'no'); 
        //clips.filter(val => !['no', 'scare', 'scare2'].includes(val.name));

        //Conversion des clips restants en animations threejs. possibleAnims est un array d'animations
        possibleAnims = clips.map(val => {
          let clip = THREE.AnimationClip.findByName(clips, val.name);
          clip.tracks.splice(9, 3); //on enleve les os du cou et du torse pour pouvoir les manipuler plus tard avec la souris
          clip.tracks.splice(12, 3);
          clip = mixer.clipAction(clip);
          return clip;
        }
        );

        //On cree une liste ordonnee avec le nom des animations en guise de menu
        for (let i = 0; i < possibleAnims.length; i++) {
          let newAnimInList = document.createElement("li");
          newAnimInList.id = i; //pour chaque animation, on associe a l'element li un #id correspondant a son index dans la liste ordonnee <ol>
          let newAnimName = document.createTextNode(possibleAnims[i]._clip.name); //on associe a li le nom d'une animation de l'array possibleAnims
          newAnimInList.appendChild(newAnimName);
          document.getElementById("animlist").appendChild(newAnimInList); //on ajoute la nouvelle balise li a la liste ol (#animlist)
        }

        //Il nous reste a mettre en place l'animation idle par defaut
        let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle'); // On cree un nouvel AnimationClip, en regardant dans fileAnimations pour trouver une animation nommee ‘idle’. Ce nom est configure dans Blender
        //on extrait les positions, quaternions et scales de spine003 et spine005 de l'objet idleAnim via la methode slice. Il faut le faire avant d'utiliser la methode mixer.clipAction()
        idleAnim.tracks.splice(9, 3);
        idleAnim.tracks.splice(12, 3); //cela nous permet d'avoir un controle sur son cou et son torse indépendamment de l'animation. Nous y associons un eventListener 'mousemove'
        idle = mixer.clipAction(idleAnim); // On utilise alors la methode dans le mixer appelee clipAction, en passant en argument idleAnim           
        idle.play(); // A ce stade l'animation ne vas pas encore etre jouee. Le mixeur doit etre mis a jour (update) afin qu'il tourne continuellement a travers une animation. Pour ce faire, il faut dire au mixer de se mettre a jour a l'interieur de la fonction update().

        //Et l'on cree aussi une serie d'animations qui se declencheront lorsque l'on clique sur le personnage        
        clicAnims.push(mixer.clipAction(THREE.AnimationClip.findByName(fileAnimations, 'scare2')));
        clicAnims.push(mixer.clipAction(THREE.AnimationClip.findByName(fileAnimations, 'scare')));
        clicAnims.push(mixer.clipAction(THREE.AnimationClip.findByName(fileAnimations, 'no')));
      },
      undefined, // On n'a pas besoin de cette fonction
      function (error) {
        console.error(error);
      }

    );

    // FONCTIONS --------------------

    function update() {
      if (mixer) {
        mixer.update(clock.getDelta());
      } // L'update utilise l'horloge (clock referencee au debut du projet) et se met a jour grace a elle. Cela fait que l'animation ne ralentit pas meme si le frame rate ralentit. 
      if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
      requestAnimationFrame(update);
    }
    update();

    function resizeRendererToDisplaySize(renderer) {
      //Fonction qui ajuste la resolution du canvas contenant la scene 3D a la taille de la fenetre, si l'utilisateur la modifie
      const canvas = renderer.domElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    };

    //Event listener pour faire changer l'animation du personnage soit en cliquant avec la souris sur lui, soit a partir du menu
    let mousecount = 0; //variable qui va memoriser le nombre de clics de souris pour que les animations soient toutes affichees a la suite a travers playOnClick();
    window.onclick = e => {
      raycast(e);
      playMenu(e);
    }
    window.addEventListener('touch', e => {
      raycast(e, true)
      playMenu(e);
    }); //pour appareil tactileS

    function noraycast(e, touch = false) {
      //les animations sont jouées seulement si on clique sur l'ecran, n'importe ou 
      if (!currentlyAnimating) {
        currentlyAnimating = true;
        playOnClick();
      }
    }

    function raycast(e, touch = false) {
      var mouse = {};
      //Ici on assigne mouse.x and mouse.y a la position changedTouches[0] si touch est true, ou juste return la position de la souris.
      if (touch) {
        mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
        mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
      } else {
        mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
        mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
      }
      // Mise a jour du rayon avec la camera et la position de la souris
      raycaster.setFromCamera(mouse, camera);

      //Calcul des objects qui intersectent le rayon
      var intersects = raycaster.intersectObjects(scene.children, true); //On obtient un array d'objets intersectes. 
      //S'il y en a, on selectionne le premier objet intersecte par le rayon
      if (intersects[0]) {
        var object = intersects[0].object;

        if (object.parent.parent != null && object.parent.parent.name === ('metarig') || object.parent.name === ('metarig')) {
          //le squelette (metarig) est le parent de toutes les mesh du personnage. Verifier si metarig est le parent de l'objet intersecte nous permet de savoir si on a clique sur le personnage 
          if (!currentlyAnimating) {
            //Si le personnage n'est pas deja en train de jouer une animation, on signale qu'il va en jouer une, et on la joue
            currentlyAnimating = true;
            playOnClick();
          }
        }
      }
    }

    function playMenu(e) {
      //fonction qui lance une des animations du menu lorsqu'on clique sur une des balises li correspondantes
      if (e.target.nodeName === "LI") {
        let li = e.target;
        let index = e.target.id; //on recupere l'id de l'element li, qui correspond a sa numerotation dans la liste ordonnee
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playModifierAnimation(idle, 0.25, possibleAnims[index], 0.25); //on peut ainsi utiliser cet index pour jouer l'animation correspondante
        }
      }
    }

    // 
    function playOnClick() {
      //Fonction qui lance l'animation lorsqu'on clique sur le personnage
      //on compte combien il y a eu de clics de souris. Quand ils depassent le nombre d'animations disponibles, le compteur revient a 0. Cela nous permettra d'afficher toutes les animations dans l'ordre
      //l'incrementation ne se fait que lorsque playOnClick est lancee, apres avoir mis le boleen currentlyAnimating sur true. Avec ce flag les clics qui ont lieu pendant l'animation ne sont pas comptes
      if (mousecount < clicAnims.length) mousecount += 1;
      if (mousecount == clicAnims.length) mousecount = 0;
      //let anim = Math.floor(Math.random() * possibleAnims.length) + 0; //la fonction pourrait aussi lancer une animation au hasard
      let anim = mousecount;
      playModifierAnimation(idle, 0.25, clicAnims[anim], 0.25);
      //playModifierAnimation(idle, 0.25, clicAnims[anim], 0.25);
    }


    function playModifierAnimation(from, fSpeed, to, tSpeed) {
      //from : l'animation d'origine, idle
      //to : l'animation qui va etre jouee 
      //fSpeed et tSeed : vitesses de transition entre les deux animations
      //toutes les animations sont tres breves sauf dance qui est plus longue, donc on cree une condition pour qu'elle joue moins longtemps, et les autres plus longtemps
      let duration;
      if (to._clip.name == 'dance') {
        to.setLoop(THREE.LoopRepeat, 2);
        duration = to._clip.duration * 1000 - ((tSpeed + fSpeed) * 5000);
      }
      else {
        to.setLoop(THREE.LoopRepeat);
        duration = to._clip.duration * 5000 - ((tSpeed + fSpeed) * 5000);
      }
      to.reset();
      to.play();
      from.crossFadeTo(to, fSpeed, true);
      setTimeout(function () {
        from.enabled = true;
        to.crossFadeTo(from, tSpeed, true);
        currentlyAnimating = false;
      }, duration); //modifier le timeout pour avoir plus ou moins de loops dans l'animation (si on met un nombre predefini de loops et qu'ils terminent avant le decompte, le personnage se fige sans animation jusqu'a la fin du decompte)
    }

    //Event listener pour detecter le mouvement de souris et faire bouger la tete et le torse du personnage
    document.addEventListener('mousemove', function (e) {
      var mousecoords = getMousePos(e);
      if (neck && waist) {
        moveJoint(mousecoords, neck, 50);
        moveJoint(mousecoords, waist, 30);
      }
    });

    function getMousePos(e) {
      return { x: e.clientX, y: e.clientY };
    }

    function moveJoint(mouse, joint, degreeLimit) {
      let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
      joint.rotation.y = THREE.Math.degToRad(degrees.x);
      joint.rotation.x = THREE.Math.degToRad(degrees.y);
    }


    function getMouseDegrees(x, y, degreeLimit) {
      //Permet de calculer a quel degre bouger la tete du personnage en fonction de la position de la souris sur l'ecran
      let dx = 0,
        dy = 0,
        xdiff,
        xPercentage,
        ydiff,
        yPercentage;

      let w = { x: window.innerWidth, y: window.innerHeight };

      // Gauche (Rotation du cou a gauche entre 0 et -degreeLimit)

      // 1. Si le curseur est dans la moitie gauche de l'ecran 
      if (x <= w.x / 2) {
        // 2. On calcule la difference entre la moitie de l'ecran et la position du curseur
        xdiff = w.x / 2 - x;
        // 3. On transforme cette difference en pourcentage (pourcentage vis-a-vis du bord de l'ecran)
        xPercentage = (xdiff / (w.x / 2)) * 100;
        // 4. On convertit cela en un pourcentage de la rotation maximale que nous pouvons autoriser pour le cou
        dx = ((degreeLimit * xPercentage) / 100) * -1;
      }
      // Droite (Rotation du cou a droite entre 0 et degreeLimit)
      if (x >= w.x / 2) {
        xdiff = x - w.x / 2;
        xPercentage = (xdiff / (w.x / 2)) * 100;
        dx = (degreeLimit * xPercentage) / 100;
      }
      // Haut (Rotation du cou vers le haut entre 0 and -degreeLimit)
      if (y <= w.y / 2) {
        ydiff = w.y / 2 - y;
        yPercentage = (ydiff / (w.y / 2)) * 100;
        // A noter qu'on coupe degreeLimit par deux lorsqu'elle regarde vers le haut 
        dy = (((degreeLimit * 0.5) * yPercentage) / 100) * -1;
      }

      // Bas (Rotation du cou vers le bas entre 0 et degreeLimit)
      if (y >= w.y / 2) {
        ydiff = y - w.y / 2;
        yPercentage = (ydiff / (w.y / 2)) * 100;
        dy = (degreeLimit * yPercentage) / 100;
      }
      return { x: dx, y: dy };
    }


  }

};

 
