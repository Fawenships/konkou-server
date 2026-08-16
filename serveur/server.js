```js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

/* =========================
   CONFIGURATION
========================= */

app.use(cors());
app.use(express.json());

// Permet au serveur d'afficher index.html
app.use(express.static(__dirname));


/* =========================
   DONNÉES TEMPORAIRES
========================= */

let players = [];


/* =========================
   PAGE D'ACCUEIL
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


/* =========================
   TEST DU SERVEUR
========================= */

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "🏆 Serveur Konkou fonctionne !"
    });
});


/* =========================
   AJOUTER UN JOUEUR / SCORE
========================= */

app.post("/api/players", (req, res) => {

    const { name, score } = req.body;

    // Vérification du nom
    if (!name || typeof name !== "string" || name.trim().length < 2) {

        return res.status(400).json({
            success: false,
            message: "Le nom est obligatoire."
        });

    }

    const cleanName = name.trim();

    // Chercher le joueur
    let player = players.find(
        p => p.name.toLowerCase() === cleanName.toLowerCase()
    );


    // Créer le joueur s'il n'existe pas
    if (!player) {

        player = {
            id: players.length + 1,
            name: cleanName,
            score: 0,
            games: 0
        };

        players.push(player);
    }


    // Ajouter le score
    if (
        typeof score === "number" &&
        Number.isFinite(score) &&
        score >= 0
    ) {

        player.score += score;
        player.games++;

    }


    res.json({
        success: true,
        player: player
    });

});


/* =========================
   CLASSEMENT
========================= */

app.get("/api/ranking", (req, res) => {

    const ranking = [...players]
        .sort((a, b) => b.score - a.score)
        .map((player, index) => {

            return {
                rank: index + 1,
                id: player.id,
                name: player.name,
                score: player.score,
                games: player.games
            };

        });


    res.json({
        success: true,
        ranking: ranking
    });

});


/* =========================
   RECHERCHER UN JOUEUR
========================= */

app.get("/api/players/:name", (req, res) => {

    const name = decodeURIComponent(
        req.params.name
    ).trim().toLowerCase();


    const player = players.find(
        p => p.name.toLowerCase() === name
    );


    if (!player) {

        return res.status(404).json({
            success: false,
            message: "Joueur introuvable."
        });

    }


    res.json({
        success: true,
        player: player
    });

});


/* =========================
   SUPPRIMER TOUS LES JOUEURS
   POUR TEST UNIQUEMENT
========================= */

app.delete("/api/players", (req, res) => {

    players = [];

    res.json({
        success: true,
        message: "Classement réinitialisé."
    });

});


/* =========================
   GESTION DES ERREURS JSON
========================= */

app.use((err, req, res, next) => {

    console.error(err);

    res.status(500).json({
        success: false,
        message: "Erreur interne du serveur."
    });

});


/* =========================
   DÉMARRAGE
========================= */

app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("🏆 KONKOU");
    console.log("=================================");
    console.log(`Serveur : http://localhost:${PORT}`);
    console.log(`Test : http://localhost:${PORT}/api/test`);
    console.log(`Classement : http://localhost:${PORT}/api/ranking`);
    console.log("=================================");
    console.log("");
    console.log("Le serveur est prêt !");
    console.log("Ne ferme pas cette fenêtre.");
    console.log("");

});
```
