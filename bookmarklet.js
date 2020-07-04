let src = 'https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/ai.js';

async function fetchAndInsertScript(){
  // fetching the URL instead of directly loading in a script
  // tag allows us to get around CORS issues
  let response = await fetch(src);
  let script = await response.text();

  let element = document.createElement('script');

  element.innerText = script;

  document.body.appendChild(element);
}

fetchAndInsertScript();
