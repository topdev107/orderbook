import { createGlobalStyle } from "styled-components";

export default createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    outline: 0;
    box-sizing: border-box;
    font-family: Kraken Plex Mono, monospace;
  }

  #root {
    margin: 0 auto;
  }

  body {
    background-color: #121723;
  }

  ::-webkit-scrollbar {
    width: 5px;
  }
  
  ::-webkit-scrollbar-track {
    background: #121723; 
  }
   
  ::-webkit-scrollbar-thumb {
    background: #888; 
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #555; 
  }
`;
