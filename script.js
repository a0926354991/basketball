// 初始化 Firebase
const roster = {};
const players = {};
const scoreActionStack = [];  // 記錄每一個加分行為

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
    playing_sessions: [], 
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
    <td>
      <div class="sub-button-group" id="sub-control-${number}">
        <button id="in-btn-${number}" onclick="playerSubIn('${number}')">上場</button>
        <button id="out-btn-${number}" onclick="playerSubOut('${number}')">下場</button>
      </div>
    </td>
    <td>${number}</td>
    <td>${players[number].name}</td>
    <td id="playtime-${number}">0:00</td>
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
    <td id="plusminus-${number}">0</td>
    <td id="eff-${number}">0</td>
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

function playerSubIn(number) {
  const player = players[number];
  const alreadyOn = player.playing_sessions.some(s => s.out === null);
  if (!alreadyOn) {
    player.playing_sessions.push({ in: gameTime, out: null });
  }
}

function playerSubOut(number) {
  const player = players[number];
  const session = player.playing_sessions.find(s => s.out === null);
  if (session) {
    session.out = gameTime;
  }
}

function updateUI(number) {
  const stats = players[number].stats;
  document.getElementById(`score-${number}`).innerText = stats.score;

  const fieldGoalAttempt = stats.twoMade + stats.twoMiss + stats.threeMade + stats.threeMiss;
  const fieldGoalMade = stats.twoMade + stats.threeMade;
  const rebounds = stats.offensive_rebound + stats.defensive_rebound;

  const eff = stats.score
    + rebounds
    + stats.assist
    + stats.steal
    + stats.block
    - ((fieldGoalAttempt - fieldGoalMade) + stats.ftMiss + stats.turnover);

  document.getElementById(`eff-${number}`).innerText = eff;

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
    // ⬇️ 把這裡原本的 getCellValue 換成這個新版（有處理 mm:ss）
    const getCellValue = (row, index) => {
      const text = row.children[index].innerText.trim();
    
      if (text.includes(":")) {
        const [m, s] = text.split(":").map(Number);
        return m * 60 + s;
      }
    
      if (text.endsWith('%')) return parseFloat(text.replace('%', '')) || 0;
    
      // ✅ 嘗試解析為數字（支援正負數）
      const num = parseFloat(text);
      if (!isNaN(num)) return num;
    
      return text; // fallback 為字串排序
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
  // 🟥 處理「回復上一動」
  if (value < 0) {
    const lastAction = scoreActionStack.pop();
    if (!lastAction) return;

    const rollbackValue = lastAction.value;

    if (lastAction.team === 'A') {
      const scoreA = document.getElementById("score-team-a");
      const newScore = Math.max(0, parseInt(scoreA.textContent) - rollbackValue);
      scoreA.textContent = newScore;
      document.getElementById("team-score").textContent = newScore;
    } else if (lastAction.team === 'B') {
      const scoreB = document.getElementById("score-team-b");
      const newScore = Math.max(0, parseInt(scoreB.textContent) - rollbackValue);
      scoreB.textContent = newScore;
    }

    // 🟥 刪除最後一筆 scoreboard log（不碰球員紀錄）
    const logs = document.querySelectorAll("#score-log tbody .scoreboard-log");
    if (logs.length > 0) {
      logs[logs.length - 1].remove();
    }

    return;
  }

  // 🟩 正常加分處理
  if (value > 0) {
    // ⬇️ 儲存這次動作
    scoreActionStack.push({ team, value });

    // ⬇️ 更新分數
    if (team === 'A') {
      const scoreA = document.getElementById("score-team-a");
      const newScore = parseInt(scoreA.textContent) + value;
      scoreA.textContent = newScore;
      document.getElementById("team-score").textContent = newScore;
    } else if (team === 'B') {
      const scoreB = document.getElementById("score-team-b");
      const newScore = parseInt(scoreB.textContent) + value;
      scoreB.textContent = newScore;
    }

    // ⬇️ 建立 Play by Play 紀錄
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    let actionText = "";
    if (value === 1) actionText = "罰球得分";
    else if (value === 2) actionText = "兩分進";
    else if (value === 3) actionText = "三分進";
    else actionText = `得 ${value} 分`;

    const teamName = team === 'A'
      ? document.getElementById("display-team-a").innerText.trim()
      : document.getElementById("display-team-b").innerText.trim();

    const logRow = document.createElement("tr");
    logRow.classList.add("scoreboard-log"); // 用於 -1 時可辨識
    logRow.innerHTML = `
      <td>${currentQuarter}</td>
      <td>${timeStr}</td>
      <td>-</td>
      <td>${actionText}</td>
      <td>${teamName}</td>
    `;
    document.querySelector("#score-log tbody").appendChild(logRow);
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
    
        // ⏱️ 更新所有球員的上場時間
        for (let number in players) {
          const player = players[number];
          const totalSeconds = player.playing_sessions.reduce((sum, s) => {
            const start = s.in;
            const end = s.out !== null ? s.out : gameTime;
            return sum + (start - end);
          }, 0);
    
          const m = Math.floor(totalSeconds / 60);
          const s = totalSeconds % 60;
          const display = `${m}:${s.toString().padStart(2, '0')}`;
          const el = document.getElementById(`playtime-${number}`);
          if (el) el.textContent = display;
        }

        // ✅ 更新全隊總時間欄位
        let totalPlaySeconds = 0;
        for (let number in players) {
          const player = players[number];
          const total = player.playing_sessions.reduce((sum, s) => {
            const start = s.in;
            const end = s.out !== null ? s.out : gameTime;
            return sum + (start - end);
          }, 0);
          totalPlaySeconds += total;
        }
        const tm = Math.floor(totalPlaySeconds / 60);
        const ts = totalPlaySeconds % 60;
        document.getElementById("time").textContent = `${tm}:${ts.toString().padStart(2, "0")}`;
    
        if (gameTime === 0) {
          clearInterval(intervalId);
          intervalId = null;
          nextQuarter();
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

function playerSubIn(number) {
  const player = players[number];
  const alreadyOn = player.playing_sessions.some(s => s.out === null);
  if (!alreadyOn) {
    const selfScore = parseInt(document.getElementById("score-team-a").textContent);
    const oppScore = parseInt(document.getElementById("score-team-b").textContent);
    
    player.playing_sessions.push({
      in: gameTime,
      out: null,
      scoreAtIn: { self: selfScore, opponent: oppScore },
      scoreAtOut: null
    });

    document.getElementById(`in-btn-${number}`).classList.add("active");
    document.getElementById(`out-btn-${number}`).classList.remove("inactive");
  }
}

function playerSubOut(number) {
  const player = players[number];
  const session = player.playing_sessions.find(s => s.out === null);
  if (session) {
    session.out = gameTime;

    session.duration = session.in - session.out;

    const selfScore = parseInt(document.getElementById("score-team-a").textContent);
    const oppScore = parseInt(document.getElementById("score-team-b").textContent);

    session.scoreAtOut = { self: selfScore, opponent: oppScore };

    // 計算本段正負值
    const diffIn = session.scoreAtIn.self - session.scoreAtIn.opponent;
    const diffOut = session.scoreAtOut.self - session.scoreAtOut.opponent;
    const plusMinus = diffOut - diffIn;

    player.plusMinus = (player.plusMinus || 0) + plusMinus;

    const el = document.getElementById(`plusminus-${number}`);
    if (el) el.textContent = player.plusMinus >= 0 ? `+${player.plusMinus}` : player.plusMinus;
    
    document.getElementById(`in-btn-${number}`).classList.remove("active");
    document.getElementById(`out-btn-${number}`).classList.add("inactive");
  }
}

function saveGameToFirebase() {
  const gameData = {
    timestamp: new Date(),
    players: {}
  };

  for (let number in players) {
    const player = players[number];
    const stats = player.stats;

    // 🕒 計算總上場時間（秒）
    const totalPlaySeconds = player.playing_sessions.reduce((sum, s) => {
      return sum + (s.duration || 0);
    }, 0);

    // 💡 計算 EFF
    const fieldGoalAttempt = stats.twoMade + stats.twoMiss + stats.threeMade + stats.threeMiss;
    const fieldGoalMade = stats.twoMade + stats.threeMade;
    const rebounds = stats.offensive_rebound + stats.defensive_rebound;

    const eff = stats.score
      + rebounds
      + stats.assist
      + stats.steal
      + stats.block
      - ((fieldGoalAttempt - fieldGoalMade) + stats.ftMiss + stats.turnover);

    gameData.players[number] = {
      name: player.name,
      stats: { ...stats },
      total_play_time: totalPlaySeconds,  // ✅ 這是你要的
      plusMinus: player.plusMinus || 0,
      eff: eff
    };
  }

  // 用日期當作 ID
  const today = new Date();
  const gameId = today.toISOString().split('T')[0];

  db.collection("games").doc(gameId).set(gameData)
    .then(() => {
      alert("比賽資料已儲存！ID: " + gameId);
    })
    .catch((error) => {
      console.error("儲存失敗: ", error);
      alert("儲存失敗");
    });
}

function downloadPlayByPlay() {
  const table = document.querySelector("#score-log");
  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = "";

  // 抓每列資料
  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll("th, td"))
      .map(col => `"${col.innerText.trim()}"`)
      .join(",");
    csvContent += cols + "\n";
  });

  // ✅ 加上 UTF-8 BOM
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // 下載
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "play_by_play.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
