# A.I. player for the Doctor Who "Thirteen" game.


This is JavaScript AI player for a variant of the game "2048".

Play the game "Thirteen" here: https://doctorwho.tv/games/thirteen/


## How to use the A.I.

1. In your browser's bookmark bar, right click
2. Click "Add Page"
3. Paste the following content into the `URL` field

    ```js
    javascript:(function(){let src='https://raw.githubusercontent.com/NullVoxPopuli/doctor-who-thirteen-game-ai/master/ai.js';async function fetchAndInsertScript(){let response=await fetch(src);let script=await response.text();let element=document.createElement('script');element.innerHTML=script;document.body.appendChild(element);}fetchAndInsertScript();})();
    ```

4. Click "Save"
5. Visit https://doctorwho.tv/games/thirteen/
   or visit the game without the BBC wrapping content here: https://asset-manager.bbcchannels.com/m/2fzi3/
6. Click the bookmark created in step 4
7. Watch how for it gets

## Development

1. clone the repo
2. change the bookmarklet URL to your fork/branch
3. copy contents of bookmarklet.js to https://ted.mielczarek.org/code/mozilla/bookmarklet.html
4. copy "Your Bookmarklet" url to your bookmark
