const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

/* =====================================================
   CONFIGURATION
===================================================== */

const REGISTRATION_FEE = 50;
const WINNER_PERCENTAGE = 0.70;
const PLATFORM_PERCENTAGE = 0.30;

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());


/* =====================================================
   POSTGRESQL
===================================================== */

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL n'est pas configurée.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


/* =====================================================
   INITIALISATION DE LA BASE
===================================================== */

async function initDatabase() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS players (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            score INTEGER NOT NULL DEFAULT 0,
            games INTEGER NOT NULL DEFAULT 0,
            registered BOOLEAN NOT NULL DEFAULT FALSE,
            registration_paid INTEGER NOT NULL DEFAULT 0,
            winnings INTEGER NOT NULL DEFAULT 0
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS contest (
            id INTEGER PRIMARY KEY,
            registrations INTEGER NOT NULL DEFAULT 0,
            prize_pool INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'open'
        );
    `);

    await pool.query(`
        INSERT INTO contest (
            id,
            registrations,
            prize_pool,
            status
        )
        VALUES (1, 0, 0, 'open')
        ON CONFLICT (id) DO NOTHING;
    `);

    console.log("✅ Base PostgreSQL prête.");
}


/* =====================================================
   CONCOURS
===================================================== */

async function getContest() {

    const result = await pool.query(`
        SELECT *
        FROM contest
        WHERE id = 1
    `);

    return result.rows[0];
}


/* =====================================================
   CLASSEMENT
===================================================== */

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

    const ranking = await getRanking();

    await pool.query(`
        UPDATE players
        SET winnings = 0
    `);

    if (ranking.length === 0) {

        return {
            winner: null,
            winnerPrize: 0,
            platformShare: 0
        };
    }

    const contest = await getContest();

    const winner = ranking[0];

    const winnerPrize = Math.floor(
        contest.prize_pool * WINNER_PERCENTAGE
    );

    const platformShare =
        contest.prize_pool - winnerPrize;

    await pool.query(
        `
        UPDATE players
        SET winnings = $1
        WHERE id = $2
        `,
        [winnerPrize, winner.id]
    );

    return {
        winner: winner.name,
        winnerPrize,
        platformShare
    };
}


/* =====================================================
   TEST SERVEUR
===================================================== */

app.get("/", async (req, res) => {

    try {

        const contest = await getContest();
        const ranking = await getRanking();

        res.json({
            success: true,
            message: "🏆 Serveur Konkou fonctionne !",
            players: ranking.length,
            registrations: contest.registrations,
            prizePool: contest.prize_pool,
            winnerPercentage: "70%",
            status: contest.status
        });

    } catch (error) {

        console.error("❌ Erreur :", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }
});


/* =====================================================
   API
===================================================== */

app.get("/api", async (req, res) => {

    try {

        const contest = await getContest();
        const ranking = await getRanking();

        res.json({
            success: true,
            message: "🏆 Serveur Konkou fonctionne !",
            players: ranking.length,
            registrations: contest.registrations,
            prizePool: contest.prize_pool,
            winnerPercentage: "70%",
            status: contest.status
        });

    } catch (error) {

        console.error("❌ Erreur /api :", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur."
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

        const existing = await pool.query(
            `
            SELECT *
            FROM players
            WHERE LOWER(name) = LOWER($1)
            `,
            [cleanName]
        );

        if (existing.rows.length > 0) {

            const player = existing.rows[0];

            if (player.registered) {

                const contest = await getContest();
                const winner = await updateWinner();

                return res.json({
                    success: true,
                    message: "Joueur déjà inscrit.",
                    alreadyRegistered: true,

                    player: {
                        id: player.id,
                        name: player.name,
                        registered: true
                    },

                    contest: {
                        registrations: contest.registrations,
                        prizePool: contest.prize_pool,
                        winnerPrize: winner.winnerPrize
                    }
                });
            }

            const updated = await pool.query(
                `
                UPDATE players
                SET
                    registered = TRUE,
                    registration_paid = $1
                WHERE id = $2
                RETURNING *
                `,
                [REGISTRATION_FEE, player.id]
            );

            const updatedPlayer = updated.rows[0];

            await pool.query(`
                UPDATE contest
                SET
                    registrations = registrations + 1,
                    prize_pool = prize_pool + $1
                WHERE id = 1
            `, [REGISTRATION_FEE]);

            const contest = await getContest();
            const winner = await updateWinner();

            return res.json({
                success: true,
                message: "Inscription enregistrée.",

                player: {
                    id: updatedPlayer.id,
                    name: updatedPlayer.name,
                    registered: true
                },

                contest: {
                    registrations: contest.registrations,
                    registrationFee: REGISTRATION_FEE,
                    prizePool: contest.prize_pool,
                    winner: winner.winner,
                    winnerPrize: winner.winnerPrize
                }
            });
        }


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
            [cleanName, REGISTRATION_FEE]
        );

        const player = result.rows[0];

        await pool.query(`
            UPDATE contest
            SET
                registrations = registrations + 1,
                prize_pool = prize_pool + $1
            WHERE id = 1
        `, [REGISTRATION_FEE]);

        const contest = await getContest();
        const winner = await updateWinner();

        console.log(
            `🎟️ ${player.name} inscrit → +${REGISTRATION_FEE} HTG`
        );

        res.json({
            success: true,
            message: "Inscription enregistrée.",

            player: {
                id: player.id,
                name: player.name,
                registered: true
            },

            contest: {
                registrations: contest.registrations,
                registrationFee: REGISTRATION_FEE,
                prizePool: contest.prize_pool,
                winner: winner.winner,
                winnerPrize: winner.winnerPrize
            }
        });

    } catch (error) {

        console.error("❌ Erreur /api/register :", error);

        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur."
        });
    }
});


/* =====================================================
   AJOUTER UN SCORE
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

        const cleanName = name.trim();

        const result = await pool.query(
            `
            SELECT *
            FROM players
            WHERE LOWER(name) = LOWER($1)
            `,
            [cleanName]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Joueur non inscrit."
            });
        }

        const player = result.rows[0];

        if (!player.registered) {

            return res.status(403).json({
                success: false,
                message:
                    "Le joueur doit être inscrit au concours."
            });
        }

        const updated = await pool.query(
            `
            UPDATE players
            SET
                score = score + $1,
                games = games + 1
            WHERE id = $2
            RETURNING *
            `,
            [score, player.id]
        );

        const updatedPlayer = updated.rows[0];

        const winner = await updateWinner();
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
                winnings: updatedPlayer.winnings || 0
            },

            ranking,

            contest: {
                registrations: contest.registrations,
                prizePool: contest.prize_pool,
                winner: winner.winner,
                winnerPrize: winner.winnerPrize,
                platformShare: winner.platformShare
            }
        });

    } catch (error) {

        console.error("❌ Erreur /api/players :", error);

        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur."
        });
    }
});


/* =====================================================
   TOUS LES JOUEURS
===================================================== */

app.get("/api/players", async (req, res) => {

    try {

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

        res.json({
            success: true,
            players: result.rows
        });

    } catch (error) {

        console.error("❌ Erreur joueurs :", error);

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

        const winner = await updateWinner();
        const ranking = await getRanking();
        const contest = await getContest();

        res.json({

            success: true,

            ranking,

            contest: {
                registrations: contest.registrations,
                registrationFee: REGISTRATION_FEE,
                prizePool: contest.prize_pool,
                winner: winner.winner,
                winnerPrize: winner.winnerPrize,
                winnerPercentage: WINNER_PERCENTAGE * 100,
                platformShare: winner.platformShare,
                platformPercentage: PLATFORM_PERCENTAGE * 100
            }
        });

    } catch (error) {

        console.error("❌ Erreur classement :", error);

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

        const contest = await getContest();
        const winner = await updateWinner();

        res.json({

            success: true,

            contest: {
                status: contest.status,
                registrations: contest.registrations,
                registrationFee: REGISTRATION_FEE,
                prizePool: contest.prize_pool,
                winner: winner.winner,
                winnerPercentage: WINNER_PERCENTAGE * 100,
                winnerPrize: winner.winnerPrize,
                platformPercentage: PLATFORM_PERCENTAGE * 100,
                platformShare: winner.platformShare
            }
        });

    } catch (error) {

        console.error("❌ Erreur concours :", error);

        res.status(500).json({
            success: false,
            message: "Erreur interne."
        });
    }
});


/* =====================================================
   RECHERCHER UN JOUEUR
===================================================== */

app.get("/api/players/:name", async (req, res) => {

    try {

        const name = decodeURIComponent(
            req.params.name
        ).trim();

        const result = await pool.query(
            `
            SELECT *
            FROM players
            WHERE LOWER(name) = LOWER($1)
            `,
            [name]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Joueur introuvable."
            });
        }

        const player = result.rows[0];

        const ranking = await getRanking();

        const position =
            ranking.findIndex(
                p => p.id === player.id
            ) + 1;

        res.json({

            success: true,

            player: {
                id: player.id,
                name: player.name,
                score: player.score,
                games: player.games,
                rank: position,
                registered: player.registered,
                winnings: player.winnings || 0
            }
        });

    } catch (error) {

        console.error("❌ Erreur recherche :", error);

        res.status(500).json({
            success: false,
            message: "Erreur interne."
        });
    }
});


/* =====================================================
   SANTÉ
===================================================== */

app.get("/api/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        const contest = await getContest();

        const result = await pool.query(
            "SELECT COUNT(*) FROM players"
        );

        res.json({

            success: true,

            status: "online",

            database: "connected",

            service: "Konkou",

            players:
                Number(result.rows[0].count),

            registrations:
                contest.registrations,

            prizePool:
                contest.prize_pool,

            time:
                new Date().toISOString()
        });

    } catch (error) {

        console.error("❌ PostgreSQL :", error);

        res.status(500).json({

            success: false,

            status: "online",

            database: "error",

            message:
                "Base de données inaccessible."
        });
    }
});


/* =====================================================
   404 API
===================================================== */

app.use("/api", (req, res) => {

    res.status(404).json({

        success: false,

        message: "Route API introuvable."
    });
});


/* =====================================================
   ERREURS
===================================================== */

app.use((err, req, res, next) => {

    console.error("❌ Erreur serveur :", err);

    res.status(500).json({

        success: false,

        message: "Erreur interne du serveur."
    });
});


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
                console.log("🏆 Classement : /api/ranking");
                console.log("💰 Concours : /api/contest");
                console.log("❤️ Santé : /api/health");
                console.log("🗄️ PostgreSQL : connecté");
                console.log("🥇 1er joueur : 70 % de la cagnotte");
                console.log("=================================");
                console.log("");
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
