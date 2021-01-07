const PREV_FRONT_URL = 'http://localhost:3000'
const GameDetails = ({ game, mode, deleteGame }) => {

    if (!game) {
        return null;
    }

    return (
        <div className="card">
            <img className="card-img-top" src="https://via.placeholder.com/400x300" alt="Card image cap" />
            <div className="card-body">
                <h5 className="card-title">{game.name}</h5>
                <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                <a href={`${PREV_FRONT_URL}/?hash=${game.hash}`} className="btn btn-primary">Open</a>
                {mode === 'admin' && 
                <button className="btn btn-danger" onClick={() => deleteGame(game)} 
                >Delete Game</button>}
            </div>
        </div>
    );
}



export default GameDetails