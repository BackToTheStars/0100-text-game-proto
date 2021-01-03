
const PREV_FRONT_URL = 'http://localhost:3000'
const GameTable = ({ games, onItemClick }) => {

    // for(let game of games) {
    //   const gameEl = document.createElement('li');
    //   gameEl.innerHTML = `<a href="/?hash=${game.hash}">${game.name}</a>`;
    //   gamesList.appendChild(gameEl);
    // }

    return (
        <table className="table table-striped games-list">
            <thead>
                <tr className="games-list__header">
                    <th>Name</th>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {games.map(el => {
                    return (
                        <tr
                            className="games-list__item"
                            key={el.hash}
                        >
                            <td>{el.name}</td>
                            <td>
                                <a href={`${PREV_FRONT_URL}/?hash=${el.hash}`}>Open</a>
                            </td>
                            <td>
                                <a
                                    onClick={(e) => {
                                        // e.preventDefault(); // не даёт нажать на # и улететь наверх страницы
                                        onItemClick(el.hash)
                                    }}
                                    href="#"
                                >Show Details</a>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    )
}

export default GameTable











