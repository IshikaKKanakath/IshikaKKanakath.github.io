/* ==========================================================================
   Various functions that we want to use within the template
   ========================================================================== */

// Determine the expected state of the theme toggle, which can be "dark", "light", or
// "system". Default is "system".
let determineThemeSetting = () => {
  let themeSetting = localStorage.getItem("theme");
  return (themeSetting != "dark" && themeSetting != "light" && themeSetting != "system") ? "system" : themeSetting;
};

// Determine the computed theme, which can be "dark" or "light". If the theme setting is
// "system", the computed theme is determined based on the user's system preference.
let determineComputedTheme = () => {
  let themeSetting = determineThemeSetting();
  if (themeSetting != "system") {
    return themeSetting;
  }
  return (userPref && userPref("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
};

// detect OS/browser preference
const browserPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Set the theme on page load or when explicitly called
let setTheme = (theme) => {
  const use_theme =
    theme ||
    localStorage.getItem("theme") ||
    $("html").attr("data-theme") ||
    browserPref;

  if (use_theme === "dark") {
    $("html").attr("data-theme", "dark");
    $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
  } else if (use_theme === "light") {
    $("html").removeAttr("data-theme");
    $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
  }
};

// Toggle the theme manually
var toggleTheme = () => {
  const current_theme = $("html").attr("data-theme");
  const new_theme = current_theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", new_theme);
  setTheme(new_theme);
};

/* ==========================================================================
   Plotly integration script so that Markdown codeblocks will be rendered
   ========================================================================== */

// Read the Plotly data from the code block, hide it, and render the chart as new node. This allows for the
// JSON data to be retrieve when the theme is switched. The listener should only be added if the data is
// actually present on the page.
import { plotlyDarkLayout, plotlyLightLayout } from './theme.js';
let plotlyElements = document.querySelectorAll("pre>code.language-plotly");
if (plotlyElements.length > 0) {
  document.addEventListener("readystatechange", () => {
    if (document.readyState === "complete") {
      plotlyElements.forEach((elem) => {
        // Parse the Plotly JSON data and hide it
        var jsonData = JSON.parse(elem.textContent);
        elem.parentElement.classList.add("hidden");

        // Add the Plotly node
        let chartElement = document.createElement("div");
        elem.parentElement.after(chartElement);

        // Set the theme for the plot and render it
        const theme = (determineComputedTheme() === "dark") ? plotlyDarkLayout : plotlyLightLayout;
        if (jsonData.layout) {
          jsonData.layout.template = (jsonData.layout.template) ? { ...theme, ...jsonData.layout.template } : theme;
        } else {
          jsonData.layout = { template: theme };
        }
        Plotly.react(chartElement, jsonData.data, jsonData.layout);
      });
    }
  });
}

/* ==========================================================================
   Actions that should occur when the page has been fully loaded
   ========================================================================== */

$(document).ready(function () {
  // SCSS SETTINGS - These should be the same as the settings in the relevant files
  const scssLarge = 925;          // pixels, from /_sass/_themes.scss
  const scssMastheadHeight = 70;  // pixels, from the current theme (e.g., /_sass/theme/_default.scss)

  // If the user hasn't chosen a theme, follow the OS preference
  setTheme();
  window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener("change", (e) => {
          if (!localStorage.getItem("theme")) {
            setTheme(e.matches ? "dark" : "light");
          }
        });

  // Enable the theme toggle
  $('#theme-toggle').on('click', toggleTheme);

  // Enable the sticky footer
  var bumpIt = function () {
    $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
  }
  $(window).resize(function () {
    didResize = true;
  });
  setInterval(function () {
    if (didResize) {
      didResize = false;
      bumpIt();
    }}, 250);
  var didResize = false;
  bumpIt();

  // FitVids init
  fitvids();

  // Follow menu drop down
  $(".author__urls-wrapper button").on("click", function () {
    $(".author__urls").fadeToggle("fast", function () { });
    $(".author__urls-wrapper button").toggleClass("open");
  });

  // Restore the follow menu if toggled on a window resize
  jQuery(window).on('resize', function () {
    if ($('.author__urls.social-icons').css('display') == 'none' && $(window).width() >= scssLarge) {
      $(".author__urls").css('display', 'block')
    }
  });

  // Init smooth scroll, this needs to be slightly more than then fixed masthead height
  $("a").smoothScroll({
    offset: -scssMastheadHeight,
    preventDefault: false,
  });

  $('#emgtrigger').on('click', triggerWave);
});

const container = document.querySelector('.floating-greek-container');
const greek = [
  'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ',
  'ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω'
];

let spawned_letters = 10;
function spawnLetter() {
  if (spawned_letters <= 0) return;
  const letter = document.createElement('div');
  letter.className = 'greek-letter';
  letter.innerText = greek[Math.floor(Math.random() * greek.length)];

  // ensure letter is positioned inside the container bounds
  letter.style.position = 'absolute';
  const containerWidth = container.clientWidth || container.getBoundingClientRect().width;
  const conservativeMaxCharWidth = 60 * 0.9; // assume max font-size 60px, slightly reduced
  const maxLeft = Math.max(0, containerWidth - conservativeMaxCharWidth);
  letter.style.left = Math.random() * maxLeft + 'px';
  letter.style.fontSize = 20 + Math.random() * 40 + 'px';
  letter.style.animationDuration = 7 + Math.random() * 10 + 's';

  container.appendChild(letter);
  spawned_letters -= 1;

  // Remove after animation ends
  setTimeout(() => {letter.remove(); spawned_letters += 1}, 10000);
}

// Spawn a new letter every 1s
setInterval(spawnLetter, 1000);

let running = false;
function startVerticalWave(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;

  let buffer = new Array(H).fill(W / 2);

  // --- BURST PHASE STATE ---
  let t = 0;             // time counter in frames
  const cycleLength = 600;  // total cycle length (adjust)
  // phases as % of cycle
  const quiet1 = 0.25;    // baseline
  const rise = 0.15;      // rising energy
  const peak = 0.30;      // high amplitude dense burst
  const decay = 0.15;     // falling energy

  function envelope() {
    let p = (t % cycleLength) / cycleLength;

    if (p < quiet1) return 0.1;                       // baseline flutter
    if (p < quiet1 + rise) return 0.1 + (p - quiet1) * 2.5;
    if (p < quiet1 + rise + peak) return 0.5 + Math.random() * 0.5;
    if (p < quiet1 + rise + peak + decay)
      return 1.0 - (p - (quiet1 + rise + peak)) * 2.5;
    return 0.1;                                       // back to quiet
  }

  function generateSample() {
    const mid = W / 2;
    const env = envelope();
    if (!running) {
      let val = mid;
      return val;
    }

    // small flutter always present
    let noise = (Math.random() - 0.5) * 10 * env;

    // dense high-energy spikes in peak
    let spike = 0;
    if (env > 0.4) {
      // big spikes during burst
      spike = (Math.random() - 0.5) * W * env;
    } else if (env > 0.2) {
      // medium spikes in rise/decay
      spike = (Math.random() - 0.5) * W / 2 * env;
    } else {
      // small spikes in quiet
      spike = (Math.random() - 0.5) * W / 4 * env;
    }

    let val = mid + noise + spike;
    return Math.max(0, Math.min(W, val));
  }

  function draw() {
    t++;
    let root = document.documentElement;
    let bg = window.getComputedStyle(root).getPropertyValue('--global-bg-color');
    let fg = window.getComputedStyle(root).getPropertyValue('--global-border-color');

    buffer.shift();
    buffer.push(generateSample());

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(buffer[0], 0);
    for (let y = 1; y < H; y++) {
      ctx.lineTo(buffer[y], y);
    }
    ctx.stroke();

    requestAnimationFrame(draw);
  }
  draw();
}

function flipWave() {
  running = !running;
  setTimeout(flipWave, Math.random() * 15000 + 5000);
}

function triggerWave() {
  running = true;
  startVerticalWave(document.getElementById("leftLine"));
  startVerticalWave(document.getElementById("rightLine"));
  setTimeout(() => flipWave(), 10000);
}

triggerWave();