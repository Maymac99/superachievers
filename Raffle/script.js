const wrapper = document.getElementById("status-select-wrapper");
const display = document.getElementById("status-select-display");
const dropdown = document.getElementById("status-select-dropdown");
const checkboxes = dropdown.querySelectorAll("input[type=checkbox]");

let selectedStatuses = [];

// Toggle dropdown on click
display.addEventListener("click", () => {
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

// Update display and array on checkbox change
checkboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    selectedStatuses = Array.from(checkboxes)
      .filter(c => c.checked)
      .map(c => c.value);

    display.textContent =
      selectedStatuses.length > 0 ? selectedStatuses.join(", ") : "Select statuses...";
  });
});

// Close dropdown if clicked outside
document.addEventListener("click", (e) => {
  if (!wrapper.contains(e.target)) {
    dropdown.style.display = "none";
  }
});





(function ($) {

  const DRAWN_KEY = () => `drawnIds`;

  function getDrawnIds() {
    const raw = sessionStorage.getItem(DRAWN_KEY());
    return raw ? raw.split("||") : [];
  }
  function saveDrawnIds(ids) {
    sessionStorage.setItem(DRAWN_KEY(), ids.join("||"));
  }
  function resetDrawnIds() {
    sessionStorage.removeItem(DRAWN_KEY());
  }

  // Reset Hotkey: Ctrl + Alt + M
  let ctrlPressed = false;
  let altPressed = false;

  $(document)
    .keydown(function (e) {
      if (e.keyCode === 91 || e.keyCode === 17) ctrlPressed = true;
      else if (e.key === "Alt") altPressed = true;
      else if ((e.key === "M" || e.key === "m") && ctrlPressed && altPressed) {
        resetDrawnIds();
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("drawnUsers_")) sessionStorage.removeItem(key);
        });
        alert(`Draw reset for`);
      }
    })
    .keyup(function (e) {
      if (e.keyCode === 91 || e.keyCode === 17) ctrlPressed = false;
      else if (e.key === "Alt") altPressed = false;
    });

  // Globals
  let allMembers = [];
  let members = [];
  let isDrawing = false;
  

  // UI Helpers
  function showModal() {
    $("#resultsModal").addClass("show");
    $("body").css("overflow", "hidden");
  }

  function closeModal() {
    $("#resultsModal").removeClass("show");
    $("body").css("overflow", "auto");
  }

  $("#closeModal").on("click", function () {
    if (!isDrawing) closeModal();
  });

  $("#resultsModal").on("click", function (e) {
    if (e.target === this && !isDrawing) closeModal();
  });

  function showError(message) {
    $("#errorMessage h3").text("⚠️ " + message);
    $("#errorMessage").show();
    setTimeout(() => $("#errorMessage").fadeOut(200), 5000);
  }
  function hideError() {
    $("#errorMessage").hide();
  }

  function setLoading(isOn) {
    if (isOn) {
      $("#loader").show();
      $("#winnersList").hide();
    } else {
      $("#loader").hide();
      $("#winnersList").show();
    }
  }

  function updateMemberCount() {
    $("#memberCount").text(Array.isArray(members) ? members.length : 0);
  }

  function updateButtonState(drawing) {
    const $btn = $("#drawButton");
    const $txt = $(".button-text");
    if (drawing) {
      $btn.prop("disabled", true).addClass("drawing");
      $txt.text("DRAWING...");
    } else {
      $btn.prop("disabled", false).removeClass("drawing");
      $txt.text("ROLL THE DRAW!");
    }
  }

  // Fetch data
  async function loadMembers() {
    const url = 'https://script.google.com/macros/s/AKfycbwXd9rVj3CnC636RQkwBAb8-_4blQg0AMaDlc9g-Z6Z-Wdw9alZPma8Ua_9rSd-OGiVIA/exec';
    if (!url) {
        console.warn("No data-url attribute defined for this page.");
        return;
    }
    
    try {
      const res = await fetch(url);
      if (res.status !== 200) throw new Error("Bad response");
      const data = await res.json();
      // Filter data: stop at the first completely blank row
      users = [];
      for (const row of data) {
        const status = (row["Your Status"] || "").trim();
        
        // If all fields are blank, stop processing
        if (status == 'Amount Paid') {
          console.log("Encountered blank row, stopping data fetch");
          break;
        }
        
        // Otherwise, add this row to users
        users.push(row);
      }



      allMembers = Array.isArray(users) ? users.map((m, i) => ({ ...m, _id: i })) : [];
      console.log("Loaded members:", allMembers.length);
    } catch (e) {
      allMembers = [];
      showError("Failed to get data. Please refresh the page.");
    }
  }

  // Confetti + Animation
  function drawWinner(rowName, delay, slotId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const el = document.querySelector(".name-slot-" + slotId);
        if (el) el.innerHTML = rowName || "[Unknown]";
        resolve();
      }, delay);
    });
  }

  function scrollToLatestItem() {
    const list = $("#winnersList")[0];
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }

  async function task(slotId, spinSequence, perStepDelay) {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("winner-item");
    rowDiv.style.opacity = "0";
    rowDiv.style.transform = "translateY(30px)";

    const line = document.createElement("div");
    line.classList.add("name-slot-" + slotId);
    line.textContent = "";
    rowDiv.appendChild(line);

    document.getElementById("winnersList").appendChild(rowDiv);

    setTimeout(() => {
      rowDiv.style.opacity = "1";
      rowDiv.style.transform = "translateY(0)";
    }, 50);

    for (let i = 0; i < spinSequence.length; i++) {
      scrollToLatestItem();
      await drawWinner(spinSequence[i], perStepDelay * (i / Math.max(1, spinSequence.length)), slotId);
    }
  }

  async function startRaffleDraw(finalWinners, totalDurationMs) {
    const SPIN_LEN = 18;
    const perStepCap = 500;

    for (let slotId = 1; slotId <= finalWinners.length; slotId++) {
      const target = finalWinners[slotId - 1];
      const seq = [];
      for (let i = 0; i < SPIN_LEN - 1; i++) {
        const rnd = members[Math.floor(Math.random() * members.length)];
        seq.push(rnd['Full Name']);
      }

      // Display with status (on separate line if in General)
        let displayName;
        
        displayName = `${target['Full Name']}<br><small>${target['Your Status']}</small>`;
        
        seq.push(displayName);

      let perStep = totalDurationMs / seq.length;
      if (perStep > perStepCap) perStep = perStepCap;

      await task(slotId, seq, perStep);
      if (slotId === 1) addCelebrationEffect();
    }
  }

  function addCelebrationEffect() {
    createConfetti();
    $("body").append('<div class="celebration-flash"></div>');
    $(".celebration-flash").css({
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "rgba(255, 215, 0, 0.3)",
      zIndex: "9999",
      pointerEvents: "none",
      animation: "flash 0.5s ease-out",
    });
    $("<style>")
      .prop("type", "text/css")
      .html(`
        @keyframes flash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `)
      .appendTo("head");
    setTimeout(() => $(".celebration-flash").remove(), 500);
  }

  function createConfetti() {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const $c = $('<div class="confetti"></div>');
        $c.css({
          position: "fixed",
          width: "10px",
          height: "10px",
          background: colors[Math.floor(Math.random() * colors.length)],
          left: Math.random() * 100 + "%",
          top: "-10px",
          zIndex: "9998",
          borderRadius: "50%",
          pointerEvents: "none",
          animation: `fall ${2 + Math.random() * 3}s linear forwards`,
        });
        $("body").append($c);
        setTimeout(() => $c.remove(), 5000);
      }, i * 50);
    }
    $("<style>")
      .prop("type", "text/css")
      .html(`
        @keyframes fall {
          to { transform: translateY(100vh) rotate(360deg); }
        }
        .confetti { animation-timing-function: ease-in; }
      `)
      .appendTo("head");
  }

  // Main Flow
  $(document).ready(async function () {
    await loadMembers();

    function filterMembersByStatus() {
      currentStatus = selectedStatuses;    
      
      members = allMembers.filter( 
        (m) => m['Your Status'] && currentStatus.some((status) => m['Your Status'].trim() === status)
      );

      updateMemberCount();
    }

    $("#status-select-dropdown input").on("change", filterMembersByStatus);

    filterMembersByStatus();

    $("#drawButton").on("click", async function () {
      if (isDrawing) return;
      hideError();

      const count = parseInt($("#winner-count").val(), 10);
      if (!count || count < 1) {
        showError("Please enter a valid number of winners (minimum 1).");
        return;
      }
      if (!members.length) {
        showError("No members loaded for this status.");
        return;
      }

      const alreadyDrawn = getDrawnIds();
      const undrawnPool = members.filter((m) => !alreadyDrawn.includes(String(m._id)));
      

      if (count > undrawnPool.length) {
        showError(`Only ${undrawnPool.length} undrawn members remain. Please lower the number.`);
        return;
      }

      isDrawing = true;
      updateButtonState(true);
      showModal();
      setLoading(true);
      $("#winnersList").empty();

      // Update modal title
      $("#resultsModal h2").text(`🎉 LUCKY WINNERS — ${currentStatus.join(", ").toUpperCase()} 🎉`);


      const pool = [...undrawnPool];
      const winners = [];
      while (winners.length < count && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }

      // Store by unique ID

      saveDrawnIds(alreadyDrawn.concat(winners.map((w) => String(w._id))));
    


      setTimeout(async () => {
        try {
          setLoading(false);
          await startRaffleDraw(winners, 2200);
        } catch (e) {
          showError("An error occurred during the raffle draw.");
        } finally {
          updateButtonState(false);
          isDrawing = false;
        }
      }, 600);
    });

    $("#winner-count").on("keypress", function (e) {
      if (e.which === 13) $("#drawButton").click();
    });
  });
})(jQuery);
