const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// =========================
// CONFIGURATION
// =========================

app.use(cors());
app.use(express.json());

// Permet de servir le site depuis le dossier principal
app.use(express.static(path.join(__dirname, "..")));

// =========================
// DONNÉES TEMPORAIRES
// =========================

let players = [];

// =========================
// PAGE PRINCIPALE
// =========================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "index.html")
    );
});

// =========================
// TEST DU SERVEUR
// =========================

app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "🏆 Serveur Konkou fonctionne !"
    });
});

// =========================
// AJOUTER UN JOUEUR / SCORE
// =========================

app.post("/api/players", (req, res) => {

    const { name, score } = req.body;

    if (!name || typeof name !== "string") {
        return res.status(400).json({
            success: false,
            message: "Le nom est obligatoire."
        });
    }

    const cleanName = name.trim();

    let player = players.find(
        p => p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (!player) {

        player = {
            id: players.length + 1,
            name: cleanName,
            score: 0,
            games: 0
        };

        players.push(player);
    }

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
        player
    });
});

// =========================
// CLASSEMENT
// =========================

app.get("/api/ranking", (req, res) => {

    const ranking = [...players]
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
            rank: index + 1,
            id: player.id,
            name: player.name,
            score: player.score,
            games: player.games
        }));

    res.json({
        success: true,
        ranking
    });
});

// =========================
// RECHERCHER UN JOUEUR
// =========================

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
        player
    });
});

// =========================
// SANTÉ DU SERVEUR
// =========================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        status: "online",
        service: "Konkou",
        time: new Date().toISOString()
    });
});

// =========================
// ERREUR 404 API
// =========================

app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        message: "Route API introuvable."
    });
});

// =========================
// DÉMARRAGE
// =========================

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("=================================");
    console.log("🏆 KONKOU");
    console.log("=================================");
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log("API : /api");
    console.log("Classement : /api/ranking");
    console.log("Santé : /api/health");
    console.log("=================================");
    console.log("");

});
