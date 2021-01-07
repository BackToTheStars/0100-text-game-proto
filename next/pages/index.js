import { useState, useEffect } from 'react'
import GameTable from '../components/GameTable'
import GameDetails from '../components/GameDetails'
import CreateGameForm from '../components/CreateGameForm'

const API_URL = 'http://localhost:3000'
const PREV_FRONT_URL = 'http://localhost:3000'

const IndexPage = ({ mode = 'visitor' }) => {

    const [games, setGames] = useState([]);
    const [gameClicked, setGameClicked] = useState(null);
    const [toggleCreateForm, setToggleCreateForm] = useState(false);

    useEffect(() => {
        getGames();
    }, []);

    const onItemClick = (hash) => {
        setGameClicked(games.find((game) => game.hash === hash));
    };

    const getGames = () => {
        fetch(`${API_URL}/games`)
            .then(res => res.json())
            .then(data => {
                const { items } = data;
                setGames(items);
            });
    }

    const createGame = ({ name, gameIsPublic }) => {   // добавить description, players
        fetch(`${API_URL}/games`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                name,
                public: gameIsPublic
            })
        })
            .then(res => res.json())                // вернёт Promise
            .then(data => {
                const { item, hash } = data;
                console.log(item);
                window.location.replace(`${PREV_FRONT_URL}/?hash=${hash}`)
            })
            .catch(err => {
                console.log(err);
            });

        // console.log({name, gameIsPublic})
    }

    const deleteGame = (game) => {
        fetch(`${API_URL}/game?hash=${game.hash}`, {
            method: 'DELETE',
            headers: {
                'content-type': 'application/json',
            }
        })
            .then(res => res.json())                // вернёт Promise
            .then(data => {
                const { item, message } = data;
                if (item) {
                    console.log({ item });
                } else {
                    console.log({ message })
                }
            })
            .catch(err => {
                console.log(err);
            });
    }

    return (
        <div className="container">
            <h4>User mode: {mode}</h4>
            <div className="row">
                <div className="col-8">
                    <GameTable games={games} onItemClick={onItemClick} />
                    <div className="row">
                        <div className="col-6">
                            {
                                !toggleCreateForm && (
                                    <button className="btn btn-success"
                                        onClick={() => { setToggleCreateForm(true) }}
                                    >Create New Game</button>
                                )
                            }
                            <hr />
                            {toggleCreateForm && (<CreateGameForm
                                setToggleCreateForm={setToggleCreateForm}
                                createGame={createGame}
                            />)}
                        </div>
                    </div>
                </div>
                <div className="col-4">
                    <GameDetails game={gameClicked} mode={mode} deleteGame={deleteGame} />

                </div>
            </div>
        </div>
    )
}

export default IndexPage;







