// 初始化 Firebase
const roster = {};
const players = {};

firebase.initializeApp({
  apiKey: "AIzaSyBf1kfIKDTITQ-CxcQ7q4a7mLMh96r3gVI",
  authDomain: "basketball-record-84713.firebaseapp.com",
  projectId: "basketball-record-84713",
});
const db = firebase.firestore();

// 抓取名單，填入選單
db.collection("roster").get().then(snapshot => {
  snapshot.forEach(doc => {
    const player = doc.data();
    roster[player.number] = player;

    const option = document.createElement("option");
    option.value = player.number;
    option.text = `#${player.number} - ${player.name}`;
    document.getElementById("player-select").appendChild(option);
  });
  updateSortableHeaders();
});

function addSelectedPlayer() {
  const number = document.getElementById("player-select").value;
  if (!number) return alert("請先選擇球員");
  const selected = roster[number];
  if (!selected) return alert("找不到該球員");
  if (players[number]) return alert("該球員已加入");

  players[number] = {
    name: selected.name,
    stats: {
      score: 0,
      twoMade: 0,
      twoMiss: 0,
      threeMade: 0,
      threeMiss: 0,
      ftMade: 0,
      ftMiss: 0,
      assist: 0,
      offensive_rebound: 0,
      defensive_rebound: 0,
      steal: 0,
      block: 0,
      turnover: 0,
      foul: 0
    }
  };

  renderPlayerRow(number);
  document.getElementById("player-select").value = "";
}

function renderPlayerRow(number) {
  const stats = players[number].stats;
  const table = document.getElementById("player-table");
  const row = document.createElement("tr");
  row.setAttribute("id", `player-${number}`);

  function createSplitShotControl(type) {
    const totalId = `display-${type}-${number}`;
    return `
      <div class="shot-control">
        <div class="top-row">
          <button onclick="addMade('${number}', '${type}', 1)">▲</button>
          <button onclick="addMiss('${number}', '${type}', 1)">▲</button>
        </div>
        <div id="${totalId}" class="score-display">${stats[`${type}Made`]}-${stats[`${type}Made`] + stats[`${type}Miss`]}</div>
        <div class="bottom-row">
          <button onclick="addMade('${number}', '${type}', -1)">▼</button>
          <button onclick="addMiss('${number}', '${type}', -1)">▼</button>
        </div>
      </div>`;
  }

  function createStatControl(stat) {
    return `<div class="stat-control">
              <button onclick="addStat('${number}', '${stat}', 1)">▲</button>
              <div id="${stat}-${number}" class="stat-value">${stats[stat]}</div>
              <button onclick="addStat('${number}', '${stat}', -1)">▼</button>
            </div>`;
  }

  row.innerHTML = `
    <td>${number}</td>
    <td>${players[number].name}</td>
    <td>${createSplitShotControl('two')}</td>
    <td id="percent-2pt-${number}">0%</td>
    <td>${createSplitShotControl('three')}</td>
    <td id="percent-3pt-${number}">0%</td>
    <td>${createSplitShotControl('ft')}</td>
    <td id="percent-ft-${number}">0%</td>
    <td id="score-${number}">0</td>
    <td>${createStatControl('assist')}</td>
    <td>${createStatControl('offensive_rebound')}</td>
    <td>${createStatControl('defensive_rebound')}</td>
    <td>${createStatControl('steal')}</td>
    <td>${createStatControl('block')}</td>
    <td>${createStatControl('turnover')}</td>
    <td>${createStatControl('foul')}</td>
  `;

  table.appendChild(row);
  updateUI(number);
}

function addMade(number, type, delta) {
  const stats = players[number].stats;
  const key = `${type}Made`;
  stats[key] = Math.max(0, stats[key] + delta);
  stats.score = stats.twoMade * 2 + stats.threeMade * 3 + stats.ftMade;
  updateUI(number);
  updateTeamTotal();
}

function addMiss(number, type, delta) {
  const stats = players[number].stats;
  const key = `${type}Miss`;
  stats[key] = Math.max(0, stats[key] + delta);
  updateUI(number);
  updateTeamTotal();
}

function addStat(number, type, delta) {
  const stats = players[number].stats;
  stats[type] = Math.max(0, stats[type] + delta);
  stats.score = stats.twoMade * 2 + stats.threeMade * 3 + stats.ftMade;
  updateUI(number);
  updateTeamTotal();
}

function updateUI(number) {
  const stats = players[number].stats;
  document.getElementById(`score-${number}`).innerText = stats.score;

  function pct(made, miss) {
    const total = made + miss;
    return total ? `${Math.round((made / total) * 100)}%` : '0%';
  }

  document.getElementById(`percent-2pt-${number}`).innerText = pct(stats.twoMade, stats.twoMiss);
  document.getElementById(`percent-3pt-${number}`).innerText = pct(stats.threeMade, stats.threeMiss);
  document.getElementById(`percent-ft-${number}`).innerText = pct(stats.ftMade, stats.ftMiss);

  document.getElementById(`display-two-${number}`).innerText = `${stats.twoMade}-${stats.twoMade + stats.twoMiss}`;
  document.getElementById(`display-three-${number}`).innerText = `${stats.threeMade}-${stats.threeMade + stats.threeMiss}`;
  document.getElementById(`display-ft-${number}`).innerText = `${stats.ftMade}-${stats.ftMade + stats.ftMiss}`;

  for (let key in stats) {
    const el = document.getElementById(`${key}-${number}`);
    if (el && el.classList.contains("stat-value")) el.innerText = stats[key];
  }
}

function updateTeamTotal() {
  const total = {
    twoMade: 0, twoMiss: 0,
    threeMade: 0, threeMiss: 0,
    ftMade: 0, ftMiss: 0,
    score: 0, assist: 0,
    offensive_rebound: 0, defensive_rebound: 0,
    steal: 0, block: 0, turnover: 0, foul: 0
  };

  for (let number in players) {
    const stats = players[number].stats;
    for (let key in total) {
      total[key] += stats[key];
    }
  }

  document.getElementById("team-2pt").innerText = `${total.twoMade}-${total.twoMade + total.twoMiss}`;
  document.getElementById("team-2pt-pct").innerText = calcPct(total.twoMade, total.twoMiss);
  document.getElementById("team-3pt").innerText = `${total.threeMade}-${total.threeMade + total.threeMiss}`;
  document.getElementById("team-3pt-pct").innerText = calcPct(total.threeMade, total.threeMiss);
  document.getElementById("team-ft").innerText = `${total.ftMade}-${total.ftMade + total.ftMiss}`;
  document.getElementById("team-ft-pct").innerText = calcPct(total.ftMade, total.ftMiss);
  document.getElementById("team-score").innerText = total.score;
  document.getElementById("team-assist").innerText = total.assist;
  document.getElementById("team-offreb").innerText = total.offensive_rebound;
  document.getElementById("team-defreb").innerText = total.defensive_rebound;
  document.getElementById("team-steal").innerText = total.steal;
  document.getElementById("team-block").innerText = total.block;
  document.getElementById("team-turnover").innerText = total.turnover;
  document.getElementById("team-foul").innerText = total.foul;
}

function calcPct(made, miss) {
  const total = made + miss;
  return total ? `${Math.round((made / total) * 100)}%` : '0%';
}

function sortTable(n) {
  const table = document.getElementById("stats-table");
  const rows = Array.from(table.querySelectorAll("tbody tr")).filter(r => !r.classList.contains("team-total"));
  const header = table.querySelectorAll("th")[n];
  const isAsc = header.classList.toggle("asc");
  table.querySelectorAll("th").forEach(th => th !== header && th.classList.remove("asc", "desc"));
  header.classList.toggle("desc", !isAsc);

  rows.sort((a, b) => {
    const getCellValue = (row, index) => {
      const text = row.children[index].innerText.trim();
      if (text.includes('-')) return parseFloat(text.split('-')[0]) || 0;
      if (text.includes('%')) return parseFloat(text.replace('%', '')) || 0;
      return isNaN(text) ? text : parseFloat(text);
    };

    const x = getCellValue(a, n);
    const y = getCellValue(b, n);

    if (typeof x === "number" && typeof y === "number") {
      return isAsc ? x - y : y - x;
    }
    return isAsc ? x.localeCompare(y) : y.localeCompare(x);
  });

  const tbody = table.querySelector("tbody");
  rows.forEach(row => tbody.insertBefore(row, tbody.querySelector(".team-total")));
}

function updateSortableHeaders() {
  const headers = document.querySelectorAll("#stats-table thead th");
  headers.forEach((th, i) => {
    th.onclick = () => {
      sortTable(i);
      headers.forEach(h => h.classList.remove("sort-asc", "sort-desc"));
      th.classList.add(th.classList.contains("asc") ? "sort-asc" : "sort-desc");
    };
    th.style.cursor = "pointer";
  });
}

function updateScore(team, points) {
  let scoreElement = document.getElementById(`score-team-${team.toLowerCase()}`);
  let currentScore = parseInt(scoreElement.textContent, 10);
  let newScore = Math.max(0, currentScore + points);
  scoreElement.textContent = newScore;
}
