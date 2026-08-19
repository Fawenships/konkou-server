const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

const REGISTRATION_FEE = 50;
const WINNER_PERCENTAGE = 0.70;
const PLATFORM_PERCENTAGE = 0.30;

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type"]
    })
);

app.use(express.json());

/* =====================================================
   DONNÉES DU CONCOURS
===================================================== */

let players = [];

let contest = {
    registrations: 0,
    prizePool: 0,
    winner: null,
    winnerPrize: 0,
    platformShare: 0,
    status: "open"
};

/* =====================================================
   OUTILS
===================================================== */

function findPlayer(name) {
    return players.find(
        player =>
            player.name.toLowerCase() ===
            name.trim().toLowerCase()
    );
}

function getRanking() {
    return [...players]
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.id - b.id;
        })
        .map((player, index) => ({
            rank: index + 1,
            ...player
        }));
}

function updateWinner() {

    const registeredPlayers =
        getRanking().filter(
            player => player.registered
        );

    if (registeredPlayers.length === 0) {

        contest.winner = null;
        contest.winnerPrize = 0;
        contest.platformShare = 0;

        players.forEach(player => {
            player.winnings = 0;
        });

        return;
    }

    const winner = registeredPlayers[0];

    const winnerPrize =
        Math.floor(
            contest.prizePool *
            WINNER_PERCENTAGE
        );

    const platformShare =
        contest.prizePool - winnerPrize;

    players.forEach(player => {
        player.winnings = 0;
    });

    winner.winnings = winnerPrize;

    contest.winner = winner.name;
    contest.winnerPrize = winnerPrize;
    contest.platformShare = platformShare;
}

/* =====================================================
   ACCUEIL
===================================================== */

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "🏆 Serveur Konkou fonctionne !",

        players:
            players.length,

        registrations:
            contest.registrations,

        prizePool:
            contest.prizePool,

        winnerPercentage:
            "70%",

        status:
            contest.status

    });

});

/* =====================================================
   API
===================================================== */

app.get("/api", (req, res) => {

    res.json({

        success: true,

        message:
            "🏆 Serveur Konkou fonctionne !",

        players:
            players.length,

        registrations:
            contest.registrations,

        prizePool:
            contest.prizePool,

        winnerPercentage:
            "70%",

        status:
            contest.status

    });

});

/* =====================================================
   INSCRIPTION AU CONCOURS
===================================================== */

app.post("/api/register", (req, res) => {

    try {

        const { name } = req.body;

        if (
            !name ||
            typeof name !== "string" ||
            name.trim().length < 2
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Le nom est obligatoire."

            });

        }

        const cleanName = name.trim();

        let player = findPlayer(cleanName);

        /* JOUEUR DÉJÀ INSCRIT */

        if (
            player &&
            player.registered
        ) {

            return res.json({

                success: true,

                message:
                    "Joueur déjà inscrit.",

                alreadyRegistered:
                    true,

                player: {

                    id:
                        player.id,

                    name:
                        player.name,

                    score:
                        player.score,

                    games:
                        player.games,

                    registered:
                        true

                },

                contest: {

                    registrations:
                        contest.registrations,

                    registrationFee:
                        REGISTRATION_FEE,

                    prizePool:
                        contest.prizePool,

                    winner:
                        contest.winner,

                    winnerPrize:
                        contest.winnerPrize,

                    platformShare:
                        contest.platformShare

                }

            });

        }

        /* CRÉER LE JOUEUR */

        if (!player) {

            player = {

                id:
                    players.length + 1,

                name:
                    cleanName,

                score:
                    0,

                games:
                    0,

                registered:
                    true,

                registrationPaid:
                    REGISTRATION_FEE,

                winnings:
                    0

            };

            players.push(player);

        } else {

            player.registered = true;

            player.registrationPaid =
                REGISTRATION_FEE;

        }

        /* METTRE À JOUR LE CONCOURS */

        contest.registrations++;

        contest.prizePool +=
            REGISTRATION_FEE;

        updateWinner();

        console.log(
            `🎟️ ${player.name} inscrit → +${REGISTRATION_FEE} HTG`
        );

        res.json({

            success: true,

            message:
                "Inscription enregistrée.",

            player: {

                id:
                    player.id,

                name:
                    player.name,

                score:
                    player.score,

                games:
                    player.games,

                registered:
                    true

            },

            contest: {

                registrations:
                    contest.registrations,

                registrationFee:
                    REGISTRATION_FEE,

                prizePool:
                    contest.prizePool,

                winner:
                    contest.winner,

                winnerPrize:
                    contest.winnerPrize,

                platformShare:
                    contest.platformShare

            }

        });

    }

    catch (error) {

        console.error(
            "❌ Erreur /api/register :",
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
   AJOUTER UN SCORE
===================================================== */

app.post("/api/players", (req, res) => {

    try {

        const { name, score } = req.body;

        if (
            !name ||
            typeof name !== "string" ||
            name.trim().length < 2
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Le nom est obligatoire."

            });

        }

        if (
            typeof score !== "number" ||
            !Number.isFinite(score) ||
            score < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Score invalide."

            });

        }

        const player = findPlayer(name);

        if (!player) {

            return res.status(403).json({

                success: false,

                message:
                    "Joueur non inscrit au concours."

            });

        }

        if (!player.registered) {

            return res.status(403).json({

                success: false,

                message:
                    "Le joueur doit être inscrit au concours."

            });

        }

        player.score += score;

        player.games++;

        updateWinner();

        const ranking = getRanking();

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
                    player.games,

                registered:
                    player.registered,

                winnings:
                    player.winnings || 0

            },

            ranking:
                ranking,

            contest: {

                registrations:
                    contest.registrations,

                prizePool:
                    contest.prizePool,

                winner:
                    contest.winner,

                winnerPrize:
                    contest.winnerPrize,

                platformShare:
                    contest.platformShare

            }

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
   LISTE DES JOUEURS
===================================================== */

app.get("/api/players", (req, res) => {

    res.json({

        success: true,

        players:
            getRanking()

    });

});

/* =====================================================
   CLASSEMENT
===================================================== */

app.get("/api/ranking", (req, res) => {

    updateWinner();

    res.json({

        success: true,

        ranking:
            getRanking(),

        contest: {

            registrations:
                contest.registrations,

            registrationFee:
                REGISTRATION_FEE,

            prizePool:
                contest.prizePool,

            winner:
                contest.winner,

            winnerPrize:
                contest.winnerPrize,

            winnerPercentage:
                WINNER_PERCENTAGE * 100,

            platformShare:
                contest.platformShare,

            platformPercentage:
                PLATFORM_PERCENTAGE * 100

        }

    });

});

/* =====================================================
   INFORMATIONS CONCOURS
===================================================== */

app.get("/api/contest", (req, res) => {

    updateWinner();

    res.json({

        success: true,

        contest: {

            status:
                contest.status,

            registrations:
                contest.registrations,

            registrationFee:
                REGISTRATION_FEE,

            prizePool:
                contest.prizePool,

            winner:
                contest.winner,

            winnerPercentage:
                WINNER_PERCENTAGE * 100,

            winnerPrize:
                contest.winnerPrize,

            platformPercentage:
                PLATFORM_PERCENTAGE * 100,

            platformShare:
                contest.platformShare

        }

    });

});

/* =====================================================
   RECHERCHER UN JOUEUR
===================================================== */

app.get(
    "/api/players/:name",
    (req, res) => {

        const name =
            decodeURIComponent(
                req.params.name
            ).trim();

        const player =
            findPlayer(name);

        if (!player) {

            return res.status(404).json({

                success: false,

                message:
                    "Joueur introuvable."

            });

        }

        const ranking =
            getRanking();

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
                    position,

                registered:
                    player.registered,

                winnings:
                    player.winnings || 0

            }

        });

    }

);

/* =====================================================
   SANTÉ DU SERVEUR
===================================================== */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status:
                "online",

            service:
                "Konkou",

            players:
                players.length,

            registrations:
                contest.registrations,

            prizePool:
                contest.prizePool,

            database:
                "not used",

            time:
                new Date().toISOString()

        });

    }

);

/* =====================================================
   RESET
===================================================== */

app.delete(
    "/api/players",
    (req, res) => {

        players = [];

        contest = {

            registrations:
                0,

            prizePool:
                0,

            winner:
                null,

            winnerPrize:
                0,

            platformShare:
                0,

            status:
                "open"

        };

        res.json({

            success: true,

            message:
                "Classement et concours réinitialisés."

        });

    }

);

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
   GESTION DES ERREURS
===================================================== */

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Erreur serveur :",
            err
        );

        res.status(500).json({

            success: false,

            message:
                "Erreur interne du serveur."

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
            "🎟️ Inscription : /api/register"
        );

        console.log(
            "👥 Joueurs : /api/players"
        );

        console.log(
            "🏆 Classement : /api/ranking"
        );

        console.log(
            "💰 Concours : /api/contest"
        );

        console.log(
            "❤️ Santé : /api/health"
        );

        console.log(
            "🥇 Gagnant : 70 %"
        );

        console.log(
            "🏦 Plateforme : 30 %"
        );

        console.log(
            "================================="
        );

        console.log(
            "🚀 Serveur Konkou prêt !"
        );

    }
);
