const API_URL = "https://konkou-server-6.onrender.com";

const CATEGORIES = [
  {
    id: "histoire",
    name: "Histoire d'Haïti",
    questions: [
      {
        question: "En quelle année Haïti est-elle devenue indépendante ?",
        choices: ["1791", "1804", "1815", "1822"],
        answerIndex: 1
      },
      {
        question: "Qui a été le premier chef d'État d'Haïti après l'indépendance ?",
        choices: [
          "Toussaint Louverture",
          "Henri Christophe",
          "Jean-Jacques Dessalines",
          "Alexandre Pétion"
        ],
        answerIndex: 2
      },
      {
        question: "Quelle bataille marque une étape importante de la lutte pour l'indépendance en 1803 ?",
        choices: [
          "Bataille de Vertières",
          "Bataille de Crête-à-Pierrot",
          "Bataille de Santo Domingo",
          "Bataille de Léogâne"
        ],
        answerIndex: 0
      }
    ]
  },

  {
    id: "geographie",
    name: "Géographie",
    questions: [
      {
        question: "Quelle est la capitale d'Haïti ?",
        choices: [
          "Cap-Haïtien",
          "Jacmel",
          "Port-au-Prince",
          "Gonaïves"
        ],
        answerIndex: 2
      },
      {
        question: "Avec quel pays Haïti partage-t-elle l'île d'Hispaniola ?",
        choices: [
          "Cuba",
          "Jamaïque",
          "République Dominicaine",
          "Porto Rico"
        ],
        answerIndex: 2
      }
    ]
  },

  {
    id: "sport",
    name: "Sport",
    questions: [
      {
        question: "Quel sport est le plus populaire en Haïti ?",
        choices: [
          "Basketball",
          "Football",
          "Baseball",
          "Boxe"
        ],
        answerIndex: 1
      }
    ]
  }
];

const PAID_CONTEST = {
  id: "concours-semaine",
  name: "🏆 Concours de la semaine",
  entryFee: 50,
  questions: [
    {
      question: "En quelle année Haïti est-elle devenue indépendante ?",
      choices: ["1791", "1804", "1815", "1822"],
      answerIndex: 1
    },
    {
      question: "Quelle est la capitale d'Haïti ?",
      choices: [
        "Cap-Haïtien",
        "Jacmel",
        "Port-au-Prince",
        "Gonaïves"
      ],
      answerIndex: 2
    },
    {
      question: "Quel sport est le plus populaire en Haïti ?",
      choices: [
        "Basketball",
        "Football",
        "Baseball",
        "Boxe"
      ],
      answerIndex: 1
    }
  ]
};

const TIME_PER_QUESTION = 15;
const FREE_TICKETS_PER_DAY = 3;

const state = {
  currentCategory: null,
  currentQuestions: [],
  currentIndex: 0,
  score: 0,
  correctAnswers: 0,
  timer: null,
  timeLeft: TIME_PER_QUESTION,
  tickets: 3,
  answered: false,
  currentPlayerPhone: null
};

const screens = {
  home: document.getElementById("screen-home"),
  payment: document.getElementById("screen-payment"),
  quiz: document.getElementById("screen-quiz"),
  result: document.getElementById("screen-result")
};

const el = {
  ticketCount: document.getElementById("ticket-count"),
  ticketCountHome: document.getElementById("ticket-count-home"),
  categoryList: document.getElementById("category-list"),

  quizCategory: document.getElementById("quiz-category"),
  quizQuestion: document.getElementById("quiz-question"),
  quizChoices: document.getElementById("quiz-choices"),
  quizScore: document.getElementById("quiz-score"),
  quizProgress: document.getElementById("quiz-progress"),
  progressFill: document.getElementById("progress-fill"),
  timer: document.getElementById("timer"),

  resultScore: document.getElementById("result-score"),
  resultTotal: document.getElementById("result-total"),
  resultMessage: document.getElementById("result-message"),
  resultBadge: document.getElementById("result-badge"),
  contestStandings: document.getElementById("contest-standings"),

  paymentFee: document.getElementById("payment-fee"),
  paymentPlayers: document.getElementById("payment-players"),
  paymentPot: document.getElementById("payment-pot"),
  paymentPhone: document.getElementById("payment-phone"),
  paymentStatus: document.getElementById("payment-status"),

  btnPay: document.getElementById("btn-pay"),
  btnPaymentCancel: document.getElementById("btn-payment-cancel"),
  btnQuit: document.getElementById("btn-quit"),
  btnReplay: document.getElementById("btn-replay"),
  btnHome: document.getElementById("btn-home")
};


/* =====================================================
   NAVIGATION
===================================================== */

function showScreen(name) {

  Object.values(screens).forEach(screen => {

    if (screen) {
      screen.classList.remove("active");
    }

  });

  if (screens[name]) {
    screens[name].classList.add("active");
  }
}


/* =====================================================
   CATÉGORIES
===================================================== */

function renderCategories() {

  if (!el.categoryList) return;

  el.categoryList.innerHTML = "";

  const paidButton =
    document.createElement("button");

  paidButton.className =
    "paid-contest-btn";

  paidButton.innerHTML = `
    <span>${PAID_CONTEST.name}</span>
    <span class="cat-count">
      Entrée : ${PAID_CONTEST.entryFee} HTG
    </span>
  `;

  paidButton.addEventListener(
    "click",
    openPaymentScreen
  );

  el.categoryList.appendChild(
    paidButton
  );

  CATEGORIES.forEach(category => {

    const button =
      document.createElement("button");

    button.innerHTML = `
      <span>${category.name}</span>
      <span class="cat-count">
        ${category.questions.length} questions
      </span>
    `;

    button.addEventListener(
      "click",
      () => startQuiz(category)
    );

    el.categoryList.appendChild(
      button
    );

  });
}


/* =====================================================
   TICKETS
===================================================== */

function getToday() {

  const date = new Date();

  return (
    date.getFullYear() +
    "-" +
    String(
      date.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      date.getDate()
    ).padStart(2, "0")
  );
}


function updateTickets() {

  const today = getToday();

  let saved = null;

  try {

    saved = JSON.parse(
      localStorage.getItem(
        "konkou_tickets"
      )
    );

  } catch {

    saved = null;

  }

  if (
    saved &&
    saved.date === today
  ) {

    state.tickets =
      saved.count;

  } else {

    state.tickets =
      FREE_TICKETS_PER_DAY;

    saveTickets();

  }

  refreshTicketDisplay();
}


function saveTickets() {

  localStorage.setItem(
    "konkou_tickets",
    JSON.stringify({
      date: getToday(),
      count: state.tickets
    })
  );

  refreshTicketDisplay();
}


function refreshTicketDisplay() {

  if (el.ticketCount) {
    el.ticketCount.textContent =
      state.tickets;
  }

  if (el.ticketCountHome) {
    el.ticketCountHome.textContent =
      state.tickets;
  }
}


function useTicket() {

  if (state.tickets <= 0) {
    return false;
  }

  state.tickets--;

  saveTickets();

  return true;
}


/* =====================================================
   CONCOURS LOCAL
===================================================== */

function getContestEntries() {

  try {

    return (
      JSON.parse(
        localStorage.getItem(
          "konkou_contest_entries"
        )
      ) || []
    );

  } catch {

    return [];

  }
}


function saveContestEntries(entries) {

  localStorage.setItem(
    "konkou_contest_entries",
    JSON.stringify(entries)
  );

}


function addPlayerToPot(phone) {

  const entries =
    getContestEntries();

  const alreadyExists =
    entries.some(
      entry =>
        entry.phone === phone
    );

  if (!alreadyExists) {

    entries.push({
      phone: phone,
      score: null,
      joinedAt: Date.now()
    });

    saveContestEntries(entries);

  }

}


/* =====================================================
   PAIEMENT
===================================================== */

function refreshPaymentSummary() {

  const entries =
    getContestEntries();

  const total =
    entries.length *
    PAID_CONTEST.entryFee;

  if (el.paymentFee) {

    el.paymentFee.textContent =
      `${PAID_CONTEST.entryFee} HTG`;

  }

  if (el.paymentPlayers) {

    el.paymentPlayers.textContent =
      entries.length;

  }

  if (el.paymentPot) {

    el.paymentPot.textContent =
      `${total} HTG`;

  }

}


function openPaymentScreen() {

  if (el.paymentPhone) {
    el.paymentPhone.value = "";
  }

  if (el.paymentStatus) {

    el.paymentStatus.textContent =
      "";

    el.paymentStatus.className =
      "payment-status";

  }

  if (el.btnPay) {

    el.btnPay.disabled = false;

    el.btnPay.textContent =
      "Payer et rejoindre";

  }

  refreshPaymentSummary();

  showScreen("payment");
}


if (el.btnPaymentCancel) {

  el.btnPaymentCancel.addEventListener(
    "click",
    () => showScreen("home")
  );

}


if (el.btnPay) {

  el.btnPay.addEventListener(
    "click",
    async () => {

      const phone =
        el.paymentPhone.value
          .replace(/\s+/g, "")
          .trim();

      if (!/^\d{8}$/.test(phone)) {

        el.paymentStatus.textContent =
          "Entre un numéro MonCash valide à 8 chiffres.";

        el.paymentStatus.className =
          "payment-status error";

        return;

      }

      el.btnPay.disabled = true;

      el.btnPay.textContent =
        "Inscription...";

      el.paymentStatus.textContent =
        "Enregistrement du joueur...";

      state.currentPlayerPhone =
        phone;

      const registered =
        await registerPlayerToContest();

      if (!registered) {

        el.paymentStatus.textContent =
          "Impossible d'enregistrer le joueur.";

        el.paymentStatus.className =
          "payment-status error";

        el.btnPay.disabled = false;

        el.btnPay.textContent =
          "Payer et rejoindre";

        return;

      }

      addPlayerToPot(phone);

      el.paymentStatus.textContent =
        "✅ Inscription confirmée !";

      el.paymentStatus.className =
        "payment-status success";

      setTimeout(() => {

        startQuiz(PAID_CONTEST);

      }, 800);

    }
  );

}


/* =====================================================
   QUIZ
===================================================== */

function startQuiz(category) {

  const isPaid =
    category.id === PAID_CONTEST.id;

  if (
    !isPaid &&
    !useTicket()
  ) {

    alert(
      "Tu n'as plus de tickets aujourd'hui. Reviens demain !"
    );

    return;

  }

  state.currentCategory =
    category;

  state.currentQuestions =
    shuffle([
      ...category.questions
    ]);

  state.currentIndex = 0;

  state.score = 0;

  state.correctAnswers = 0;

  state.answered = false;

  showScreen("quiz");

  showQuestion();
}


/* =====================================================
   MÉLANGE
===================================================== */

function shuffle(array) {

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      array[i],
      array[j]
    ] = [
      array[j],
      array[i]
    ];

  }

  return array;
}


/* =====================================================
   QUESTION
===================================================== */

function showQuestion() {

  state.answered = false;

  const question =
    state.currentQuestions[
      state.currentIndex
    ];

  el.quizCategory.textContent =
    state.currentCategory.name;

  el.quizQuestion.textContent =
    question.question;

  el.quizScore.textContent =
    state.score;

  el.quizProgress.textContent =
    `Question ${
      state.currentIndex + 1
    } sur ${
      state.currentQuestions.length
    }`;

  const progress =
    (
      state.currentIndex /
      state.currentQuestions.length
    ) * 100;

  el.progressFill.style.width =
    progress + "%";

  el.quizChoices.innerHTML = "";

  const choices =
    question.choices.map(
      (text, index) => ({
        text: text,
        isCorrect:
          index ===
          question.answerIndex
      })
    );

  shuffle(choices);

  choices.forEach(choice => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent =
      choice.text;

    button.addEventListener(
      "click",
      () => {

        selectAnswer(
          button,
          choice.isCorrect
        );

      }
    );

    el.quizChoices.appendChild(
      button
    );

  });

  startTimer();
}


/* =====================================================
   TIMER
===================================================== */

function startTimer() {

  clearInterval(
    state.timer
  );

  state.timeLeft =
    TIME_PER_QUESTION;

  el.timer.textContent =
    state.timeLeft;

  el.timer.classList.remove(
    "low"
  );

  state.timer =
    setInterval(() => {

      state.timeLeft--;

      el.timer.textContent =
        state.timeLeft;

      if (
        state.timeLeft <= 5
      ) {

        el.timer.classList.add(
          "low"
        );

      }

      if (
        state.timeLeft <= 0
      ) {

        clearInterval(
          state.timer
        );

        if (
          !state.answered
        ) {

          selectAnswer(
            null,
            false
          );

        }

      }

    }, 1000);

}


/* =====================================================
   RÉPONSE
===================================================== */

function selectAnswer(
  button,
  isCorrect
) {

  if (state.answered) {
    return;
  }

  state.answered = true;

  clearInterval(
    state.timer
  );

  const buttons =
    el.quizChoices
      .querySelectorAll(
        "button"
      );

  buttons.forEach(
    currentButton => {

      currentButton.disabled =
        true;

      if (
        currentButton ===
        button
      ) {

        currentButton.classList.add(
          isCorrect
            ? "correct"
            : "wrong"
        );

      }

    }
  );

  if (isCorrect) {

    state.score += 10;

    state.correctAnswers++;

    el.quizScore.textContent =
      state.score;

  }

  setTimeout(() => {

    state.currentIndex++;

    if (
      state.currentIndex <
      state.currentQuestions.length
    ) {

      showQuestion();

    } else {

      finishQuiz();

    }

  }, 700);

}


/* =====================================================
   INSCRIPTION SERVEUR
===================================================== */

async function registerPlayerToContest() {

  const playerName =
    localStorage.getItem(
      "konkou_player_name"
    ) ||
    localStorage.getItem(
      "playerName"
    );

  if (
    !playerName ||
    playerName.trim().length < 2
  ) {

    console.error(
      "❌ Nom du joueur introuvable."
    );

    return false;

  }

  try {

    console.log(
      "📤 Inscription de :",
      playerName
    );

    const response =
      await fetch(
        `${API_URL}/api/register`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name:
              playerName.trim()
          })
        }
      );

    const data =
      await response.json();

    console.log(
      "📥 Réponse inscription :",
      data
    );

    if (
      !response.ok ||
      !data.success
    ) {

      console.error(
        "❌ Inscription refusée :",
        data
      );

      return false;

    }

    console.log(
      "✅ Joueur enregistré :",
      data.player
    );

    return true;

  } catch (error) {

    console.error(
      "❌ Erreur inscription :",
      error
    );

    return false;

  }

}


/* =====================================================
   ENVOYER LE SCORE
===================================================== */

async function sendScoreToServer() {

  const playerName =
    localStorage.getItem(
      "konkou_player_name"
    ) ||
    localStorage.getItem(
      "playerName"
    );

  if (
    !playerName ||
    playerName.trim().length < 2
  ) {

    console.error(
      "❌ Nom du joueur introuvable pour le score."
    );

    return null;

  }

  try {

    console.log(
      "📤 Envoi du score :",
      playerName,
      state.score
    );

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

            name:
              playerName.trim(),

            score:
              Number(state.score)

          })
        }
      );

    const data =
      await response.json();

    console.log(
      "📥 Réponse score :",
      data
    );

    if (
      !response.ok ||
      !data.success
    ) {

      console.error(
        "❌ Score refusé :",
        data
      );

      return null;

    }

    console.log(
      `✅ ${data.player.name} possède maintenant ${data.player.score} points`
    );

    return data;

  } catch (error) {

    console.error(
      "❌ Impossible d'envoyer le score :",
      error
    );

    return null;

  }

}


/* =====================================================
   CHARGER LE CLASSEMENT
===================================================== */

async function loadContestRanking() {

  try {

    const response =
      await fetch(
        `${API_URL}/api/ranking`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const data =
      await response.json();

    console.log(
      "📊 Classement serveur :",
      data
    );

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        "Classement indisponible."
      );

    }

    const ranking =
      data.ranking || [];

    el.contestStandings.innerHTML =
      "";

    if (
      ranking.length === 0
    ) {

      el.contestStandings.innerHTML =
        "<p>Aucun joueur pour le moment.</p>";

      el.contestStandings.style.display =
        "block";

      return;

    }

    ranking.forEach(
      player => {

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "contest-player";

        item.innerHTML = `
          <span>
            #${player.rank}
            ${player.name}
          </span>

          <strong>
            ${player.score} points
          </strong>
        `;

        el.contestStandings.appendChild(
          item
        );

      }
    );

    el.contestStandings.style.display =
      "block";

  } catch (error) {

    console.error(
      "❌ Erreur classement :",
      error
    );

    el.contestStandings.innerHTML =
      "<p>Impossible de charger le classement.</p>";

    el.contestStandings.style.display =
      "block";

  }

}


/* =====================================================
   FIN DU QUIZ
===================================================== */

async function finishQuiz() {

  clearInterval(
    state.timer
  );

  const total =
    state.currentQuestions.length *
    10;

  el.resultScore.textContent =
    state.score;

  el.resultTotal.textContent =
    total;

  const ratio =
    total > 0
      ? state.score / total
      : 0;

  if (ratio === 1) {

    el.resultMessage.textContent =
      "🎉 Parfait ! Tu as répondu juste à toutes les questions !";

  } else if (ratio >= 0.7) {

    el.resultMessage.textContent =
      "👏 Très bien ! Tu maîtrises bien cette catégorie.";

  } else if (ratio >= 0.5) {

    el.resultMessage.textContent =
      "👍 Bien joué ! Tu peux encore progresser.";

  } else {

    el.resultMessage.textContent =
      "💪 Continue à t'entraîner pour améliorer ton score !";

  }

  el.resultBadge.style.display =
    ratio >= 0.7
      ? "inline-block"
      : "none";

  el.resultBadge.textContent =
    ratio === 1
      ? "🏆 Score parfait !"
      : "👍 Bien joué !";

  el.contestStandings.style.display =
    "none";

  /* =========================
     SCORE SERVEUR
  ========================= */

  const scoreResult =
    await sendScoreToServer();

  /* =========================
     CLASSEMENT
  ========================= */

  await loadContestRanking();

  showScreen("result");

}


/* =====================================================
   BOUTONS
===================================================== */

if (el.btnQuit) {

  el.btnQuit.addEventListener(
    "click",
    () => {

      clearInterval(
        state.timer
      );

      showScreen("home");

    }
  );

}


if (el.btnReplay) {

  el.btnReplay.addEventListener(
    "click",
    () => {

      if (
        state.currentCategory
      ) {

        startQuiz(
          state.currentCategory
        );

      }

    }
  );

}


if (el.btnHome) {

  el.btnHome.addEventListener(
    "click",
    () => {

      clearInterval(
        state.timer
      );

      showScreen("home");

    }
  );

}


/* =====================================================
   DÉMARRAGE
===================================================== */

renderCategories();

updateTickets();

showScreen("home");

console.log(
  "🏆 KONKOU est prêt !"
);

console.log(
  "🌐 Serveur :",
  API_URL
);

console.log(
  "🗄️ Classement :",
  `${API_URL}/api/ranking`
);
