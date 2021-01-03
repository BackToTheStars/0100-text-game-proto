import { useState, useEffect } from 'react'
import GameTable from '../components/GameTable'
import GameDetails from '../components/GameDetails'
import CreateGameForm from '../components/CreateGameForm'

const API_URL = 'http://localhost:3000'

const IndexPage = () => {

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

    return (
        <div className="container">
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
                            {toggleCreateForm && <CreateGameForm setToggleCreateForm={setToggleCreateForm} />}
                        </div>
                    </div>
                </div>
                <div className="col-4">
                    <GameDetails game={gameClicked} />

                </div>
            </div>
        </div>
    )
}

export default IndexPage;







