// https://via.placeholder.com/400x300

const PREV_FRONT_URL = 'http://localhost:3000'
const GameDetails = ({ game, mode, deleteGame, openEditGameForm }) => {

    if (!game) {
        return null;
    }

    return (
        <div className="card">
            <img className="card-img-top" src="img/game_screenshot.png" alt="Card image cap" />
            <div className="card-body">
                <h5 className="card-title">{game.name}</h5>
                {!!game.description && <p className="card-text">{game.description}</p>}
                
                <div className="card-game-buttons">
                    <a href={`${PREV_FRONT_URL}/?hash=${game.hash}`} className="btn btn-success">Open</a>
                    {mode === 'admin' && 
                    <>
                    <button className="btn btn-primary" onClick={() => openEditGameForm(game)}>Edit</button>
                    <button className="btn btn-danger" onClick={() => deleteGame(game)} 
                    >Delete Game</button>
                    </>
                    }
                </div>
            </div>
        </div>
    );
}



export default GameDetails