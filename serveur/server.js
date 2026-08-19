const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

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
   POSTGRESQL
===================================================== */

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL est manquante.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false
});

/* =====================================================
   INITIALISATION DATABASE
===================================================== */

async function initDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            games INTEGER NOT NULL DEFAULT 0,
            registered BOOLEAN NOT NULL DEFAULT FALSE,
            registration_paid INTEGER NOT NULL DEFAULT 0,
            winnings INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS contest (
            id INTEGER PRIMARY KEY,
            registrations INTEGER NOT NULL DEFAULT 0,
            prize_pool INTEGER NOT NULL DEFAULT 0,
            winner TEXT,
            winner_prize INTEGER NOT NULL DEFAULT 0,
            platform_share INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'open'
        )
    `);

    await pool.query(`
        INSERT INTO contest (
            id,
            registrations,
            prize_pool,
            winner,
            winner_prize,
            platform_share,
            status
        )
        VALUES (
            1,
            0,
            0,
            NULL,
            0,
            0,
            'open'
        )
        ON CONFLICT (id) DO NOTHING
    `);

    console.log("✅ Base de données initialisée.");
}

/* =====================================================
   OUTILS
===================================================== */

async function findPlayer(name) {

    const result = await pool.query(
        `
        SELECT *
        FROM players
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
        `,
        [name.trim()]
    );

    return result.rows[0] || null;
}

async function getContest() {

    const result = await pool.query(`
        SELECT *
        FROM contest
        WHERE id = 1
    `);

    return result.rows[0];
}

async function getRanking() {

    const result = await pool.query(`
        SELECT
            id,
            name,
            score,
            games,
            registered,
            winnings
        FROM players
        ORDER BY score DESC, id ASC
    `);

    return result.rows.map((player, index) => ({
        rank: index + 1,
        id: player.id,
        name: player.name,
        score: player.score,
        games: player.games,
        registered: player.registered,
        winnings: player.winnings || 0
    }));
}

/* =====================================================
   GAGNANT
===================================================== */

async function updateWinner() {

    const contest = await getContest();
    const ranking = await getRanking();

    const registeredPlayers = ranking.filter(
        player => player.registered
    );

    if (registeredPlayers.length === 0) {

        await pool.query(`
            UPDATE players
            SET winnings = 0
        `);

        await pool.query(`
            UPDATE contest
            SET
                winner = NULL,
                winner_prize = 0,
                platform_share = 0
            WHERE id = 1
        `);

        return;
    }

    const winner = registeredPlayers[0];

    const winnerPrize = Math.floor(
        contest.prize_pool * WINNER_PERCENTAGE
    );

    const platformShare =
        contest.prize_pool - winnerPrize;

    await pool.query(`
        UPDATE players
        SET winnings = 0
    `);

    await pool.query(
        `
        UPDATE players
        SET winnings = $1
        WHERE id = $2
        `,
        [winnerPrize, winner.id]
    );

    await pool.query(
        `
        UPDATE contest
        SET
            winner = $1,
            winner_prize = $2,
            platform_share = $3
        WHERE id = 1
        `,
        [
            winner.name,
            winnerPrize,
            platformShare
        ]
    );
}

/* =====================================================
   ACCUEIL
===================================================== */

app.get("/", async (req, res) => {

    try {

        const contest = await getContest();

        const countResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM players
        `);

        res.json({
            success: true,
            message: "🏆 Serveur Konkou fonctionne !",
            players: countResult.rows[0].count,
            registrations: contest.registrations,
            prizePool: contest.prize_pool,
            winnerPercentage: "70%",
            status: contest.status
        });

    } catch (error) {

        console.error("❌ Erreur / :", error);

        res.status(500).json({
            success: false,
            message: "Erreur base de données."
        });
    }
});

/* =====================================================
   API
===================================================== */

app.get("/api", async (req, res) => {

    try {

        const contest = await getContest();

        const countResult = await pool.query(`
            SELECT COUNT(*)::int AS count
            FROM players
        `);

        res.json({
            success: true,
            message: "🏆 Serveur Konkou fonctionne !",
            players: countResult.rows[0].count,
            registrations: contest.registrations,
            prizePool: contest.prize_pool,
            winnerPercentage: "70%",
            status: contest.status
        });

    } catch (error) {

        console.error("❌ Erreur /api :", error);

        res.status(500).json({
            success: false,
            message: "Erreur base de données."
        });
    }
});

/* =====================================================
   INSCRIPTION
===================================================== */

app.post("/api/register", async (req, res) => {

    try {

        const { name } = req.body;

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

        const cleanName = name.trim();

        let player = await findPlayer(cleanName);

        /* JOUEUR DÉJÀ INSCRIT */

        if (player && player.registered) {

            const contest = await getContest();

            return res.json({
                success: true,
                message: "Joueur déjà inscrit.",
                alreadyRegistered: true,

                player: {
                    id: player.id,
                    name: player.name,
                    score: player.score,
                    games: player.games,
                    registered: true
                },

                contest: {
                    registrations: contest.registrations,
                    registrationFee: REGISTRATION_FEE,
                    prizePool: contest.prize_pool,
                    winner: contest.winner,
                    winnerPrize: contest.winner_prize,
                    platformShare: contest.platform_share
                }
            });
        }

        /* CRÉER LE JOUEUR */

        if (!player) {

            const result = await pool.query(
                `
                INSERT INTO players (
                    name,
                    score,
                    games,
                    registered,
                    registration_paid,
                    winnings
                )
                VALUES ($1, 0, 0, TRUE, $2, 0)
                RETURNING *
                `,
                [
                    cleanName,
                    REGISTRATION_FEE
                ]
            );

            player = result.rows[0];

        } else {

            const result = await pool.query(
                `
                UPDATE players
                SET
                    registered = TRUE,
                    registration_paid = $1
                WHERE id = $2
                RETURNING *
                `,
                [
                    REGISTRATION_FEE,
                    player.id
                ]
            );

            player = result.rows[0];
        }

        /* CAGNOTTE */

        await pool.query(`
            UPDATE contest
            SET
                registrations = registrations + 1,
                prize_pool = prize_pool + $1
            WHERE id = 1
        `, [REGISTRATION_FEE]);

        await updateWinner();

        const contest = await getContest();

        console.log(
            `🎟️ ${player.name} inscrit → +${REGISTRATION_FEE} HTG`
        );

        res.json({

            success: true,

            message: "Inscription enregistrée.",

            player: {
                id: player.id,
                name: player.name,
                score: player.score,
                games: player.games,
                registered: player.registered
            },

            contest: {
                registrations: contest.registrations,
                registrationFee: REGISTRATION_FEE,
                prizePool: contest.prize_pool,
                winner: contest.winner,
                winnerPrize: contest.winner_prize,
                platformShare: contest.platform_share
            }
        });

    } catch (error) {

        console.error(
            "❌ Erreur /api/register :",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur."
        });
    }
});

/* =====================================================
   AJOUTER SCORE
===================================================== */

app.post("/api/players", async (req, res) => {

    try {

        const { name, score } = req.body;

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

        const player = await findPlayer(name);

        if (!player) {
            return res.status(403).json({
                success: false,
                message: "Joueur non inscrit au concours."
            });
        }

        if (!player.registered) {
            return res.status(403).json({
                success: false,
                message:
                    "Le joueur doit être inscrit au concours."
            });
        }

        const result = await pool.query(
            `
            UPDATE players
            SET
                score = score + $1,
                games = games + 1
            WHERE id = $2
            RETURNING *
            `,
            [
                score,
                player.id
            ]
        );

        const updatedPlayer = result.rows[0];

        await updateWinner();

        const ranking = await getRanking();
        const contest = await getContest();

        console.log(
            `🏆 ${updatedPlayer.name} +${score} points → ${updatedPlayer.score} points`
        );

        res.json({

            success: true,

            message: "Score enregistré.",

            player: {
                id: updatedPlayer.id,
                name: updatedPlayer.name,
                score: updatedPlayer.score,
                games: updatedPlayer.games,
                registered: updatedPlayer.registered,
                winnings: updatedPlayer.winnings || 0
            },

            ranking,

            contest: {
                registrations: contest.registrations,
                prizePool: contest.prize_pool,
                winner: contest.winner,
                winnerPrize: contest.winner_prize,
                platformShare: contest.platform_share
            }
        });

    } catch (error) {

        console.error(
            "❌ Erreur /api/players :",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur."
        });
    }
});

/* =====================================================
   LISTE JOUEURS
===================================================== */

app.get("/api/players", async (req, res) => {

    try {

        const players = await getRanking();

        res.json({
            success: true,
            players
        });

    } catch (error) {

        console.error(
            "❌ Erreur /api/players GET :",
            error
        );

        res.status(500).json({
            success: false,
            message: "Impossible de récupérer les joueurs."
        });
    }
});

/* =====================================================
   CLASSEMENT
===================================================== */

app.get("/api/ranking", async (req, res) => {

    try {

        await updateWinner();

        const ranking = await getRanking();
        const contest = await getContest();

        res.json({

            success: true,

            ranking,

            contest: {

                registrations:
                    contest.registrations,

                registrationFee:
                    REGISTRATION_FEE,

                prizePool:
                    contest.prize_pool,

                winner:
                    contest.winner,

                winnerPrize:
                    contest.winner_prize,

                winnerPercentage:
                    WINNER_PERCENTAGE * 100,

                platformShare:
                    contest.platform_share,

                platformPercentage:
                    PLATFORM_PERCENTAGE * 100
            }
        });

    } catch (error) {

        console.error(
            "❌ Erreur /api/ranking :",
            error
        );

        res.status(500).json({
            success: false,
            message: "Impossible de récupérer le classement."
        });
    }
});

/* =====================================================
   CONCOURS
===================================================== */

app.get("/api/contest", async (req, res) => {

    try {

        await updateWinner();

        const contest = await getContest();

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
                    contest.prize_pool,

                winner:
                    contest.winner,

                winnerPercentage:
                    WINNER_PERCENTAGE * 100,

                winnerPrize:
                    contest.winner_prize,

                platformPercentage:
                    PLATFORM_PERCENTAGE * 100,

                platformShare:
                    contest.platform_share
            }
        });

    } catch (error) {

        console.error(
            "❌ Erreur /api/contest :",
            error
        );

        res.status(500).json({
            success: false,
            message: "Erreur base de données."
        });
    }
});

/* =====================================================
   RECHERCHE JOUEUR
===================================================== */

app.get(
    "/api/players/:name",
    async (req, res) => {

        try {

            const name =
                decodeURIComponent(
                    req.params.name
                ).trim();

            const player =
                await findPlayer(name);

            if (!player) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Joueur introuvable."
                });
            }

            const ranking =
                await getRanking();

            const position =
                ranking.findIndex(
                    p => p.id === player.id
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

        } catch (error) {

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
   HEALTH
===================================================== */

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await pool.query("SELECT 1");

            const contest =
                await getContest();

            const countResult =
                await pool.query(`
                    SELECT COUNT(*)::int AS count
                    FROM players
                `);

            res.json({

                success: true,

                status:
                    "online",

                service:
                    "Konkou",

                players:
                    countResult.rows[0].count,

                registrations:
                    contest.registrations,

                prizePool:
                    contest.prize_pool,

                database:
                    "connected",

                time:
                    new Date().toISOString()
            });

        } catch (error) {

            console.error(
                "❌ Erreur health :",
                error
            );

            res.status(500).json({

                success: false,

                status:
                    "offline",

                database:
                    "error"
            });
        }
    }
);

/* =====================================================
   RESET
===================================================== */

app.delete(
    "/api/players",
    async (req, res) => {

        try {

            await pool.query(`
                DELETE FROM players
            `);

            await pool.query(`
                UPDATE contest
                SET
                    registrations = 0,
                    prize_pool = 0,
                    winner = NULL,
                    winner_prize = 0,
                    platform_share = 0,
                    status = 'open'
                WHERE id = 1
            `);

            res.json({

                success: true,

                message:
                    "Classement et concours réinitialisés."
            });

        } catch (error) {

            console.error(
                "❌ Erreur reset :",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Impossible de réinitialiser."
            });
        }
    }
);

/* =====================================================
   404
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
   ERREURS
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

async function startServer() {

    try {

        await initDatabase();

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log("");
                console.log("=================================");
                console.log("🏆 KONKOU SERVER");
                console.log("=================================");
                console.log(`🚀 Port : ${PORT}`);
                console.log("🌐 API : /api");
                console.log("🎟️ Inscription : /api/register");
                console.log("👥 Joueurs : /api/players");
                console.log("🏆 Classement : /api/ranking");
                console.log("💰 Concours : /api/contest");
                console.log("❤️ Santé : /api/health");
                console.log("🗄️ PostgreSQL : connecté");
                console.log("🥇 Gagnant : 70 %");
                console.log("🏦 Plateforme : 30 %");
                console.log("=================================");
                console.log("");
                console.log("🚀 Serveur Konkou prêt !");
            }
        );

    } catch (error) {

        console.error(
            "❌ Impossible de démarrer le serveur :",
            error
        );

        process.exit(1);
    }
}

startServer();
