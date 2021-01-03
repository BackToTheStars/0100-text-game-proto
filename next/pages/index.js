import { useState, useEffect } from 'react'
import GameTable from '../components/GameTable'
import GameDetails from '../components/GameDetails'

const API_URL = 'http://localhost:3000'

const IndexPage = () => {

    const [games, setGames] = useState([]);
    const [ gameClicked, setGameClicked ] = useState(null);

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
        <div style={{ display: 'flex', width: '1240px', margin: '0 auto' }}>
            <div style={{ flex: '1' }}>
                <GameTable games={games} onItemClick={onItemClick}/>
            </div>
            <div style={{ width: '400px' }}>
                <GameDetails game={gameClicked}/>
            </div>
        </div>
    )
}

export default IndexPage;







