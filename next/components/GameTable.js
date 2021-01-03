
const PREV_FRONT_URL = 'http://localhost:3000'
const GameTable = ({ games, onItemClick }) => {

    // for(let game of games) {
    //   const gameEl = document.createElement('li');
    //   gameEl.innerHTML = `<a href="/?hash=${game.hash}">${game.name}</a>`;
    //   gamesList.appendChild(gameEl);
    // }

    return (
        <ul>
            { games.map(el => {
                return (
                    <li key={el.hash} style={{width: '500px', display: 'flex', justifyContent: 'space-between'}}>
                        {el.name}
                        <a href="#" onClick={(e) => {
                            e.preventDefault();           // не даёт нажать на # и улететь наверх страницы
                            onItemClick(el.hash)
                        }}>
                          Просмотреть
                        </a>
                        <a href={`${PREV_FRONT_URL}/?hash=${el.hash}`}>
                          Открыть
                        </a>
                    </li>
                );
            })}
        </ul>
    )
}

export default GameTable











