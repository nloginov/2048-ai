/* global importScripts, RL, GameManager */

const dependencies = [
  'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/vendor/rl.js',
  'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/vendor/game.js',
];

const MOVE = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
const ALL_MOVES = [MOVE.UP, MOVE.RIGHT, MOVE.DOWN, MOVE.LEFT];
const MOVE_KEY_MAP = {
  [MOVE.UP]: 0,
  [MOVE.RIGHT]: 1,
  [MOVE.DOWN]: 2,
  [MOVE.LEFT]: 3,
};
const MOVE_NAMES_MAP = {
  [MOVE.UP]: 'up',
  [MOVE.RIGHT]: 'right',
  [MOVE.DOWN]: 'down',
  [MOVE.LEFT]: 'left',
};

const voidFn = () => undefined;
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const isEqual = (a, b) => {
  // a and b have the same dimensions
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      let av = a[i][j];
      let bv = b[i][j];
      let avv = av && av.value;
      let bvv = bv && bv.value;

      if (avv !== bvv) {
        return false;
      }
    }
  }

  return true;
};

const gameTo1DArray = (game) => {
  return game.grid.cells.flat().map((cell) => (cell ? cell.value : 0));
};

const highestCells = (game) => {
  let cellList = game.grid.cells.flat();

  let sorted = cellList.sort((a, b) => (b ? b.value : 0) - (a ? a.value : 0));

  return sorted;
};

const cellOnEdge = (cell) => {
  if (!cell || !cell.position) {
    return false;
  }

  let { x, y } = cell.position;

  return x === 0 || y === 0 || x === 3 || y === 3;
};

const cellInCorner = (cell) => {
  if (!cell || !cell.position) {
    return false;
  }

  let { x, y } = cell.position;

  return (
    (x === 0 && y === 0) ||
    (x === 0 && y === 3) ||
    (x === 3 && y === 0) ||
    (x === 3 && y === 3)
  );
};

const edgeMultiplierFor = (game) => {
  // there are always at least 2 cells
  let cells = highestCells(game);
  let [highest, ...rest] = cells;

  let sortedByDistance = rest.sort((a, b) => {
    let bv = b ? b.value : 0;
    let av = a ? a.value : 0;

    // bigger numbers first
    let vSort = bv - av;

    if (vSort !== 0) {
      return vSort;
    }

    let da = distance(highest, a);
    let db = distance(highest, b);

    // smaller numbers first
    return da - db;
  });

  let [secondHighest, thirdHighest] = sortedByDistance;

  let multiplier = 0.25;
  let edge1 = cellOnEdge(highest);
  let corner1 = cellInCorner(highest);
  let edge2 = cellOnEdge(secondHighest);
  let edge3 = cellOnEdge(thirdHighest);

  if (edge1) {
    multiplier += 1;
  }

  if (corner1) {
    multiplier += 4;
  }

  if (edge2) {
    multiplier += 1;
  }

  if (edge3) {
    multiplier += 0.5;
  }

  return multiplier;
};

// eslint-disable-next-line
const countEmptySpaces = (game) => {
  let empty = 0;

  game.grid.cells.forEach((row) => {
    row.forEach((cell) => {
      if (!cell) {
        empty++;
      }
    });
  });

  return empty;
};

const distance = (a, b) => {
  if (!a || !b || !a.position || !b.position) {
    return 1000000;
  }

  return Math.abs(
    Math.sqrt(
      Math.pow(a.position.x - b.position.x, 2),
      Math.pow(a.position.y - b.position.y),
      2
    )
  );
};

/**
 * Initially, this started out as an A* algorithm, constrained by depth
 *  - original version from https://github.com/nloginov/2048-ai
 *
 * Modifications:
 * - use weighted score, penalizing a higher number of moves to achieve a score
 * - instead of blindly searching until maxLevel,
 *   maxLevel will only be reached in the event of ties in score
 *
 */
function treeAI(model) {
  let bestNode;
  let treeSize = 0;
  let bestScore = 0;
  let bestHops = 1000;

  let rootNode = {
    value: { model },
    children: [],
  };

  function updateBest(childNode) {
    if (childNode === rootNode) {
      return;
    }

    if (childNode.weightedScore < bestScore) {
      return;
    }

    // if the score is equal, let's choose the least hops

    let root = childNode;
    let hops = 0;

    while (root.parent !== undefined && root.parent.move) {
      root = root.parent;
      hops++;
    }

    if (hops < bestHops) {
      if (hops === 0) {
        if (childNode.weightedScore > bestScore) {
          bestNode = root;
          bestScore = childNode.weightedScore;
        }

        return;
      }

      bestHops = hops;
      bestNode = root;
      bestScore = childNode.weightedScore;
    }
  }

  function expandTree(node, level) {
    updateBest(node);

    if (level >= 4) {
      return;
    }

    const enumerateMoves = () => {
      for (let move of ALL_MOVES) {
        let copyOfModel = clone(node.value);
        let moveData = imitateMove(copyOfModel.model, move);

        if (!moveData.wasMoved) {
          continue;
        }

        treeSize++;

        let scoreChange = moveData.score - model.score;

        // this is a very important strategy
        let multiplier = edgeMultiplierFor(moveData.model);

        let weightedScore = scoreChange / 1 / ((level + 1) * multiplier);

        node.children.push({
          // penalize scores with higher depth
          // this takes the nth root of the score where n is the number of moves
          // weightedScore: moveData.score, //Math.pow(moveData.score, 1 / (level + 1)),
          // weightedScore: moveData.score / 1 / (level * 2 + 1),
          // weightedScore: moveData.score,
          weightedScore,

          value: moveData,
          children: [],
          move: move,
          moveName: MOVE_NAMES_MAP[move],
          parent: node,
        });
      }
    };

    // to try to account for misfortune
    enumerateMoves();
    // enumerateMoves();
    // enumerateMoves();

    for (let childNode of node.children) {
      expandTree(childNode, level + 1);
    }
  }

  let initialLevel = 0;

  while (bestNode === undefined || initialLevel < -3) {
    expandTree(rootNode, initialLevel);

    initialLevel = initialLevel - 1;
  }

  let bestMove = bestNode.move;

  console.debug(
    `Best Move: ${bestMove} aka ${MOVE_NAMES_MAP[bestMove]} out of ${treeSize} options`
  );
  console.debug(
    `with expected score change of ${model.score} => ${bestNode.value.model.score}`
  );

  return bestMove;
}

/////////////////////////////////////////////////////////////////////////
// Game Helper Code
/////////////////////////////////////////////////////////////////////////

function fakeGameFrom(model) {
  class FakeInputManager {
    on = voidFn;
  }

  class FakeActuator {
    actuate = voidFn;
  }

  class FakeStorage {
    getGameState = () => model;
    clearGameState = voidFn;
    getBestScore = voidFn;
    setGameState = voidFn;
  }

  let gameManager = new GameManager(
    model.grid.size,
    FakeInputManager,
    FakeActuator,
    FakeStorage
  );

  return gameManager;
}

function imitateMove(model, move) {
  let gameManager = fakeGameFrom(model);
  let internalMove = MOVE_KEY_MAP[move];

  gameManager.actuate = voidFn;
  gameManager.keepPlaying = true;
  gameManager.move(internalMove);

  let serialized = gameManager.serialize();

  // Object.freeze(serialized);

  return {
    move,
    score: gameManager.score,
    model: serialized,
    // NOTE: the score is not updated for the fake manager
    // wasMoved: serialized.score !== model.score,
    wasMoved: !isEqual(serialized.grid.cells, model.grid.cells),
  };
}

/////////////////////////////////////////////////////////////////////////
// Worker-related code
/////////////////////////////////////////////////////////////////////////

function runAStar(game, maxLevel) {
  Object.freeze(game.grid);

  console.debug('-------------- Calculate Move -----------------');
  let initialTime = new Date();

  let move = treeAI(game, Math.max(maxLevel, 4));

  console.debug(`Time: ${new Date() - initialTime}ms`);

  self.postMessage({ type: 'move', move });
}

let rnn;

function createRnn() {
  // followed:
  //   https://codepen.io/Samid737/pen/opmvaR
  //   https://github.com/karpathy/reinforcejs

  let spec = {
    update: 'qlearn', // qlearn | sarsa algorithm
    gamma: 0.9, // discount factor, [0, 1)
    epsilon: 0.001, // initial epsilon for epsilon-greedy policy, [0, 1)
    alpha: 0.001, // value function learning rate
    experience_add_every: 5, // number of time steps before we add another experience to replay memory
    experience_size: 5000, // size of experience replay memory
    learning_steps_per_iteration: 20,
    tderror_clamp: 1.0, // for robustness
    num_hidden_units: Math.pow(2, 13), // number of neurons in hidden layer
  };

  let env = {
    getNumStates: () => 4,
    getMaxNumActions: () => 4,
  };

  return new RL.DQNAgent(env, spec);
}

function outcomesForEachMove(game) {
  let result = [];

  for (let move of ALL_MOVES) {
    let clonedGame = clone(game);
    let moveData = imitateMove(clonedGame, move);

    result.push(moveData);
  }

  // biggest first
  return result.sort((a, b) => b.score - a.score);
}

const calculateReward = (move, originalGame) => {
  let clonedGame = clone(originalGame);
  let moveData = imitateMove(clonedGame, move);

  if (clonedGame.over) {
    if (clonedGame.won) {
      return 1;
    } else {
      return -1;
    }
  }

  if (!moveData.wasMoved) {
    return -0.01;
  }

  let bestPossibleMove = outcomesForEachMove(originalGame)[0] || {};
  let bestPossibleScore = bestPossibleMove.score || 10000000;

  if (moveData.score >= bestPossibleScore) {
    return 1 - originalGame.score / moveData.score;
  }

  if (moveData.score > originalGame.score) {
    return (1 - originalGame.score / moveData.score) / 2;
  }

  // next score is equal to current
  // it's possible that we need to do something that doesn't
  // change our score before getting to something good
  // TODO: penalize more when thare are available moves of higher value
  return -0.01;
};

async function runRNN(game, trainingData) {
  Object.freeze(game.grid);

  if (!rnn) {
    rnn = createRnn();

    if (trainingData) {
      rnn.fromJSON(trainingData);
    }
  }

  let inputs = gameTo1DArray(game);

  // normalized to 0-1
  let moveIndex = await rnn.act(inputs);
  let move = ALL_MOVES[moveIndex];
  let reward = calculateReward(move, game);

  rnn.learn(reward);

  console.debug({ reward, move, moveName: MOVE_NAMES_MAP[move] });
  self.postMessage({ type: 'move', move, trainingData: rnn.toJSON() });
}

function run({ game, maxLevel, algorithm, trainingData }) {
  switch (algorithm) {
    case 'A*':
      return runAStar(game, maxLevel);
    case 'RNN':
      return runRNN(game, trainingData);
    default:
      console.error(...arguments);
      throw new Error('Unrecognized Algorithm', algorithm);
  }
}

async function loadDependencies() {
  await Promise.all(
    dependencies.map(async (depUrl) => {
      let response = await fetch(depUrl);
      let script = await response.text();
      let blob = new Blob([script], { type: 'text/javascript' });
      let blobLink = URL.createObjectURL(blob);

      // yolo
      importScripts(blobLink);
    })
  );

  self.postMessage({ type: 'ack' });
}

self.onmessage = function (e) {
  let { data } = e;

  switch (data.type) {
    case 'ready':
      return loadDependencies();

    case 'run':
      // it's possible to have ~ 3 moves of nothing happening
      return run(data);
    default:
      console.error(data);
      throw new Error('Unrecognized Message');
  }
};
