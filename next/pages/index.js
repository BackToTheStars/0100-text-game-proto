import { useState, useEffect } from 'react'
import GameTable from '../components/GameTable'
import GameDetails from '../components/GameDetails'
import CreateGameForm from '../components/CreateGameForm'
import EditGameForm from '../components/EditGameForm'

const API_URL = 'http://localhost:3000'
const PREV_FRONT_URL = 'http://localhost:3000'

const IndexPage = ({ mode = 'visitor' }) => {
    const [games, setGames] = useState([]);
    const [gameClicked, setGameClicked] = useState(null);
    const [toggleCreateForm, setToggleCreateForm] = useState(false);
    const [toggleEditForm, setToggleEditForm] = useState(false);

    useEffect(() => {
        getGames();
    }, []);

    useEffect(() => {
        if (!games.length) return;
        if (gameClicked) return;
        setGameClicked(games[0]);
    }, [games]);

    const onItemClick = (hash) => {
        setGameClicked(games.find((game) => game.hash === hash));
        setToggleCreateForm(false);
        setToggleEditForm(false);
    };

    const openEditGameForm = (game) => {
        setToggleEditForm(true);
    }

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

    const editGame = ({
        name,
        gameIsPublic,
        description,
        hash
    }) => { // description, players - добавить
        fetch(`${API_URL}/game?hash=${hash}`, {
            method: 'PUT',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                name,
                public: gameIsPublic,
                description
            })
        })
            .then(res => res.json())                     // вернёт Promise
            .then(data => {
                const { item } = data;
                const newGames = [...games];
                const mutatedIndex = newGames.findIndex(game => game.hash === hash)
                newGames[mutatedIndex] = item;
                setGames(newGames);
                setGameClicked(item);
                setToggleEditForm(false);
            })
            .catch(err => {
                console.log(err);
            });
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
        <div className="container-fluid col-10">
            <h4>User mode: {mode}</h4>
            <div className="row">
                <div className="col-8">
                    <GameTable games={games} onItemClick={onItemClick} />
                    <div className="row">
                        <div className="col-6">
                            {
                                (!toggleCreateForm && !toggleEditForm) && (
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
                            {toggleEditForm && (<EditGameForm
                                setToggleEditForm={setToggleEditForm}
                                game={gameClicked}
                                editGame={editGame}
                            />)}
                        </div>
                    </div>
                </div>
                <div className="col-4">
                    <GameDetails
                        game={gameClicked}

                        {...{ mode, deleteGame, openEditGameForm }}
                    />
                </div>
            </div>
        </div>
    )
}

export default IndexPage;







