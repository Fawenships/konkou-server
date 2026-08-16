/* =====================================================
   KONKOU — APP.JS
   Connexion au serveur Render
===================================================== */

const API_URL = "https://konkou-server-6.onrender.com";


/* =====================================================
   ÉTAT DU JEU
===================================================== */

const state = {

    category: null,

    questions: [],

    index: 0,

    score: 0,

    correct: 0,

    wrong: 0,

    timer: null,

    time: 15,

    tickets: 3

};

const RESET = 4 * 60 * 60 * 1000;

const QUESTION_TIME = 15;


/* =====================================================
   CATEGORIES
===================================================== */

const categories = [

    {
        name: "📚 Histoire d'Haïti",

        questions: [

            {
                q: "En quelle année Haïti est-elle devenue indépendante ?",

                c: [
                    "1791",
                    "1804",
                    "1815",
                    "1822"
                ],

                a: 1
            },

            {
                q: "Qui a proclamé l'indépendance d'Haïti ?",

                c: [
                    "Toussaint Louverture",
                    "Jean-Jacques Dessalines",
                    "Alexandre Pétion",
                    "Henri Christophe"
                ],

                a: 1
            },

            {
                q: "Quelle bataille est associée à la victoire décisive de l'armée indigène ?",

                c: [
                    "Vertières",
                    "Jacmel",
                    "Léogâne",
                    "Port-au-Prince"
                ],

                a: 0
            }

        ]
    },

    {
        name: "🌎 Géographie",

        questions: [

            {
                q: "Quelle est la capitale d'Haïti ?",

                c: [
                    "Cap-Haïtien",
                    "Jacmel",
                    "Port-au-Prince",
                    "Gonaïves"
                ],

                a: 2
            },

            {
                q: "Avec quel pays Haïti partage-t-elle Hispaniola ?",

                c: [
                    "Cuba",
                    "Jamaïque",
                    "République Dominicaine",
                    "Porto Rico"
                ],

                a: 2
            }

        ]
    },

    {
        name: "⚽ Sport",

        questions: [

            {
                q: "Combien de joueurs une équipe de football possède-t-elle normalement sur le terrain ?",

                c: [
                    "7",
                    "9",
                    "11",
                    "13"
                ],

                a: 2
            }

        ]
    },

    {
        name: "💻 Informatique",

        questions: [

            {
                q: "Que signifie HTML ?",

                c: [
                    "HyperText Markup Language",
                    "HighText Machine Language",
                    "HyperTool Modern Language",
                    "Home Tool Markup Language"
                ],

                a: 0
            },

            {
                q: "Quel langage rend principalement une page web interactive ?",

                c: [
                    "JavaScript",
                    "HTML",
                    "SQL",
                    "XML"
                ],

                a: 0
            }

        ]
    }

];


/* =====================================================
   ÉCRANS
===================================================== */

const screens = [
    "home",
    "quiz",
    "result",
    "ranking",
    "how-to",
    "gains",
    "history"
];


function screen(name) {

    screens.forEach(x => {

        const element = document.getElementById(
            "screen-" + x
        );

        if (element) {
            element.classList.remove("active");
        }

    });

    const selected = document.getElementById(
        "screen-" + name
    );

    if (selected) {
        selected.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =====================================================
   TICKETS
===================================================== */

function loadTickets() {

    const data = JSON.parse(
        localStorage.getItem("tickets") || "null"
    );

    if (!data) {

        state.tickets = 3;

        localStorage.setItem(
            "tickets",
            JSON.stringify({
                count: 3,
                time: Date.now()
            })
        );

    }

    else if (
        Date.now() - data.time >= RESET
    ) {

        state.tickets = 3;

        localStorage.setItem(
            "tickets",
            JSON.stringify({
                count: 3,
                time: Date.now()
            })
        );

    }

    else {

        state.tickets = data.count;

    }

    updateTickets();

}


function updateTickets() {

    const ticket = document.getElementById(
        "ticket-count"
    );

    const homeTicket = document.getElementById(
        "ticket-count-home"
    );

    const profileTicket = document.getElementById(
        "profile-tickets"
    );

    if (ticket) {
        ticket.textContent = state.tickets;
    }

    if (homeTicket) {
        homeTicket.textContent = state.tickets;
    }

    if (profileTicket) {
        profileTicket.textContent = state.tickets;
    }

}


function ticketTimer() {

    const data = JSON.parse(
        localStorage.getItem("tickets") || "null"
    );

    const element = document.getElementById(
        "ticket-countdown-home"
    );

    if (!element) {
        return;
    }

    if (!data) {

        element.textContent =
            "3 tickets disponibles";

        return;
    }

    if (state.tickets >= 3) {

        element.textContent =
            "3 tickets disponibles";

        return;
    }

    const remaining = Math.max(
        0,
        data.time + RESET - Date.now()
    );

    if (remaining <= 0) {

        loadTickets();

        return;
    }

    const h = Math.floor(
        remaining / 3600000
    );

    const m = Math.floor(
        remaining % 3600000 / 60000
    );

    const s = Math.floor(
        remaining % 60000 / 1000
    );

    element.textContent =
        `⏱️ Recharge dans ${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`;

}


function useTicket() {

    if (state.tickets <= 0) {

        alert(
            "Tu n'as plus de tickets. Ils seront renouvelés après 4 heures."
        );

        return false;
    }

    const data = JSON.parse(
        localStorage.getItem("tickets")
    );

    state.tickets--;

    localStorage.setItem(
        "tickets",
        JSON.stringify({
            count: state.tickets,
            time: data ? data.time : Date.now()
        })
    );

    updateTickets();

    return true;

}


/* =====================================================
   CATÉGORIES
===================================================== */

function renderCategories() {

    const box = document.getElementById(
        "category-list"
    );

    if (!box) {
        return;
    }

    box.innerHTML = "";

    categories.forEach(
        (category, i) => {

            const button =
                document.createElement("button");

            button.innerHTML = `

                <span>
                    ${category.name}
                </span>

                <span class="cat-count">
                    ${category.questions.length} questions
                </span>

            `;

            button.onclick = () => {
                startQuiz(i);
            };

            box.appendChild(button);

        }
    );

    const ranking =
        document.createElement("button");

    ranking.innerHTML = `

        <span>
            🏆 Classement
        </span>

        <span class="cat-count">
            Voir les scores
        </span>

    `;

    ranking.onclick = showRanking;

    box.appendChild(ranking);

}


/* =====================================================
   DÉMARRER LE QUIZ
===================================================== */

function startQuiz(i) {

    if (!useTicket()) {
        return;
    }

    state.category = i;

    state.questions = [
        ...categories[i].questions
    ];

    state.questions.sort(
        () => Math.random() - 0.5
    );

    state.index = 0;

    state.score = 0;

    state.correct = 0;

    state.wrong = 0;

    screen("quiz");

    question();

}


/* =====================================================
   QUESTION
===================================================== */

function question() {

    clearInterval(state.timer);

    const q =
        state.questions[state.index];

    document.getElementById(
        "quiz-category"
    ).textContent =
        categories[state.category].name;

    document.getElementById(
        "quiz-question"
    ).textContent =
        q.q;

    document.getElementById(
        "quiz-progress"
    ).textContent =
        `Question ${state.index + 1} sur ${state.questions.length}`;

    document.getElementById(
        "quiz-score"
    ).textContent =
        state.score;

    document.getElementById(
        "progress-fill"
    ).style.width =
        (state.index / state.questions.length * 100) + "%";


    const answers =
        q.c.map(
            (text, index) => ({
                text: text,
                correct: index === q.a
            })
        );


    answers.sort(
        () => Math.random() - 0.5
    );


    const box =
        document.getElementById(
            "quiz-choices"
        );

    box.innerHTML = "";


    answers.forEach(
        answer => {

            const button =
                document.createElement("button");

            button.textContent =
                answer.text;

            button.onclick = () => {

                answerQuestion(
                    button,
                    answer.correct
                );

            };

            box.appendChild(button);

        }
    );


    startTimer();

}


/* =====================================================
   CHRONOMÈTRE
===================================================== */

function startTimer() {

    state.time =
        QUESTION_TIME;

    const timer =
        document.getElementById("timer");

    timer.textContent =
        state.time;

    timer.classList.remove("low");

    state.timer =
        setInterval(
            () => {

                state.time--;

                timer.textContent =
                    state.time;

                if (state.time <= 5) {
                    timer.classList.add("low");
                }

                if (state.time <= 0) {

                    clearInterval(
                        state.timer
                    );

                    answerQuestion(
                        null,
                        false
                    );

                }

            },
            1000
        );

}


/* =====================================================
   RÉPONSE
===================================================== */

function answerQuestion(
    button,
    correct
) {

    if (
        document.querySelector(
            "#quiz-choices button:disabled"
        )
    ) {
        return;
    }

    clearInterval(
        state.timer
    );

    document.querySelectorAll(
        "#quiz-choices button"
    ).forEach(
        b => {
            b.disabled = true;
        }
    );


    if (button) {

        button.classList.add(
            correct
                ? "correct"
                : "wrong"
        );

    }


    if (correct) {

        state.correct++;

        state.score += 10;

    }

    else {

        state.wrong++;

    }


    document.getElementById(
        "quiz-score"
    ).textContent =
        state.score;


    setTimeout(
        () => {

            state.index++;

            if (
                state.index <
                state.questions.length
            ) {

                question();

            }

            else {

                finish();

            }

        },
        700
    );

}


/* =====================================================
   FIN DU QUIZ
===================================================== */

async function finish() {

    const total =
        state.questions.length * 10;

    document.getElementById(
        "result-score"
    ).textContent =
        state.score;

    document.getElementById(
        "result-total"
    ).textContent =
        total;

    document.getElementById(
        "result-correct"
    ).textContent =
        state.correct;

    document.getElementById(
        "result-wrong"
    ).textContent =
        state.wrong;


    const ratio =
        total > 0
            ? state.score / total
            : 0;


    document.getElementById(
        "result-message"
    ).textContent =

        ratio === 1
            ? "🏆 Excellent ! Score parfait."
            : ratio >= 0.7
                ? "👏 Très bon résultat."
                : ratio >= 0.5
                    ? "👍 Bon travail."
                    : "💪 Continue à t'entraîner.";


    await saveScore();

    screen("result");

}


/* =====================================================
   SERVEUR — ENVOYER LE SCORE
===================================================== */

async function sendScoreToServer(
    name,
    score
) {

    try {

        const response =
            await fetch(
                `${API_URL}/api/players`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        score: score
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Erreur HTTP ${response.status}`
            );

        }


        const data =
            await response.json();

        console.log(
            "✅ Score envoyé au serveur :",
            data
        );

        return data;

    }

    catch (error) {

        console.error(
            "❌ Impossible d'envoyer le score :",
            error
        );

        return null;

    }

}


/* =====================================================
   SAUVEGARDER LE SCORE
===================================================== */

async function saveScore() {

    const name =
        localStorage.getItem(
            "name"
        ) || "Joueur";


    const scores =
        getScores();


    scores.push({

        name: name,

        score: state.score,

        category:
            categories[state.category].name,

        correct:
            state.correct,

        wrong:
            state.wrong,

        date:
            new Date().toLocaleString()

    });


    localStorage.setItem(
        "scores",
        JSON.stringify(scores)
    );


    /*
       Envoi vers Render
    */

    await sendScoreToServer(
        name,
        state.score
    );


    updateProfile();

}


/* =====================================================
   SCORES LOCAUX
===================================================== */

function getScores() {

    return JSON.parse(
        localStorage.getItem(
            "scores"
        ) || "[]"
    );

}


/* =====================================================
   RÉCUPÉRER LE CLASSEMENT DU SERVEUR
===================================================== */

async function getServerRanking() {

    try {

        const response =
            await fetch(
                `${API_URL}/api/ranking`
            );


        if (!response.ok) {

            throw new Error(
                `Erreur HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "🏆 Classement serveur :",
            data
        );


        return data.ranking || [];

    }

    catch (error) {

        console.error(
            "❌ Erreur classement serveur :",
            error
        );

        return [];

    }

}


/* =====================================================
   CLASSEMENT
===================================================== */

async function showRanking() {

    const list =
        document.getElementById(
            "ranking-list"
        );

    const podium =
        document.getElementById(
            "podium"
        );

    const myBox =
        document.getElementById(
            "my-ranking"
        );


    if (list) {
        list.innerHTML =
            "<p class='muted'>Chargement du classement...</p>";
    }


    screen("ranking");


    const players =
        await getServerRanking();


    const name =
        localStorage.getItem(
            "name"
        ) || "Joueur";


    /*
       Mon classement
    */

    const myIndex =
        players.findIndex(
            player =>
                player.name === name
        );


    if (myIndex >= 0) {

        const me =
            players[myIndex];


        myBox.innerHTML = `

            <div class="my-ranking-title">
                TON CLASSEMENT
            </div>

            <div class="my-ranking-main">

                <div>

                    <strong>
                        #${myIndex + 1}
                    </strong>

                    <div>
                        ${escapeHtml(me.name)}
                    </div>

                </div>

                <div>

                    <strong>
                        ${me.score}
                    </strong>

                    <div>
                        points
                    </div>

                </div>

            </div>

        `;

    }

    else {

        myBox.innerHTML = `

            <div class="my-ranking-title">
                TON CLASSEMENT
            </div>

            <p class="muted">
                Joue une partie pour apparaître dans le classement.
            </p>

        `;

    }


    /*
       Podium
    */

    podium.innerHTML = "";


    const order = [
        1,
        0,
        2
    ];


    order.forEach(
        position => {

            const player =
                players[position];

            if (!player) {
                return;
            }


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "podium-player " +
                (
                    position === 0
                        ? "first"
                        : position === 1
                            ? "second"
                            : "third"
                );


            const medal =
                position === 0
                    ? "🥇"
                    : position === 1
                        ? "🥈"
                        : "🥉";


            div.innerHTML = `

                <div class="podium-avatar">
                    ${medal}
                </div>

                <div class="podium-name">
                    ${escapeHtml(player.name)}
                </div>

                <div class="podium-score">
                    ${player.score} points
                </div>

                <div class="podium-rank">
                    #${position + 1}
                </div>

            `;


            podium.appendChild(div);

        }
    );


    /*
       Liste générale
    */

    list.innerHTML = "";


    if (!players.length) {

        list.innerHTML =
            "<p class='muted'>Aucun joueur classé.</p>";

    }

    else {

        players
            .slice(0, 20)
            .forEach(
                (player, index) => {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "ranking-row " +
                        (
                            player.name === name
                                ? "me"
                                : ""
                        );


                    row.innerHTML = `

                        <span>
                            #${index + 1}
                        </span>

                        <span class="ranking-name">
                            ${escapeHtml(player.name)}
                        </span>

                        <span>
                            ${player.games} 🎮
                        </span>

                        <span class="ranking-score">
                            ${player.score} pts
                        </span>

                    `;


                    list.appendChild(row);

                }
            );

    }


    updateProfile();

}


/* =====================================================
   SÉCURITÉ HTML
===================================================== */

function escapeHtml(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   PROFIL
===================================================== */

function updateProfile() {

    const name =
        localStorage.getItem(
            "name"
        ) || "Joueur";


    const nameTop =
        document.getElementById(
            "profile-name"
        );

    const panelName =
        document.getElementById(
            "profile-panel-name"
        );


    if (nameTop) {
        nameTop.textContent =
            name;
    }


    if (panelName) {
        panelName.textContent =
            name;
    }


    const scores =
        getScores();


    const mine =
        scores.filter(
            x => x.name === name
        );


    const points =
        mine.reduce(
            (sum, x) =>
                sum + x.score,
            0
        );


    const games =
        mine.length;


    const best =
        games
            ? Math.max(
                ...mine.map(
                    x => x.score
                )
            )
            : 0;


    const average =
        games
            ? Math.round(
                points / games
            )
            : 0;


    document.getElementById(
        "profile-score"
    ).textContent =
        points;


    document.getElementById(
        "profile-games"
    ).textContent =
        games;


    document.getElementById(
        "profile-best"
    ).textContent =
        best;


    document.getElementById(
        "profile-average"
    ).textContent =
        average;


    updateTickets();

}


/* =====================================================
   PORTEFEUILLE
===================================================== */

function getWallet() {

    return JSON.parse(

        localStorage.getItem(
            "wallet"
        )

        ||

        JSON.stringify({

            balance: 0,

            winnings: 0,

            withdrawn: 0,

            history: []

        })

    );

}


function updateWallet() {

    const wallet =
        getWallet();


    const balance =
        document.getElementById(
            "available-balance"
        );

    const winnings =
        document.getElementById(
            "total-winnings"
        );

    const withdrawn =
        document.getElementById(
            "total-withdrawn"
        );


    if (balance) {

        balance.textContent =
            wallet.balance +
            " HTG";

    }


    if (winnings) {

        winnings.textContent =
            wallet.winnings +
            " HTG";

    }


    if (withdrawn) {

        withdrawn.textContent =
            wallet.withdrawn +
            " HTG";

    }

}


/* =====================================================
   HISTORIQUE
===================================================== */

function showHistory() {

    const wallet =
        getWallet();


    const box =
        document.getElementById(
            "history-list"
        );


    box.innerHTML = "";


    if (
        !wallet.history ||
        !wallet.history.length
    ) {

        box.innerHTML =
            "<p class='muted'>Aucune activité.</p>";

    }

    else {

        wallet.history.forEach(
            item => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "ranking-row";


                row.innerHTML = `

                    <span>
                        ${item.icon || "📜"}
                    </span>

                    <span class="ranking-name">

                        ${escapeHtml(
                            item.text || ""
                        )}

                        <br>

                        <small>
                            ${escapeHtml(
                                item.date || ""
                            )}
                        </small>

                    </span>

                    <span class="ranking-score">
                        ${item.amount || 0} HTG
                    </span>

                `;


                box.appendChild(row);

            }
        );

    }


    screen("history");

}


/* =====================================================
   PROFIL — OUVRIR
===================================================== */

document.getElementById(
    "btn-profile"
).onclick = () => {

    document.getElementById(
        "profile-name-input"
    ).value =
        localStorage.getItem(
            "name"
        ) || "";


    document.getElementById(
        "profile-phone-input"
    ).value =
        localStorage.getItem(
            "phone"
        ) || "";


    document.getElementById(
        "profile-panel"
    ).classList.add(
        "active"
    );

};


/* =====================================================
   PROFIL — FERMER
===================================================== */

document.getElementById(
    "btn-close-profile"
).onclick = () => {

    document.getElementById(
        "profile-panel"
    ).classList.remove(
        "active"
    );

};


/* =====================================================
   ENREGISTRER PROFIL
===================================================== */

document.getElementById(
    "btn-save-profile"
).onclick = () => {

    const name =
        document.getElementById(
            "profile-name-input"
        ).value.trim();


    const phone =
        document.getElementById(
            "profile-phone-input"
        ).value.trim();


    if (name.length < 2) {

        alert(
            "Entre ton nom."
        );

        return;
    }


    if (phone.length < 8) {

        alert(
            "Entre un numéro valide."
        );

        return;
    }


    localStorage.setItem(
        "name",
        name
    );


    localStorage.setItem(
        "phone",
        phone
    );


    updateProfile();


    document.getElementById(
        "profile-panel"
    ).classList.remove(
        "active"
    );


    alert(
        "✅ Profil enregistré."
    );

};


/* =====================================================
   NAVIGATION
===================================================== */

document.getElementById(
    "btn-how-to"
).onclick = () => {

    screen("how-to");

};


document.getElementById(
    "btn-how-to-back"
).onclick = () => {

    screen("home");

};


document.getElementById(
    "btn-gains"
).onclick = () => {

    updateWallet();

    screen("gains");

};


document.getElementById(
    "btn-gains-back"
).onclick = () => {

    screen("home");

};


document.getElementById(
    "btn-history"
).onclick =
    showHistory;


document.getElementById(
    "btn-history-back"
).onclick = () => {

    screen("home");

};


document.getElementById(
    "btn-ranking-home"
).onclick = () => {

    screen("home");

};


document.getElementById(
    "btn-result-ranking"
).onclick =
    showRanking;


document.getElementById(
    "btn-home"
).onclick = () => {

    screen("home");

};


document.getElementById(
    "btn-quit"
).onclick = () => {

    clearInterval(
        state.timer
    );

    screen("home");

};


document.getElementById(
    "btn-replay"
).onclick = () => {

    startQuiz(
        state.category
    );

};


/* =====================================================
   RETRAIT
===================================================== */

document.getElementById(
    "btn-withdraw"
).onclick = () => {

    const phone =
        localStorage.getItem(
            "phone"
        );


    const wallet =
        getWallet();


    const status =
        document.getElementById(
            "withdraw-status"
        );


    if (!phone) {

        status.textContent =
            "⚠️ Enregistre ton numéro dans ton profil.";

        return;
    }


    if (wallet.balance <= 0) {

        status.textContent =
            "⚠️ Ton solde est de 0 HTG.";

        return;
    }


    status.textContent =
        "⚠️ Le retrait réel n'est pas encore connecté.";

};


/* =====================================================
   INITIALISATION
===================================================== */

renderCategories();

loadTickets();

updateProfile();

updateWallet();

setInterval(
    ticketTimer,
    1000
);


/* =====================================================
   TEST DE CONNEXION SERVEUR
===================================================== */

async function testServer() {

    try {

        const response =
            await fetch(
                `${API_URL}/api`
            );


        const data =
            await response.json();


        console.log(
            "🟢 Serveur Konkou connecté :",
            data
        );

    }

    catch (error) {

        console.error(
            "🔴 Serveur Konkou inaccessible :",
            error
        );

    }

}


testServer();
