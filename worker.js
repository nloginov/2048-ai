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
function treeAI(model, maxLevel) {
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

    if (level >= 9 || level > maxLevel) {
      return;
    }

    for (let move of ALL_MOVES) {
      let copyOfModel = clone(node.value);
      let moveData = imitateMove(copyOfModel.model, move);

      if (!moveData.wasMoved) {
        continue;
      }

      treeSize++;

      node.children.push({
        // penalize scores with higher depth
        // this takes the nth root of the score where n is the number of moves
        weightedScore: moveData.score, //Math.pow(moveData.score, 1 / (level + 1)),
        value: moveData,
        children: [],
        move: move,
        moveName: MOVE_NAMES_MAP[move],
        parent: node,
      });
    }

    for (let childNode of node.children) {
      expandTree(childNode, level + 1);
    }
  }

  expandTree(rootNode, 0);

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
let maxTrainingIterations = 1000;

function createRnn() {
  // followed:
  //   https://codepen.io/Samid737/pen/opmvaR
  //   https://github.com/karpathy/reinforcejs

  let spec = {
    update: 'qlearn', // qlearn | sarsa algorithm
    gamma: 0.9, // discount factor, [0, 1)
    epsilon: 0.001, // initial epsilon for epsilon-greedy policy, [0, 1)
    alpha: 0.001, // value function learning rate
    experience_add_every: 10, // number of time steps before we add another experience to replay memory
    experience_size: 5000, // size of experience replay memory
    learning_steps_per_iteration: 20,
    tderror_clamp: 1.0, // for robustness
    num_hidden_units: 100, // number of neurons in hidden layer
  };

  let env = {
    getNumStates: () => 4,
    getMaxNumActions: () => 4,
  };

  return new RL.DQNAgent(env, spec);
}

async function train(initialGame) {
  let game = initialGame;
  let iterations = 0;

  const calculateReward = (move, clone) => {
    let moveData = imitateMove(clone, move);

    if (moveData.wasMoved) {
      return 0;
    }

    if (moveData.score > game.score) {
      return 1;
    }

    return -1;
  };

  const update = async (clonedGame) => {
    let inputs = gameTo1DArray(clonedGame);
    let action = rnn.act(inputs);

    let move = ALL_MOVES[action];
    let reward = calculateReward(move, clonedGame);

    rnn.learn(reward);
  };

  console.debug('Training');

  return new Promise((resolve) => {
    while (iterations < maxTrainingIterations) {
      iterations++;
      console.debug(`Iteration: ${iterations}`);
      let clonedGame = clone(game);

      if (clonedGame.over) {
        clonedGame = clone(initialGame);
      }

      update(clonedGame);
    }

    resolve();
  });
}

async function runRNN(game) {
  Object.freeze(game.grid);

  if (!rnn) {
    rnn = createRnn();

    await train(game);
  }

  let inputs = gameTo1DArray(game);

  // normalized to 0-1
  let moveIndex = await self.model.agent.act(inputs);

  let move = ALL_MOVES[moveIndex];

  self.postMessage({ type: 'move', move });
}

function run({ game, maxLevel, algorithm }) {
  switch (algorithm) {
    case 'A*':
      return runAStar(game, maxLevel);
    case 'RNN':
      return runRNN(game);
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
