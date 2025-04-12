// Initialisation de la carte
const carte = L.map('map').setView([20, 0], 2);

// Ajout de la carte
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}.png', {
    maxZoom: 5,
    minZoom: 2
}).addTo(carte);

// Variables globales
let score = 0;
let paysActuel = null; 
let donneesPays = null;
let indicesRestants = 3;
let coucheCorrecte = null;
let coucheIndice = null;
let coucheNomsPays = null;
let reponseDonnee = false;
const boutonSuivant = document.getElementById('next-btn');
let tousLesPays = null;

// Chargement des pays
fetch('./data/countries.geo.json')
    .then(reponse => {
        if (!reponse.ok) throw new Error('Échec du chargement des pays');
        return reponse.json();
    })
    .then(donnees => {
        donneesPays = {
            features: donnees.features.map(pays => ({
                ...pays,
                properties: {
                    NOM: pays.properties.name || pays.properties.NAME,
                    ...pays.properties
                }
            }))
        };

        // Ajouter tous les pays sur la carte avec hover (sans tooltip)
        tousLesPays = L.geoJSON(donneesPays, {
            style: {
                color: '#aaa',
                weight: 1,
                fillColor: '#f0f0f0',
                fillOpacity: 0.1
            },
            onEachFeature: (feature, layer) => {
                layer.on({
                    mouseover: function (e) {
                        const layer = e.target;
                        layer.setStyle({
                            weight: 2,
                            color: '#666',
                            fillColor: '#ffeaa7',
                            fillOpacity: 0.4
                        });
                        layer.bringToFront();
                    },
                    mouseout: function (e) {
                        tousLesPays.resetStyle(e.target);
                    }
                });
            }
        }).addTo(carte);

        demarrerJeu();
    })
    .catch(erreur => {
        console.error("Erreur de chargement des pays:", erreur);
        demarrerJeu();
    });

// Démarrer le jeu
function demarrerJeu() {
    choisirPaysAleatoire();
    configurerClics();
}

// Choisir un pays aléatoire
function choisirPaysAleatoire() {
    if (coucheCorrecte) carte.removeLayer(coucheCorrecte);
    if (coucheIndice) carte.removeLayer(coucheIndice);
    if (coucheNomsPays) carte.removeLayer(coucheNomsPays);

    carte.setView([20, 0], 2);
    boutonSuivant.style.display = 'none';

    const indexAleatoire = Math.floor(Math.random() * donneesPays.features.length);
    paysActuel = donneesPays.features[indexAleatoire];

    document.getElementById('target-country').textContent = paysActuel.properties.NOM;
    reponseDonnee = false;
}

// Configurer les clics sur la carte
function configurerClics() {
    carte.off('click');
    carte.on('click', function(e) {
        if (!paysActuel || reponseDonnee) return;

        try {
            const point = turf.point([e.latlng.lng, e.latlng.lat]);
            const polygone = turf.feature(paysActuel.geometry);
            const estCorrect = turf.booleanPointInPolygon(point, polygone);

            if (estCorrect) {
                gererReponseCorrecte();
            } else {
                afficherMessage("Mauvais pays ! Essayez encore", '#e74c3c');
            }
        } catch (erreur) {
            console.error("Erreur de vérification:", erreur);
            afficherMessage("Erreur de traitement", 'red');
        }
    });
}

// Gérer la réponse correcte
function gererReponseCorrecte() {
    reponseDonnee = true;
    score += 1000;
    document.getElementById('score').textContent = `Score: ${score}`;
    afficherMessage("Correct ! +1000 points", '#2ecc71');

    coucheCorrecte = L.geoJSON(paysActuel.geometry, {
        style: {
            color: '#2ecc71',
            weight: 3,
            fillColor: '#2ecc71',
            fillOpacity: 0.3
        }
    }).addTo(carte);

    boutonSuivant.style.display = 'inline-block';
}

// Gestion de l'indice
document.getElementById('hint').addEventListener('click', function() {
    if (indicesRestants <= 0 || !paysActuel) return;

    if (coucheIndice) carte.removeLayer(coucheIndice);

    // Créer une zone de survol approximative (cercle autour du pays)
    const limites = turf.bbox(paysActuel.geometry); // Récupérer la bounding box du pays
    const centre = [(limites[1] + limites[3]) / 2, (limites[0] + limites[2]) / 2]; // Centre de la bounding box
    const rayon = 2000000; // Rayon du cercle en mètres (2 000 km par exemple)

    // Ajouter un cercle sur la carte autour du pays
    coucheIndice = L.circle(centre, {
        color: '#3498db',
        weight: 3,
        fillColor: '#3498db',
        fillOpacity: 0.2,
        radius: rayon
    }).addTo(carte);

    carte.fitBounds(coucheIndice.getBounds(), { padding: [50, 50], maxZoom: 4 });

    indicesRestants--;
    document.getElementById('hint-count').textContent = indicesRestants;
    if (indicesRestants <= 0) this.disabled = true;

    afficherMessage("Indice : Zone approximative surlignée en bleu", '#3498db');

    setTimeout(() => {
        if (coucheIndice) carte.removeLayer(coucheIndice);
    }, 3000);
});

// Afficher un message à l'utilisateur
function afficherMessage(texte, couleur) {
    const elementMessage = document.getElementById('message');
    elementMessage.textContent = texte;
    elementMessage.style.color = couleur;
    elementMessage.style.display = 'block';

    setTimeout(() => {
        elementMessage.style.display = 'none';
    }, 2000);
}

// Clic sur le bouton "Suivant"
boutonSuivant.addEventListener('click', () => {
    if (!reponseDonnee && paysActuel) {
        coucheCorrecte = L.geoJSON(paysActuel.geometry, {
            style: {
                color: '#e74c3c', // rouge
                weight: 3,
                fillColor: '#e74c3c',
                fillOpacity: 0.3
            }
        }).addTo(carte);

        afficherMessage(`Le bon pays était : ${paysActuel.properties.NOM}`, '#e74c3c');
        reponseDonnee = true;

        setTimeout(() => {
            choisirPaysAleatoire();
            configurerClics();
        }, 2000);
    } else {
        choisirPaysAleatoire();
        configurerClics();
    }
});
