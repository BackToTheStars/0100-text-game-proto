const GameDetails = ({ game }) => {

    if (!game) {
        return null;
    } 

  return <p>{game.name}</p>;
}

export default GameDetails