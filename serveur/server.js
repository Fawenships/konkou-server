const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

/* =====================================================
   CONFIGURATION
===================================================== */

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* =====================================================
   DONNÉES DES JOUEURS
===================================================== */

let players = [];

/* =====================================================
   TEST SERVEUR
===================================================== */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "🏆 Serveur Konkou fonctionne !",
        players: players.length
    });

});

/* =====================================================
   API
===================================================== */

app.get("/api", (req, res) => {

    res.json({
        success: true,
        message: "🏆 Serveur Konkou fonctionne !",
        players: players.length
    });

});

/* =====================================================
   AJOUTER UN SCORE
===================================================== */

app.post("/api/players", (req, res) => {

    try {

        const { name, score } = req.body;

        /* Vérification du nom */

        if (
            !name ||
            typeof name !== "string" ||
            name.trim().length < 2
        ) {

            return res.status(400).json({
                success: false,
                message: "Le nom est obligatoire."
            });

        }

        /* Vérification du score */

        if (
            typeof score !== "number" ||
            !Number.isFinite(score) ||
            score < 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Score invalide."
            });

        }

        const cleanName =
            name.trim();

        /* Chercher le joueur */

        let player =
            players.find(
                p =>
                    p.name.toLowerCase() ===
                    cleanName.toLowerCase()
            );

        /* Nouveau joueur */

        if (!player) {

            player = {

                id:
                    players.length > 0
                        ? Math.max(
                            ...players.map(
                                p => p.id
                            )
                        ) + 1
                        : 1,

                name: cleanName,

                score: 0,

                games: 0

            };

            players.push(player);

        }

        /* Ajouter le score */

        player.score += score;

        player.games += 1;

        /* Classement actuel */

        const ranking =
            [...players]
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .map(
                    (p, index) => ({

                        rank:
                            index + 1,

                        id:
                            p.id,

                        name:
                            p.name,

                        score:
                            p.score,

                        games:
                            p.games

                    })
                );

        console.log(
            `🏆 ${player.name} +${score} points → ${player.score} points`
        );

        res.json({

            success: true,

            message:
                "Score enregistré.",

            player: {

                id:
                    player.id,

                name:
                    player.name,

                score:
                    player.score,

                games:
                    player.games

            },

            ranking

        });

    }

    catch (error) {

        console.error(
            "❌ Erreur /api/players :",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Erreur interne du serveur."

        });

    }

});

/* =====================================================
   CLASSEMENT
===================================================== */

app.get("/api/ranking", (req, res) => {

    try {

        const ranking =
            [...players]
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .map(
                    (player, index) => ({

                        rank:
                            index + 1,

                        id:
                            player.id,

                        name:
                            player.name,

                        score:
                            player.score,

                        games:
                            player.games

                    })
                );

        res.json({

            success: true,

            ranking

        });

    }

    catch (error) {

        console.error(
            "❌ Erreur classement :",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Impossible de récupérer le classement."

        });

    }

});

/* =====================================================
   RECHERCHER UN JOUEUR
===================================================== */

app.get(
    "/api/players/:name",
    (req, res) => {

        try {

            const name =
                decodeURIComponent(
                    req.params.name
                )
                .trim()
                .toLowerCase();

            const player =
                players.find(
                    p =>
                        p.name.toLowerCase() ===
                        name
                );

            if (!player) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Joueur introuvable."

                });

            }

            const ranking =
                [...players]
                    .sort(
                        (a, b) =>
                            b.score - a.score
                    );

            const position =
                ranking.findIndex(
                    p =>
                        p.id === player.id
                ) + 1;

            res.json({

                success: true,

                player: {

                    id:
                        player.id,

                    name:
                        player.name,

                    score:
                        player.score,

                    games:
                        player.games,

                    rank:
                        position

                }

            });

        }

        catch (error) {

            console.error(
                "❌ Erreur recherche joueur :",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Erreur interne."

            });

        }

    }
);

/* =====================================================
   SANTÉ DU SERVEUR
===================================================== */

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        status: "online",

        service: "Konkou",

        players:
            players.length,

        time:
            new Date().toISOString()

    });

});

/* =====================================================
   404 API
===================================================== */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Route API introuvable."

        });

    }
);

/* =====================================================
   DÉMARRAGE
===================================================== */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "================================="
        );
        console.log(
            "🏆 KONKOU SERVER"
        );
        console.log(
            "================================="
        );
        console.log(
            `🚀 Port : ${PORT}`
        );
        console.log(
            "🌐 API : /api"
        );
        console.log(
            "🏆 Classement : /api/ranking"
        );
        console.log(
            "❤️ Santé : /api/health"
        );
        console.log(
            "👥 Joueurs : 0"
        );
        console.log(
            "================================="
        );
        console.log("");

    }
);
