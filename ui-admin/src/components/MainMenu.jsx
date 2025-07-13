function MainMenu() {
  return (
    <div className="main-menu">
      <h1>Welcome to the RPG Game</h1>
      <p>Please select an option:</p>
      <ul>
        <li><a href="/intro">Start Game</a></li>
        <li><a href="/game">Continue Game</a></li>
        <li><a href="/">Logout</a></li>
      </ul>
    </div>
  );
}


export default MainMenu;
