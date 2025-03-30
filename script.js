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

  if (delta !== 0) logStatChange(number, `${type.toUpperCase()} 命中`);
}

function addMiss(number, type, delta) {
  const stats = players[number].stats;
  const key = `${type}Miss`;
  stats[key] = Math.max(0, stats[key] + delta);
  updateUI(number);
  updateTeamTotal();

  if (delta !== 0) logStatChange(number, `${type.toUpperCase()} 沒中`);
}

function addStat(number, type, delta) {
  const stats = players[number].stats;
  stats[type] = Math.max(0, stats[type] + delta);
  stats.score = stats.twoMade * 2 + stats.threeMade * 3 + stats.ftMade;
  updateUI(number);
  updateTeamTotal();

  if (delta !== 0) logStatChange(number, type);
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
  document.getElementById("score-team-a").textContent = total.score;
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

function updateScore(team, value) {
  if (team === 'A') {
    let scoreA = document.getElementById("score-team-a");
    let newScore = Math.max(0, parseInt(scoreA.textContent) + value); // 確保不會變負數
    scoreA.textContent = newScore;

    // 同步更新隊伍合計得分
    document.getElementById("team-score").textContent = newScore;
  } else if (team === 'B') {
    let scoreB = document.getElementById("score-team-b");
    let newScore = Math.max(0, parseInt(scoreB.textContent) + value);
    scoreB.textContent = newScore;

    if (value > 0) {
      const minutes = Math.floor(gameTime / 60);
      const seconds = gameTime % 60;
      const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

      // 🆕 根據加分值設定動作文字
      let actionText = "";
      if (value === 1) actionText = "罰球得分";
      else if (value === 2) actionText = "兩分進";
      else if (value === 3) actionText = "三分進";
      else actionText = `得 ${value} 分`; // fallback

      const teamNameB = document.getElementById("display-team-b").innerText.trim(); // ✅ 讀使用者輸入的隊名

      const logRow = document.createElement("tr");
      logRow.innerHTML = `
        <td>${currentQuarter}</td>
        <td>${timeStr}</td>
        <td>-</td>
        <td>${actionText}</td>
        <td>${teamNameB}</td>
      `;
      document.querySelector("#score-log tbody").appendChild(logRow);
    }
  }
}


// 記錄當前比賽時間和節數
let gameTime = 600; // 每節10分鐘
let currentQuarter = 1; // 第一節
let intervalId = null;
let isPaused = true; // 初始為暫停狀態

// 開始計時
function startTimer() {
  if (!intervalId && currentQuarter <= 4) { // 確保計時器尚未開始且比賽未結束
    isPaused = false;
    intervalId = setInterval(function() {
      if (!isPaused) { 
        gameTime--;
        updateGameTime();
        if (gameTime === 0) { 
          clearInterval(intervalId);
          intervalId = null;
          nextQuarter(); // 進入下一節
        }
      }
    }, 1000);

    // 按鈕狀態調整
    document.getElementById('start-btn').disabled = true; 
    document.getElementById('pause-btn').disabled = false; 
    document.getElementById('resume-btn').style.display = 'none';
  }
}

// 暫停計時器
function pauseTimer() {
  isPaused = true;
  document.getElementById('pause-btn').disabled = true;
  document.getElementById('resume-btn').style.display = 'inline-block';
}

// 繼續計時
function resumeTimer() {
  isPaused = false;
  document.getElementById('pause-btn').disabled = false;
  document.getElementById('resume-btn').style.display = 'none';
}

// 更新比賽時間顯示
function updateGameTime() {
  const minutes = Math.floor(gameTime / 60);
  const seconds = gameTime % 60;
  document.getElementById('game-time').textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// 進入下一節
function nextQuarter() {
  if (currentQuarter < 4) {
    currentQuarter++;
    gameTime = 600; // 重置為10分鐘
    document.getElementById('quarter').textContent = currentQuarter;

    // 等待手動開始比賽
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('resume-btn').style.display = 'none';
    isPaused = true;
    intervalId = null;
  } else {
    alert('比賽結束');
    stopGame();
  }
}

// 停止比賽（比賽結束）
function stopGame() {
  clearInterval(intervalId);
  intervalId = null;
  document.getElementById('start-btn').disabled = true;
  document.getElementById('pause-btn').disabled = true;
  document.getElementById('resume-btn').disabled = true;
}

// 設定按鈕事件
window.onload = function() {
  updateGameTime();
  document.getElementById('start-btn').addEventListener('click', startTimer);
  document.getElementById('pause-btn').addEventListener('click', pauseTimer);
  document.getElementById('resume-btn').addEventListener('click', resumeTimer);
};

function logStatChange(number, actionType) {
  const player = players[number];
  if (!player) return;

  const minutes = Math.floor(gameTime / 60);
  const seconds = gameTime % 60;
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const logRow = document.createElement("tr");
  logRow.innerHTML = `
    <td>${currentQuarter}</td>
    <td>${timeStr}</td>
    <td>${player.name}</td>
    <td>${actionType}</td>
    <td>IM</td> <!-- 這裡如果你有隊伍資訊可以替換 -->
  `;

  document.querySelector("#score-log tbody").appendChild(logRow);
}

