/* global Chartist */
// NOTE: decorators do not exist in browsers, so we can't
//       use any sort of fancy auto-"bind" decoration :(
// poor man's Dependency Injection
const container = {
  ui: undefined,
  ai: undefined,
};

const VALUE_MAP = {
  /* eslint-disable prettier/prettier */
  2:     1, 4:      2, 8:      3, 16:    4,
  32:    5, 64:     6, 128:    7, 256:   8,
  512:   9, 1024:  10, 2048:  11, 4096: 12,
  8192: 13, 16384: 14, 32768: 15,
  /* eslint-enable prettier/prettier */
};

const DOCTOR_NUMBER_MAP = {
  1: '01 - William Hartnell',
  2: '02 - Patrick Troughton',
  3: '03 - Jon Pertwee',
  4: '04 - Tom Baker',
  5: '05 - Peter Davison',
  6: '06 - Colin Baker',
  7: '07 - Sylvester McCoy',
  8: '08 - Paul McGann',
  9: 'War - John Hurt',
  10: '09 - Christopher Eccleston',
  11: '10 - David Tennant',
  12: '11 - Matt Smith',
  13: '12 - Peter Capaldi',
  14: '13 - Jodie Whittaker',
};

function biggestTile(game) {
  let tiles = game.grid.cells
    .map((row) => row.map((cell) => (cell ? cell.value : 1)))
    .flat();

  let value = Math.max(...tiles);

  return { value, num: VALUE_MAP[value] };
}

function round(num) {
  return Math.round(num * 100) / 100;
}

class AIWorker {
  static async create() {
    let ai = new AIWorker();

    container.ai = ai;
    await container.ai.setup();

    return ai;
  }

  setup = async () => {
    // fetching the URL instead of directly loading in a script
    // tag allows us to get around CORS issues
    let workerUrl =
      'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/worker.js';

    let response = await fetch(workerUrl);
    let script = await response.text();
    let blob = new Blob([script], { type: 'text/javascript' });

    this.worker = new Worker(URL.createObjectURL(blob));
    this.worker.onmessage = this.onMessage;
  };

  send = (data) => {
    this.worker.postMessage(data);
  };

  onMessage = (e) => {
    let { data } = e;

    switch (data.type) {
      case 'ack':
      case 'ready':
        console.debug(`Received: ${JSON.stringify(data)}`);

        return;
      case 'move':
        if (!data.move) {
          console.error(`No move was generated`, data);

          return;
        }

        if (data.trainingData) {
          localStorage.setItem('training', JSON.stringify(data.trainingData));
        }

        return container.ui.keyDown(data.move);
      default:
        console.error(data);
        throw new Error('Unrecognized Message');
    }
  };

  requestNextMove = (game, algorithm) => {
    if (!this.startTime) {
      this.startTime = new Date();
    }

    let biggest = biggestTile(game).num;

    let totalTime = new Date() - this.startTime;

    container.ui.updateStatus({
      topDoctor: DOCTOR_NUMBER_MAP[biggest],
      totalTime,
    });

    let trainingData;

    if (algorithm === 'RNN') {
      trainingData = JSON.parse(localStorage.getItem('training'));
    }

    this.send({
      type: 'run',
      game,
      algorithm,
      trainingData,
    });
  };
}

const createElement = (
  tagName,
  { events, children, template, ...attributes }
) => {
  let element = document.createElement(tagName);

  for (let [key, v] of Object.entries(attributes || {})) {
    switch (key) {
      case 'class':
        element.classList.add(...v.split(' '));
        break;
      default:
        element[key] = v;
    }
  }

  for (let [eventName, handler] of Object.entries(events || {})) {
    element.addEventListener(eventName, handler);
  }

  (children || []).forEach((child) => {
    element.appendChild(child);
  });

  element.update = (data = {}) => {
    if (template) {
      if (typeof template === 'function') {
        element.innerHTML = template(data);
      } else {
        element.innerHTML = template;
      }
    }
  };

  if (template) {
    element.update();
  }

  return element;
};

class UI {
  static async create() {
    let ui = new UI();

    container.ui = ui;
    container.ui.setup();

    return ui;
  }

  gameHistory = [];

  setup = () => {
    let chart = createElement('div', { class: 'ai-score-over-time' });
    let stats = createElement('p', {
      class: 'ai-stats',
      template: (data) => {
        return `
          <dl>
            <dt>Total Games</dt> <dd>${data.numGames}</dd>
            <dt>Average Score</dt> <dd>${data.averageScore}</dd>
            <dt>Best Score</dt> <dd>${data.bestScore}</dd>
            <dt>Average Game Length</dt> <dd>${data.averageGameLength} minutes</dd>
            <dt>Current Top Doctor</dt> <dd>${data.topDoctor}</dd>
          </dl>
        `;
      },
    });
    let mount = createElement('div', {
      class: 'ai-container grid grid-col',
      children: [
        createElement('style', {
          template: `
            .grid {
              display: grid; grid-gap: 0.5rem;
            }
            .grid-col {
              grid-auto-flow: column;
            }
            .ai-container {
              grid-template-columns: 400px 1fr;
              position: fixed; top: 0.5rem; left: 0.5rem; right: 0.5rem;
              background: white; color: black;
              padding: 0.5rem;
              box-shadow: 2px 2px 2px rgba(0,0,0,0.5);
              border-radius: 0.25rem;
              font-size: 0.75rem;
            }

            .ai-buttons {
              grid-auto-flow: column;
            }

            .ai-score-over-time {
              display: flex;
              flex-direction: column-reverse;
            }

            .ct-legend {
              display: grid;
              grid-auto-flow: column;
              margin: 0;
            }

            .ct-series-0 {
              color: red;
            }

            .ct-series-1 {
              color: orange;
            }

            .container {
              margin-top: 8rem;
            }

            .ai-container dt {
              font-weight: 500;
            }

            .ai-container dl {
              margin: 0;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
            }

            .ai-container dd {
              margin-left: 0.25rem;
            }

            .ai-container label {
              display: grid;
              grid-auto-flow: column;
              justify-content: start;
              align-items: center;
            }
          `,
        }),
        createElement('div', {
          class: 'grid',
          children: [
            createElement('div', {
              class: 'ai-buttons grid',
              children: [
                createElement('button', {
                  type: 'button',
                  template: 'Run A.I. (RNN)',
                  events: {
                    click: () => this.runAI('RNN'),
                  },
                }),
                createElement('label', {
                  children: [
                    createElement('input', {
                      type: 'checkbox',
                      events: {
                        click: (e) => {
                          this.isAutoRetryEnabled = e.target.checked;

                          this.autoRetry();
                        },
                      },
                    }),
                    createElement('span', { template: 'Auto-Retry' }),
                  ],
                }),
              ],
            }),
            stats,
          ],
        }),
        chart,
      ],
    });

    this.chart = new Chartist.Line(
      chart,
      {
        series: [
          [
            /* scores */
          ],
          [
            /* averages */
          ],
        ],
      },
      {
        plugins: [
          Chartist.plugins.legend({
            legendNames: ['Score', 'Average Score'],
          }),
        ],
        fullWidth: true,
        axisY: {
          onlyInteger: true,
        },
        chartPadding: {
          left: 40,
        },
      }
    );
    document.body.appendChild(mount);
    this.stats = stats;
  };

  updateGraph = () => {
    // Trailing window of the last N games
    const graphWidth = 60;

    let scores = this.gameHistory.map((h) => h.score);
    let averageScores = this.gameHistory.map((h) => h.averageScore);

    scores = scores.slice(Math.max(scores.length - graphWidth, 0));
    averageScores = averageScores.slice(
      Math.max(averageScores.length - graphWidth, 0)
    );

    this.chart.update({
      series: [
        { name: 'Score', data: scores },
        { name: 'Average Score', data: averageScores },
      ],
    });
  };

  updateStats = () => {
    let scores = this.gameHistory.map((h) => h.score);
    let averageScores = this.gameHistory.map((h) => h.averageScore);
    let times = this.gameHistory.map((h) => h.totalTime);
    let bestScore = Math.max(...scores);
    let averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    let averageGameLength = round(averageTime / 1000 / 60);

    this.stats.update({
      numGames: scores.length,
      averageScore: averageScores[averageScores.length - 1] || 0,
      bestScore: bestScore || 0,
      averageGameLength: averageGameLength || 0,
      topDoctor: this.topDoctor,
    });
  };

  updateStatus = ({ topDoctor, totalTime }) => {
    this.topDoctor = topDoctor;
    this.totalTime = totalTime;

    this.updateStats();
  };

  get isGameOver() {
    return Boolean(document.querySelector('.game-over'));
  }

  autoRetry = () => {
    if (!this.isAutoRetryEnabled) {
      return;
    }

    if (this.isGameOver) {
      let score = parseInt(
        document.querySelector('.score-container').textContent,
        10
      );

      let scores = [...this.gameHistory.map((h) => h.score), score];
      let averageScore = round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );

      this.gameHistory.push({
        score,
        averageScore: averageScore || 0,
        totalTime: this.totalTime,
      });

      this.updateGraph();

      container.ai.startTime = undefined;

      document.querySelector('.retry-button').click();

      setTimeout(() => this.requestNextMove(), 1000);
    }

    // check every 10 seconds
    setTimeout(() => this.autoRetry(), 10000);
  };

  runAI = (algorithm) => {
    this.algorithm = algorithm;

    this.requestNextMove();
  };

  requestNextMove = () => {
    let model = JSON.parse(localStorage.getItem('gameState'));

    if (model !== null && !model.over) {
      container.ai.requestNextMove(model, this.algorithm);
    }
  };

  keyDown = (k) => {
    let oEvent = document.createEvent('KeyboardEvent');

    function defineConstantGetter(name, value) {
      Object.defineProperty(oEvent, name, {
        get() {
          return value;
        },
      });
    }

    defineConstantGetter('keyCode', k);
    defineConstantGetter('which', k);
    defineConstantGetter('metaKey', false);
    defineConstantGetter('shiftKey', false);
    defineConstantGetter('target', { tagName: '' });

    /* eslint-disable */
    oEvent.initKeyboardEvent('keydown',
      true, true, document.defaultView, false, false, false, false, k, k
    );
    /* eslint-enable */

    document.dispatchEvent(oEvent);

    setTimeout(() => {
      this.requestNextMove();
    }, 100);
  };
}

async function installFile(url, type = 'script') {
  // fetching the URL instead of directly loading in a script
  // tag allows us to get around CORS issues
  let response = await fetch(url);
  let script = await response.text();

  let element = document.createElement(type);

  element.innerHTML = script;

  document.body.appendChild(element);
}

async function installChartist() {
  let js = 'https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.js';
  let css = 'https://cdn.jsdelivr.net/chartist.js/latest/chartist.min.css';
  let legendJs =
    'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/vendor/chartist.js';

  await installFile(js);
  await installFile(css, 'style');
  await installFile(legendJs);
}

async function boot() {
  await installChartist();

  await AIWorker.create();
  await UI.create();

  container.ai.send({ type: 'ready' });
}

boot();
